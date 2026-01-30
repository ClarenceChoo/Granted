"""
HTTP function for retrieving NPO (Non-Profit Organisation) profile information.
"""

import json
import logging
from firebase_functions import https_fn
from firebase_admin import firestore, auth

from .utils import get_cors_headers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@https_fn.on_request()
def get_npo(req: https_fn.Request) -> https_fn.Response:
    """
    Get NPO (Non-Profit Organisation) profile information.
    Requires Firebase Auth token in Authorization header.
    
    Security: Users can ONLY access their own NPO profile.
    The NPO UID is extracted from the verified auth token, not from request parameters.
    
    Returns:
        Response: JSON response with authenticated user's NPO data or error
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
            authenticated_uid = decoded_token["uid"]
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return https_fn.Response(
                response=json.dumps({"error": "Invalid or expired authentication token"}),
                status=401,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Security: Only allow users to access their own NPO information
        # Ignore any query parameter and always use authenticated user's UID
        target_uid = authenticated_uid
        
        # Get Firestore client
        db = firestore.client()
        npo_ref = db.collection("npos").document(target_uid)
        
        # Get NPO document
        npo_doc = npo_ref.get()
        if not npo_doc.exists:
            return https_fn.Response(
                response=json.dumps({"error": "NPO not found"}),
                status=404,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        npo_data = npo_doc.to_dict()
        
        logger.info(f"Retrieved NPO: {target_uid}")
        
        # Return NPO data
        response_data = {
            "success": True,
            "data": {
                "uid": target_uid,
                "email": npo_data.get("email"),
                "name": npo_data.get("name"),
                "uen": npo_data.get("uen"),
                "sector": npo_data.get("sector"),
                "description": npo_data.get("description"),
                "beneficiaries": npo_data.get("beneficiaries", []),
                "budget": npo_data.get("budget"),
                "saved_grants": npo_data.get("saved_grants", []),
                "created_at": npo_data.get("created_at"),
                "updated_at": npo_data.get("updated_at")
            }
        }
        
        return https_fn.Response(
            response=json.dumps(response_data, default=str),  # default=str to handle Timestamp objects
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving NPO: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
