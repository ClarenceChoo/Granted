"""
HTTP function for retrieving NPO's saved grants with full details.
"""

import json
import logging
from firebase_functions import https_fn
from firebase_admin import firestore

from .utils import get_cors_headers, verify_auth_token, MAX_SAVED_GRANTS

logger = logging.getLogger(__name__)


@https_fn.on_request()
def get_saved_grants(req: https_fn.Request) -> https_fn.Response:
    """
    Get all saved grants for an NPO with full grant details.
    
    URL parameter: npo_id (the NPO's user ID)
    Example: /get_saved_grants?npo_id=abc123
    
    Requires: Authorization header with Firebase Auth token
    
    Returns:
        Response: JSON response with list of saved grants with full details
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
            response=json.dumps({"error": "Method not allowed. Use GET."}),
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    # Verify authentication
    decoded_token = verify_auth_token(req)
    if not decoded_token:
        return https_fn.Response(
            response=json.dumps({"error": "Unauthorized. Valid authentication token required."}),
            status=401,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    user_uid = decoded_token["uid"]
    
    # Get npo_id from query params, default to authenticated user
    npo_id = req.args.get("npo_id", user_uid)
    
    # Only allow users to view their own saved grants
    if npo_id != user_uid:
        return https_fn.Response(
            response=json.dumps({"error": "Forbidden. You can only view your own saved grants."}),
            status=403,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    try:
        db = firestore.client()
        
        # Get NPO document
        npo_ref = db.collection("npos").document(npo_id)
        npo_doc = npo_ref.get()
        
        if not npo_doc.exists:
            return https_fn.Response(
                response=json.dumps({"error": "NPO profile not found."}),
                status=404,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        npo_data = npo_doc.to_dict()
        saved_grant_ids = npo_data.get("saved_grants", [])
        
        # Fetch full details for each saved grant
        grants = []
        grants_to_remove = []  # Track grants that no longer exist
        
        for grant_id in saved_grant_ids:
            grant_ref = db.collection("grants").document(grant_id)
            grant_doc = grant_ref.get()
            
            if grant_doc.exists:
                grant_data = grant_doc.to_dict()
                grant_data["id"] = grant_id
                grants.append(grant_data)
            else:
                # Grant no longer exists, mark for removal
                grants_to_remove.append(grant_id)
                logger.warning(f"Grant {grant_id} no longer exists, removing from saved list")
        
        # Clean up any grants that no longer exist
        if grants_to_remove:
            for grant_id in grants_to_remove:
                npo_ref.update({
                    "saved_grants": firestore.ArrayRemove([grant_id])
                })
        
        logger.info(f"Retrieved {len(grants)} saved grants for NPO {npo_id}")
        
        return https_fn.Response(
            response=json.dumps({
                "success": True,
                "count": len(grants),
                "max_allowed": MAX_SAVED_GRANTS,
                "grants": grants
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error getting saved grants: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
