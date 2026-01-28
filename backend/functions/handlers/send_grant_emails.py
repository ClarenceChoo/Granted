"""
Send personalized grant match emails to NPOs.
Supports CRON (weekly Monday 6am SGT) and HTTP manual triggers.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from firebase_functions import https_fn, scheduler_fn
from firebase_admin import firestore
from jinja2 import Environment, FileSystemLoader
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


def format_currency(amount: float) -> str:
    """Format currency amount"""
    if amount >= 1_000_000:
        return f"${amount / 1_000_000:.1f}M"
    elif amount >= 1_000:
        return f"${amount / 1_000:.0f}K"
    else:
        return f"${amount:,.0f}"


def format_amount_range(min_amount: Optional[float] = None, max_amount: Optional[float] = None) -> str:
    """Format funding amount range"""
    if min_amount and max_amount:
        return f"{format_currency(min_amount)} - {format_currency(max_amount)}"
    elif min_amount:
        return f"From {format_currency(min_amount)}"
    elif max_amount:
        return f"Up to {format_currency(max_amount)}"
    else:
        return "Amount not specified"


def format_deadline(deadline_str: str) -> str:
    """Format deadline date string"""
    try:
        if not deadline_str:
            return "No deadline specified"
        
        # Parse ISO format date
        deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        return deadline.strftime("%d %B %Y")
    except Exception:
        return deadline_str or "No deadline specified"


def format_closing_dates(closing_dates: dict) -> str:
    """Format closing dates from grant API"""
    if not closing_dates:
        return "No deadline specified"
    
    # The API returns closing_dates as a dict with keys like "organisation", "individual"
    # Get the first available closing date
    for key, value in closing_dates.items():
        if value and value != "Applications closed":
            return value
    
    return "Applications closed"


def get_grant_details(db, grant_id: str) -> Optional[Dict[str, Any]]:
    """Fetch grant details from Firestore"""
    try:
        grant_ref = db.collection("grants").document(grant_id)
        grant_doc = grant_ref.get()
        
        if not grant_doc.exists:
            logger.warning(f"Grant {grant_id} not found in Firestore")
            return None
        
        return grant_doc.to_dict()
    except Exception as e:
        logger.error(f"Error fetching grant {grant_id}: {e}")
        return None


def prepare_email_data(npo_data: Dict, matches_data: Dict, db) -> Optional[Dict[str, Any]]:
    """Prepare data for email template rendering"""
    
    # Fetch grant details for each match
    grants = []
    for match in matches_data.get("matches", [])[:3]:  # Top 3 matches
        grant_details = get_grant_details(db, match["grant_id"])
        
        if not grant_details:
            continue
        
        # Get match score (already a percentage 0-100)
        match_score = match.get("similarity_score", 0)
        
        # Format grant data for template
        grant_data = {
            "title": grant_details.get("name", "Untitled Grant"),
            "funder": grant_details.get("agency_name", "Unknown Funder"),
            "description": (grant_details.get("desc") or grant_details.get("description") or "No description available.")[:300] + "...",
            "reasoning": match.get("reasoning", "This grant aligns with your organization's mission and focus areas."),
            "match_score": match_score,
            "amount_range": format_amount_range(
                None,  # Min not available in API
                grant_details.get("grant_amount")  # Max amount
            ),
            "deadline": format_closing_dates(grant_details.get("closing_dates", {})),
            "categories": ", ".join(grant_details.get("explorable_categories", [])) if grant_details.get("explorable_categories") else "General",
            "url": grant_details.get("deactivation_url") or grant_details.get("link", "#")
        }
        
        grants.append(grant_data)
    
    if not grants:
        logger.warning(f"No valid grants found for NPO {npo_data.get('name')}")
        return None
    
    # Prepare template context
    return {
        "npo_name": npo_data.get("name", "Your Organization"),
        "total_grants": matches_data.get("total_grants_analyzed", "hundreds of"),
        "grants": grants,
        "generated_date": format_deadline(str(matches_data.get("updated_at", datetime.now().isoformat()))),
        "dashboard_url": "https://granted.app/dashboard",
        "settings_url": "https://granted.app/settings/notifications",
        "current_year": datetime.now().year
    }


def render_email_template(template_data: Dict[str, Any]) -> str:
    """Render HTML email using Jinja2 template"""
    try:
        # Setup Jinja2 environment
        # Go up two levels: handlers/ -> functions/ -> template/
        template_dir = Path(__file__).parent.parent / "template"
        env = Environment(loader=FileSystemLoader(str(template_dir)))
        template = env.get_template("email_template_updated.html")
        
        # Render template
        html_content = template.render(**template_data)
        return html_content
    
    except Exception as e:
        logger.error(f"Error rendering email template: {e}", exc_info=True)
        raise


def send_email_to_npo(npo_id: str, db) -> bool:
    """Send personalized grant match email to a single NPO"""
    try:
        # Fetch NPO data
        npo_ref = db.collection("npos").document(npo_id)
        npo_doc = npo_ref.get()
        
        if not npo_doc.exists:
            logger.warning(f"NPO {npo_id} not found")
            return False
        
        npo_data = npo_doc.to_dict()
        npo_email = npo_data.get("email")
        
        if not npo_email:
            logger.warning(f"NPO {npo_id} has no email address")
            return False
        
        # Fetch matches data
        matches_ref = db.collection("matches").document(npo_id)
        matches_doc = matches_ref.get()
        
        if not matches_doc.exists:
            logger.info(f"No matches found for NPO {npo_id}")
            return False
        
        matches_data = matches_doc.to_dict()
        
        # Check if there are matches
        if not matches_data.get("matches") or len(matches_data.get("matches", [])) == 0:
            logger.info(f"NPO {npo_id} has no grant matches")
            return False
        
        # Prepare email data
        email_data = prepare_email_data(npo_data, matches_data, db)
        
        if not email_data:
            logger.warning(f"Could not prepare email data for NPO {npo_id}")
            return False
        
        # Render email HTML
        html_content = render_email_template(email_data)
        
        # Queue email using Firestore Send Email extension
        mail_ref = db.collection("mail").document()
        mail_ref.set({
            "to": [npo_email],
            "message": {
                "subject": f"Your Top 3 Grant Matches - {email_data['npo_name']}",
                "html": html_content
            },
            "metadata": {
                "npo_id": npo_id,
                "sent_at": firestore.SERVER_TIMESTAMP,
                "trigger": "grant_match_notification"
            }
        })
        
        logger.info(
            f"Email queued for NPO {npo_id} ({npo_data.get('name')})",
            extra={
                "npo_id": npo_id,
                "email": npo_email,
                "mail_doc_id": mail_ref.id,
                "num_matches": len(email_data["grants"])
            }
        )
        
        return True
    
    except Exception as e:
        logger.error(f"Error sending email to NPO {npo_id}: {e}", exc_info=True)
        return False


def send_emails_to_all_npos(db) -> Dict[str, Any]:
    """Send emails to all NPOs with matches"""
    results = {
        "total_npos": 0,
        "emails_sent": 0,
        "emails_failed": 0,
        "no_matches": 0,
        "errors": []
    }
    
    try:
        # Fetch all NPOs
        npos_ref = db.collection("npos")
        npos = npos_ref.stream()
        
        for npo_doc in npos:
            results["total_npos"] += 1
            npo_id = npo_doc.id
            
            success = send_email_to_npo(npo_id, db)
            
            if success:
                results["emails_sent"] += 1
            else:
                results["emails_failed"] += 1
        
        logger.info(
            f"Batch email sending completed: {results['emails_sent']}/{results['total_npos']} sent",
            extra=results
        )
        
    except Exception as e:
        logger.error(f"Error in batch email sending: {e}", exc_info=True)
        results["errors"].append(str(e))
    
    return results


# CRON Trigger: Weekly on Monday 9am SGT
@scheduler_fn.on_schedule(schedule="0 9 * * 1", timezone="Asia/Singapore")
def send_weekly_grant_emails(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Scheduled function to send weekly grant match emails.
    Runs every Monday at 9:00 AM Singapore Time.
    """
    logger.info("Starting weekly grant match email job")
    
    db = firestore.client()
    results = send_emails_to_all_npos(db)
    
    logger.info(
        f"Weekly email job completed: {results['emails_sent']} emails sent",
        extra=results
    )


# HTTP Trigger: Manual email sending
@https_fn.on_request()
def send_grant_emails_manual(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP POST endpoint to manually trigger grant match emails.
    
    Optional JSON body:
    {
        "npo_id": "specific_npo_id"  // If provided, sends to specific NPO only
    }
    
    If no npo_id provided, sends to all NPOs.
    """
    # Handle CORS preflight
    if req.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow POST requests
    if req.method != "POST":
        return https_fn.Response(
            response=json.dumps({"error": "Method not allowed. Use POST."}),
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    try:
        db = firestore.client()
        
        # Parse request body
        data = req.get_json(silent=True) or {}
        npo_id = data.get("npo_id")
        
        if npo_id:
            # Send to specific NPO
            logger.info(f"Manual trigger: sending email to NPO {npo_id}")
            success = send_email_to_npo(npo_id, db)
            
            if success:
                return https_fn.Response(
                    response=json.dumps({
                        "success": True,
                        "message": f"Email queued for NPO {npo_id}"
                    }),
                    status=200,
                    headers=get_cors_headers(),
                    mimetype="application/json"
                )
            else:
                return https_fn.Response(
                    response=json.dumps({
                        "error": f"Failed to send email to NPO {npo_id}. Check logs for details."
                    }),
                    status=400,
                    headers=get_cors_headers(),
                    mimetype="application/json"
                )
        else:
            # Send to all NPOs
            logger.info("Manual trigger: sending emails to all NPOs")
            results = send_emails_to_all_npos(db)
            
            return https_fn.Response(
                response=json.dumps({
                    "success": True,
                    "message": "Batch email job completed",
                    "results": results
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
    
    except Exception as e:
        logger.error(f"Error in manual email trigger: {e}", exc_info=True)
        return https_fn.Response(
            response=json.dumps({
                "error": f"Failed to send emails: {str(e)}"
            }),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
