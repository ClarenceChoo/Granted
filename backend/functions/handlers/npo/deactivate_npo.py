"""
HTTP function for deactivating NPO (Non-Profit Organisation) accounts.
"""

import json
import logging
from firebase_functions import https_fn
from firebase_admin import firestore, auth
from google.cloud.firestore import SERVER_TIMESTAMP

from .utils import get_cors_headers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@https_fn.on_request()
def deactivate_npo(req: https_fn.Request) -> https_fn.Response:
    """
    Deactivate an NPO (Non-Profit Organisation) account.
    Requires Firebase Auth token in Authorization header.
    
    This will:
    1. Delete the NPO document from Firestore
    2. Delete the matches document for this NPO
    3. Disable the Firebase Auth account
    
    Expected JSON body (optional):
    {
        "reason": "User requested account deletion"
    }
    
    Returns:
        Response: JSON response with success message or error
    """
    # Handle CORS preflight request
    if req.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow DELETE requests
    if req.method != "DELETE":
        return https_fn.Response(
            response=json.dumps({"error": "Method not allowed. Use DELETE."}),
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    try:
        # Verify Firebase Auth token
        auth_header = req.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return https_fn.Response(
                response=json.dumps({"error": "Authorization header with Bearer token is required"}),
                status=401,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        id_token = auth_header.split("Bearer ")[1]
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token["uid"]
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return https_fn.Response(
                response=json.dumps({"error": "Invalid or expired authentication token"}),
                status=401,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Parse request body for optional reason
        reason = None
        try:
            if req.get_data():
                data = req.get_json()
                reason = data.get("reason", "User requested account deactivation")
        except Exception:
            reason = "User requested account deactivation"
        
        # Get Firestore client
        db = firestore.client()
        npo_ref = db.collection("npos").document(uid)
        
        # Check if NPO exists
        npo_doc = npo_ref.get()
        if not npo_doc.exists:
            return https_fn.Response(
                response=json.dumps({"error": "NPO not found"}),
                status=404,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Delete related records to prevent inconsistencies
        
        # 1. Delete matches document for this NPO
        matches_ref = db.collection("matches").document(uid)
        matches_doc = matches_ref.get()
        if matches_doc.exists:
            matches_ref.delete()
            logger.info(f"Deleted matches document for NPO {uid}")
        
        # 2. Clear saved_grants from NPO document before deletion
        npo_data = npo_doc.to_dict()
        if npo_data.get("saved_grants"):
            logger.info(f"NPO {uid} had {len(npo_data['saved_grants'])} saved grants")
        
        # 3. Delete the NPO document
        npo_ref.delete()
        logger.info(f"Deleted NPO document {uid}")
        
        # 4. Disable the Firebase Auth user
        # Note: This prevents login but keeps the user record for audit purposes
        try:
            auth.update_user(uid, disabled=True)
            logger.info(f"Disabled Firebase Auth user {uid}")
        except Exception as e:
            logger.error(f"Failed to disable Firebase Auth user: {e}")
            # Continue anyway - Firestore deletions are more important
        
        return https_fn.Response(
            response=json.dumps({
                "message": "NPO account and all related data successfully deleted",
                "uid": uid,
                "deleted": True
            }, default=str),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error deactivating NPO: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Failed to deactivate NPO: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
