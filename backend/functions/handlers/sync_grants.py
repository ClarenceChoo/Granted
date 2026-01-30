"""
Scheduled function to sync grant data from OurSGGrants API to Firestore.
Runs daily at 6am SGT.
"""

import json
import logging
import requests
from zoneinfo import ZoneInfo
from firebase_functions import scheduler_fn, https_fn
from firebase_admin import firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

GRANTS_API_URL = "https://oursggrants.gov.sg/api/v1/grant_metadata/explore_grants"


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


def _sync_grants_logic() -> dict:
    """
    Core logic for syncing grants. Extracted to be reusable by both
    scheduled and manual triggers.
    
    Returns:
        dict: Summary of sync operation with counts
    """
    logger.info("Starting grants sync")
    
    # Fetch data from API
    logger.info(f"Fetching grants from {GRANTS_API_URL}")
    response = requests.get(GRANTS_API_URL, timeout=30)
    response.raise_for_status()
    
    grants_data = response.json()
    
    # Handle both list and dict response formats
    if isinstance(grants_data, list):
        grants_list = grants_data
    else:
        grants_list = grants_data.get("grant_metadata", grants_data.get("data", []))
    
    logger.info(f"Retrieved {len(grants_list)} grants from API")
    
    # Get Firestore client
    db = firestore.client()
    grants_collection = db.collection("grants")
    logger.info("Connected to Firestore grants collection")
    
    # Process grants data
    new_count = 0
    updated_count = 0
    skipped_count = 0
    
    for grant in grants_list:
        # Use grant ID as document ID (adjust field name based on actual API response)
        grant_id = grant.get("id") or grant.get("grant_id") or grant.get("grantId")
        
        if not grant_id:
            logger.warning(f"Grant missing ID field, skipping: {grant}")
            continue
        
        # Check if grant already exists
        doc_ref = grants_collection.document(str(grant_id))
        existing_doc = doc_ref.get()
        
        if existing_doc.exists:
            # Compare data to see if update is needed
            existing_data = existing_doc.to_dict()
            
            # Check if data has changed (comparing all fields)
            if existing_data == grant:
                skipped_count += 1
                logger.debug(f"Grant {grant_id} unchanged, skipping")
                continue
            else:
                # Update existing grant
                doc_ref.set(grant)
                updated_count += 1
                logger.info(f"Updated grant {grant_id}")
        else:
            # Create new grant
            doc_ref.set(grant)
            new_count += 1
            logger.info(f"Created new grant {grant_id}")
    
    summary = {
        "new": new_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": new_count + updated_count + skipped_count
    }
    
    logger.info(
        f"Grants sync completed successfully. "
        f"New: {new_count}, Updated: {updated_count}, Skipped: {skipped_count}"
    )
    
    return summary


@scheduler_fn.on_schedule(schedule="0 */3 * * *", timezone=ZoneInfo("Asia/Singapore"))
def sync_grants_daily(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Scheduled function that runs every 3 hours to sync grant data.
    Fetches grants from OurSGGrants API and updates Firestore.
    Only writes new or modified grants to minimize writes.
    """
    logger.info("Starting scheduled grants sync job")
    
    try:
        _sync_grants_logic()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch grants from API: {e}")
        raise
    except Exception as e:
        logger.error(f"Error during grants sync: {e}")
        raise


@https_fn.on_request()
def sync_grants_manual(req: https_fn.Request) -> https_fn.Response:
    """
    Manually triggered function to sync grant data.
    Can be called via HTTP GET request.
    
    Returns:
        Response: JSON response with sync operation summary
    """
    # Handle CORS preflight request
    if req.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow GET requests
    if req.method != "GET":
        return https_fn.Response(
            response='{"error": "Method not allowed. Use GET."}',
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    try:
        summary = _sync_grants_logic()
        return https_fn.Response(
            response=json.dumps({
                "success": True,
                "message": "Grants sync completed successfully",
                **summary
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    except requests.RequestException as e:
        logger.error(f"Failed to fetch grants from API: {e}")
        return https_fn.Response(
            response=json.dumps({
                "success": False,
                "error": f"API request failed: {str(e)}"
            }),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    except Exception as e:
        logger.error(f"Error during grants sync: {e}")
        return https_fn.Response(
            response=json.dumps({
                "success": False,
                "error": str(e)
            }),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
