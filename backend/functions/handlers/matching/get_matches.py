"""
HTTP function for retrieving NPO's grant matches from Firestore.
"""

import json
import logging
from typing import cast
from firebase_functions import https_fn
from firebase_admin import firestore
from google.cloud.firestore_v1 import DocumentSnapshot

from .utils import get_cors_headers, verify_auth_token

logger = logging.getLogger(__name__)


@https_fn.on_request()
def get_matches(req: https_fn.Request) -> https_fn.Response:
    """
    Get grant matches for an NPO from Firestore.
    
    Query Parameters:
        user_id (optional): NPO user ID to retrieve matches for.
                           If not provided, uses authenticated user's ID.
    
    Example: GET /get_matches?user_id=abc123
    
    Requires: Authorization header with Firebase Auth token
    
    Returns:
        Response: JSON with matches array and metadata
    """
    # Handle CORS preflight
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
    
    authenticated_uid = decoded_token["uid"]
    
    # Get user_id from query params, default to authenticated user
    user_id = req.args.get("user_id", authenticated_uid)
    
    # Authorization check: users can only view their own matches
    if user_id != authenticated_uid:
        return https_fn.Response(
            response=json.dumps({"error": "Forbidden. You can only view your own matches."}),
            status=403,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    
    try:
        db = firestore.client()
        
        # Get matches document for this NPO
        # Document ID in matches collection is the npo_id/user_id
        match_ref = db.collection("matches").document(user_id)
        match_doc: DocumentSnapshot = match_ref.get()  # type: ignore
        
        if not match_doc.exists:
            # No matches found for this user
            return https_fn.Response(
                response=json.dumps({
                    "user_id": user_id,
                    "matches": [],
                    "total_matches": 0,
                    "message": "No matches found. Matches may not have been generated yet."
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        match_data = match_doc.to_dict()
        if not match_data:
            match_data = {}
        
        # Extract matches array
        matches = match_data.get("matches", [])
        
        # Format response with metadata
        response_data = {
            "user_id": user_id,
            "matches": matches,
            "total_matches": len(matches),
            "updated_at": match_data.get("updated_at"),
            "trigger_source": match_data.get("trigger_source", "unknown"),
            "npo_description": match_data.get("npo_description", "")
        }
        
        logger.info(
            f"Retrieved {len(matches)} matches for NPO: {user_id}",
            extra={
                "npo_id": user_id,
                "num_matches": len(matches),
                "trigger_source": match_data.get("trigger_source")
            }
        )
        
        return https_fn.Response(
            response=json.dumps(response_data, default=str),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(
            f"Error retrieving matches for NPO {user_id}: {e}",
            extra={"npo_id": user_id, "error": str(e)},
            exc_info=True
        )
        return https_fn.Response(
            response=json.dumps({
                "error": "Failed to retrieve matches. Please try again later.",
                "details": str(e)
            }),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
