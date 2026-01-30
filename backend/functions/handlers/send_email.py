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
    HTTP POST endpoint to send a Hello World test email.
    
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
        
        # Read the image file as base64 for attachment
        import base64
        with open("template/moo.jpeg", "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        mail_ref.set({
            "to": ["yuhoetan@gmail.com", "robyn.p03@gmail.com", "clarencechoo1111@gmail.com"],
            "message": {
                "subject": "Hello World - Email Service Test",
                "text": "Hello World! This is a test email from the Granted backend email service.",
                "html": """
                    <h1>Hello World!</h1>
                    <p>This is a test email from the Granted backend email service.</p>
                    <div style="margin-top: 20px;">
                        <img src="cid:moo" alt="Moo" style="max-width: 500px; border-radius: 8px;">
                        <p style="font-style: italic; color: #666; margin-top: 10px;">
                            When you successfully deploy your email service after 6 hours of debugging 🐄
                        </p>
                    </div>
                """,
                "attachments": [
                    {
                        "filename": "moo.jpeg",
                        "content": img_data,
                        "encoding": "base64",
                        "cid": "moo"
                    }
                ]
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
