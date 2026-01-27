"""
HTTP function for saving a grant to NPO's saved list.
"""

import json
import logging
from firebase_functions import https_fn
from firebase_admin import firestore

from .utils import get_cors_headers, verify_auth_token, MAX_SAVED_GRANTS

logger = logging.getLogger(__name__)


@https_fn.on_request()
def save_grant(req: https_fn.Request) -> https_fn.Response:
    """
    Save a grant to the NPO's saved grants list.
    
    Expected JSON body:
    {
        "grant_id": "grant_document_id"
    }
    
    Requires: Authorization header with Firebase Auth token
    
    Returns:
        Response: JSON response with updated saved grants or error
    """
    # Handle CORS preflight request
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
    
    try:
        # Parse request body
        data = req.get_json(silent=True, force=True)
        if not data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required."}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        grant_id = data.get("grant_id", "").strip()
        if not grant_id:
            return https_fn.Response(
                response=json.dumps({"error": "grant_id is required."}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        db = firestore.client()
        
        # Verify grant exists
        grant_ref = db.collection("grants").document(grant_id)
        grant_doc = grant_ref.get()
        if not grant_doc.exists:
            return https_fn.Response(
                response=json.dumps({"error": "Grant not found."}),
                status=404,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Get NPO document
        npo_ref = db.collection("npos").document(user_uid)
        npo_doc = npo_ref.get()
        
        if not npo_doc.exists:
            return https_fn.Response(
                response=json.dumps({"error": "NPO profile not found."}),
                status=404,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        npo_data = npo_doc.to_dict()
        saved_grants = npo_data.get("saved_grants", [])
        
        # Check if already saved
        if grant_id in saved_grants:
            return https_fn.Response(
                response=json.dumps({
                    "success": True,
                    "message": "Grant is already saved.",
                    "saved_grants": saved_grants
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Check max limit
        if len(saved_grants) >= MAX_SAVED_GRANTS:
            return https_fn.Response(
                response=json.dumps({
                    "error": f"Maximum of {MAX_SAVED_GRANTS} grants can be saved. Please remove a grant before adding a new one."
                }),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Add grant to saved list using arrayUnion for atomic operation
        npo_ref.update({
            "saved_grants": firestore.ArrayUnion([grant_id]),
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        # Get updated list
        updated_saved_grants = saved_grants + [grant_id]
        
        logger.info(f"NPO {user_uid} saved grant {grant_id}")
        
        return https_fn.Response(
            response=json.dumps({
                "success": True,
                "message": "Grant saved successfully.",
                "saved_grants": updated_saved_grants
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error saving grant: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
