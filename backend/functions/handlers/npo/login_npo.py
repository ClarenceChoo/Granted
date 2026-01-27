"""
HTTP function for NPO login authentication.
"""

import json
import logging
import os
import requests
from firebase_functions import https_fn

from .utils import get_cors_headers, validate_email

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@https_fn.on_request(secrets=["WEB_API_KEY"])
def login_npo(req: https_fn.Request) -> https_fn.Response:
    """
    Authenticate an NPO user and return Firebase tokens.
    
    Expected JSON body:
    {
        "email": "npo@example.com",
        "password": "securepassword123"
    }
    
    Returns:
        Response: JSON response with Firebase tokens or error
        {
            "success": true,
            "data": {
                "idToken": "...",      // Use this for authenticated requests
                "refreshToken": "...", // Use to refresh idToken
                "expiresIn": "3600",   // Token expiry in seconds
                "uid": "..."           // User's Firebase UID
            }
        }
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
        
        # Extract credentials
        email = data.get("email", "").strip()
        password = data.get("password", "")
        
        # Validation
        errors = []
        
        if not email:
            errors.append("Email is required")
        elif not validate_email(email):
            errors.append("Invalid email format")
        
        if not password:
            errors.append("Password is required")
        
        if errors:
            return https_fn.Response(
                response=json.dumps({"error": "Validation failed", "details": errors}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Get Firebase API key from environment variable
        firebase_api_key = os.environ.get("WEB_API_KEY")
        if not firebase_api_key:
            logger.error("WEB_API_KEY environment variable not set")
            return https_fn.Response(
                response=json.dumps({"error": "Server configuration error"}),
                status=500,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Authenticate with Firebase Auth REST API
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
        
        auth_payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        
        logger.info(f"Attempting login for email: {email}")
        
        auth_response = requests.post(auth_url, json=auth_payload)
        auth_data = auth_response.json()
        
        # Check for authentication errors
        if auth_response.status_code != 200:
            error_message = auth_data.get("error", {}).get("message", "Authentication failed")
            
            # Map Firebase error codes to user-friendly messages
            error_mapping = {
                "EMAIL_NOT_FOUND": "No account found with this email",
                "INVALID_PASSWORD": "Incorrect password",
                "USER_DISABLED": "This account has been disabled",
                "INVALID_EMAIL": "Invalid email format",
                "INVALID_LOGIN_CREDENTIALS": "Invalid email or password"
            }
            
            friendly_message = error_mapping.get(error_message, "Invalid email or password")
            
            logger.warning(f"Login failed for {email}: {error_message}")
            
            return https_fn.Response(
                response=json.dumps({"error": friendly_message}),
                status=401,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Extract tokens from successful response
        id_token = auth_data.get("idToken")
        refresh_token = auth_data.get("refreshToken")
        expires_in = auth_data.get("expiresIn")
        local_id = auth_data.get("localId")  # This is the UID
        
        logger.info(f"Login successful for UID: {local_id}")
        
        # Return success response with tokens
        response_data = {
            "success": True,
            "message": "Login successful",
            "data": {
                "idToken": id_token,
                "refreshToken": refresh_token,
                "expiresIn": expires_in,
                "uid": local_id
            }
        }
        
        return https_fn.Response(
            response=json.dumps(response_data),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during login: {e}")
        return https_fn.Response(
            response=json.dumps({"error": "Authentication service unavailable"}),
            status=503,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
    except Exception as e:
        logger.error(f"Error during login: {e}")
        return https_fn.Response(
            response=json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
