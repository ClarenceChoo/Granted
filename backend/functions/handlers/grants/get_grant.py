"""
Grant details API endpoint.

Provides detailed view of a single grant including all metadata.
"""

from firebase_functions import https_fn
from firebase_admin import firestore
import json


def get_cors_headers():
    """Return CORS headers for cross-origin requests."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }


@https_fn.on_request()
def get_grant(req: https_fn.Request) -> https_fn.Response:
    """
    Get detailed information about a specific grant.
    
    Query Parameters:
    - grant_id: The ID of the grant to retrieve (required)
    
    Returns:
        JSON with complete grant details including:
        - Basic info (name, description, agency)
        - Eligibility criteria
        - Application process
        - Funding details
        - Deadlines and dates
        - Contact information
    """
    # Handle CORS preflight
    if req.method == "OPTIONS":
        return https_fn.Response(
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow GET requests
    if req.method != "GET":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
    
    try:
        # Get grant_id from query parameters
        grant_id = req.args.get('grant_id', '').strip()
        
        if not grant_id:
            return https_fn.Response(
                json.dumps({"error": "Missing required parameter: grant_id"}),
                status=400,
                headers={**get_cors_headers(), "Content-Type": "application/json"}
            )
        
        # Get Firestore client
        db = firestore.client()
        grant_ref = db.collection("grants").document(grant_id)
        grant_doc = grant_ref.get()
        
        if not grant_doc.exists:
            return https_fn.Response(
                json.dumps({"error": f"Grant not found: {grant_id}"}),
                status=404,
                headers={**get_cors_headers(), "Content-Type": "application/json"}
            )
        
        # Get grant data
        grant_data = grant_doc.to_dict()
        grant_data['id'] = grant_doc.id
        
        # Enrich with structured data
        grant_details = {
            "id": grant_data.get('id'),
            "name": grant_data.get('name', 'Unknown'),
            "description": grant_data.get('description', ''),
            "agency": {
                "code": grant_data.get('agency_code', ''),
                "name": grant_data.get('agency_name', grant_data.get('agency_code', ''))
            },
            "status": grant_data.get('status', 'Unknown'),
            "sector": grant_data.get('sector'),
            
            # Eligibility
            "eligibility": {
                "applicable_to": grant_data.get('applicable_to', []),
                "criteria": grant_data.get('eligibility_criteria', grant_data.get('eligibility', '')),
                "requirements": grant_data.get('requirements', [])
            },
            
            # Funding details
            "funding": {
                "amount": grant_data.get('amount', 'Varies'),
                "min_amount": grant_data.get('min_amount'),
                "max_amount": grant_data.get('max_amount'),
                "funding_level": grant_data.get('funding_level', ''),
                "type": grant_data.get('funding_type', grant_data.get('type', ''))
            },
            
            # Application details
            "application": {
                "process": grant_data.get('application_process', grant_data.get('how_to_apply', '')),
                "url": grant_data.get('application_url', grant_data.get('url', '')),
                "documents_required": grant_data.get('documents_required', []),
                "evaluation_criteria": grant_data.get('evaluation_criteria', [])
            },
            
            # Timeline
            "timeline": {
                "opening_date": grant_data.get('opening_date'),
                "closing_date": grant_data.get('closing_date'),
                "closing_dates": grant_data.get('closingDates', {}),
                "next_application_date": grant_data.get('next_application_date'),
                "processing_time": grant_data.get('processing_time', '')
            },
            
            # Additional info
            "contact": {
                "email": grant_data.get('contact_email', ''),
                "phone": grant_data.get('contact_phone', ''),
                "website": grant_data.get('website', grant_data.get('more_info_url', ''))
            },
            
            "keywords": grant_data.get('keywords', []),
            "categories": grant_data.get('categories', []),
            "tags": grant_data.get('tags', []),
            
            # Metadata
            "metadata": {
                "created_at": grant_data.get('created_at'),
                "updated_at": grant_data.get('updated_at'),
                "last_synced": grant_data.get('last_synced'),
                "source": grant_data.get('source', 'OurSGGrants')
            },
            
            # Raw data for any fields not covered above
            "raw_data": grant_data
        }
        
        return https_fn.Response(
            json.dumps(grant_details),
            status=200,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
