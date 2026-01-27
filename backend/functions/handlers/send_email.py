"""
Email handler for sending emails via HTTP endpoints.
Uses the Firebase Firestore Send Email extension.
"""

from firebase_functions import https_fn
from firebase_admin import firestore
from utils.logger import logger


def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }


@https_fn.on_request()
def send_hello_world_email(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP POST endpoint to send a Hello World email to clarencechoo1111@gmail.com.
    
    The Firestore Send Email extension watches the 'mail' collection
    and sends emails based on the document structure.
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
            '{"error": "Method not allowed. Use POST."}',
            status=405,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
    
    logger.log_request(req.method, req.path)
    
    try:
        db = firestore.client()
        mail_ref = db.collection("mail").document()
        
        mail_ref.set({
            "to": ["yuhoetan@gmail.com"],
            "message": {
                "subject": "wassup gays, the email service is up and running",
                "text": "i love hong xun ass",
                "html": open("static/template.html", "r").read()
                # "html": "<h1>Hello World!</h1><p>hello world, i fucking spent 6 hours building the email serivce to make this thing work. below ive attached of my gay aass face</p><img src=\"https://i.imgur.com/KawrXNF.jpeg\">",
            }
        })
        
        logger.info("Hello World email queued", doc_id=mail_ref.id)
        
        return https_fn.Response(
            f'{{"success": true, "message": "Email queued successfully", "doc_id": "{mail_ref.id}"}}',
            status=200,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
    
    except Exception as e:
        logger.error("Failed to queue email", error=e)
        return https_fn.Response(
            f'{{"error": "Failed to queue email: {str(e)}"}}',
            status=500,
            headers={**get_cors_headers(), "Content-Type": "application/json"}
        )
