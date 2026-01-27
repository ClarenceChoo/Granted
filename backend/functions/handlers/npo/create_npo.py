"""
HTTP function for creating NPO (Non-Profit Organisation) entities.
"""

import json
import logging
from firebase_functions import https_fn
from firebase_admin import firestore, auth
from google.cloud.firestore import SERVER_TIMESTAMP

from .utils import get_cors_headers, validate_uen, validate_email

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@https_fn.on_request()
def create_npo(req: https_fn.Request) -> https_fn.Response:
    """
    Create a new NPO (Non-Profit Organisation) entity in Firestore.
    
    Expected JSON body:
    {
        "email": "npo@example.com",
        "password": "securepassword123",
        "name": "Organisation Name",
        "uen": "201912345A",
        "sector": "Social Services",
        "description": "Description of the organisation",
        "beneficiaries": ["Youth", "Elderly"],
        "budget": 50000
    }
    
    Returns:
        Response: JSON response with created NPO data or error
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
    
    try:
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
        
        # Extract and validate required fields
        email = data.get("email", "").strip()
        password = data.get("password", "")
        name = data.get("name", "").strip()
        uen = data.get("uen", "").strip().upper()
        sector = data.get("sector", "").strip()
        description = data.get("description", "").strip()
        beneficiaries = data.get("beneficiaries", [])
        budget = data.get("budget")
        
        # Validation
        errors = []
        
        if not email:
            errors.append("Email is required")
        elif not validate_email(email):
            errors.append("Invalid email format")
        
        if not password:
            errors.append("Password is required")
        elif len(password) < 5:
            errors.append("Password must be at least 5 characters")
        
        if not name:
            errors.append("Name is required")
        
        if not uen:
            errors.append("UEN is required")
        elif not validate_uen(uen):
            errors.append("Invalid UEN format")
        
        if not sector:
            errors.append("Sector is required")
        
        if budget is not None and (not isinstance(budget, (int, float)) or budget < 0):
            errors.append("Budget must be a non-negative number")
        
        if not isinstance(beneficiaries, list):
            errors.append("Beneficiaries must be a list")
        
        if errors:
            return https_fn.Response(
                response=json.dumps({"error": "Validation failed", "details": errors}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Get Firestore client
        db = firestore.client()
        npos_collection = db.collection("npos")
        
        # Check if UEN already exists
        existing_uen = npos_collection.where("uen", "==", uen).limit(1).get()
        if len(list(existing_uen)) > 0:
            return https_fn.Response(
                response=json.dumps({"error": "An NPO with this UEN already exists"}),
                status=409,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Create Firebase Auth user
        try:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            logger.info(f"Created Firebase Auth user: {user.uid}")
        except auth.EmailAlreadyExistsError:
            return https_fn.Response(
                response=json.dumps({"error": "An account with this email already exists"}),
                status=409,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        except Exception as e:
            logger.error(f"Failed to create Firebase Auth user: {e}")
            return https_fn.Response(
                response=json.dumps({"error": f"Failed to create user account: {str(e)}"}),
                status=500,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Prepare NPO document
        npo_data = {
            "uid": user.uid,
            "email": email,
            "name": name,
            "uen": uen,
            "sector": sector,
            "description": description,
            "beneficiaries": beneficiaries,
            "budget": budget,
            "saved_grants": [],  # Initialize empty saved grants list (max 5)
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP
        }
        
        # Save to Firestore using user UID as document ID
        doc_ref = npos_collection.document(user.uid)
        doc_ref.set(npo_data)
        
        logger.info(f"Created NPO: {name} (UEN: {uen}, UID: {user.uid})")
        
        # Return success response (exclude password)
        response_data = {
            "success": True,
            "message": "NPO created successfully",
            "data": {
                "uid": user.uid,
                "email": email,
                "name": name,
                "uen": uen,
                "sector": sector,
                "description": description,
                "beneficiaries": beneficiaries,
                "budget": budget
            }
        }
        
        return https_fn.Response(
            response=json.dumps(response_data),
            status=201,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except json.JSONDecodeError:
        return https_fn.Response(
            response=json.dumps({"error": "Invalid JSON in request body"}),
            status=400,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    except Exception as e:
        logger.error(f"Error creating NPO: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
