"""
HTTP function for updating NPO (Non-Profit Organisation) entities.
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
def update_npo(req: https_fn.Request) -> https_fn.Response:
    """
    Update an existing NPO (Non-Profit Organisation) entity in Firestore.
    Requires Firebase Auth token in Authorization header.
    
    Expected JSON body (all fields optional):
    {
        "name": "Updated Organisation Name",
        "sector": "Healthcare",
        "description": "Updated description",
        "beneficiaries": ["Children", "Disabled"],
        "budget": 75000
    }
    
    Note: email and uen cannot be updated.
    
    Returns:
        Response: JSON response with updated NPO data or error
    """
    # Handle CORS preflight request
    if req.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers=get_cors_headers()
        )
    
    # Only allow PUT requests
    if req.method != "PUT":
        return https_fn.Response(
            response=json.dumps({"error": "Method not allowed. Use PUT."}),
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
        
        # Parse request body
        try:
            data = req.get_json(silent=True, force=True)
        except Exception:
            data = None
            
        if not data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required. Ensure Content-Type is application/json."}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
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
        
        # Fields that can be updated
        allowed_fields = ["name", "sector", "description", "beneficiaries", "budget"]
        update_data = {}
        errors = []
        
        # Validate and collect fields to update
        if "name" in data:
            name = data["name"].strip() if isinstance(data["name"], str) else ""
            if not name:
                errors.append("Name cannot be empty")
            else:
                update_data["name"] = name
        
        if "sector" in data:
            sector = data["sector"].strip() if isinstance(data["sector"], str) else ""
            if not sector:
                errors.append("Sector cannot be empty")
            else:
                update_data["sector"] = sector
        
        if "description" in data:
            description = data["description"].strip() if isinstance(data["description"], str) else ""
            update_data["description"] = description
        
        if "beneficiaries" in data:
            beneficiaries = data["beneficiaries"]
            if not isinstance(beneficiaries, list):
                errors.append("Beneficiaries must be a list")
            else:
                update_data["beneficiaries"] = beneficiaries
        
        if "budget" in data:
            budget = data["budget"]
            if budget is not None and (not isinstance(budget, (int, float)) or budget < 0):
                errors.append("Budget must be a non-negative number")
            else:
                update_data["budget"] = budget
        
        # Check for disallowed field updates
        if "email" in data:
            errors.append("Email cannot be updated")
        if "uen" in data:
            errors.append("UEN cannot be updated")
        
        if errors:
            return https_fn.Response(
                response=json.dumps({"error": "Validation failed", "details": errors}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        if not update_data:
            return https_fn.Response(
                response=json.dumps({"error": "No valid fields to update"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Add updated_at timestamp
        update_data["updated_at"] = firestore.SERVER_TIMESTAMP
        
        # Update Firestore document
        npo_ref.update(update_data)
        
        # Update Firebase Auth display name if name was updated
        if "name" in update_data:
            try:
                auth.update_user(uid, display_name=update_data["name"])
            except Exception as e:
                logger.warning(f"Failed to update Auth display name: {e}")
        
        # Get updated document
        updated_doc = npo_ref.get()
        updated_data = updated_doc.to_dict()
        
        logger.info(f"Updated NPO: {uid}")
        
        # Return success response
        response_data = {
            "success": True,
            "message": "NPO updated successfully",
            "data": {
                "uid": uid,
                "email": updated_data.get("email"),
                "name": updated_data.get("name"),
                "uen": updated_data.get("uen"),
                "sector": updated_data.get("sector"),
                "description": updated_data.get("description"),
                "beneficiaries": updated_data.get("beneficiaries"),
                "budget": updated_data.get("budget")
            }
        }
        
        return https_fn.Response(
            response=json.dumps(response_data),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error updating NPO: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
