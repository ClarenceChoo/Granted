"""
HTTP function for free-form AI chat about grants using Gemini.
"""

import json
import logging
from firebase_functions import https_fn
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def get_cors_headers():
    """Return CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }


@https_fn.on_request(secrets=["GEMINI_API_KEY"])
def ai_chat(req: https_fn.Request) -> https_fn.Response:
    """
    Free-form AI chat endpoint for grant-related questions.
    
    POST body:
    {
        "message": "What grants are available for education?",
        "history": [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ],
        "context": {
            "name": "My NPO",
            "sector": "Education",
            "mission": "...",
            "uen": "..."
        }
    }
    
    Returns:
    {
        "response": "AI response text...",
        "success": true
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
        request_data = req.get_json(silent=True)
        if not request_data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        message = request_data.get("message", "")
        history = request_data.get("history", [])
        context = request_data.get("context", {})
        
        if not message:
            return https_fn.Response(
                response=json.dumps({"error": "Message is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Get API key from secret
        import os
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if not api_key:
            logger.warning("GEMINI_API_KEY not configured")
            return https_fn.Response(
                response=json.dumps({
                    "response": "AI chat is not available. Please configure GEMINI_API_KEY.",
                    "success": False
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        
        # Build context from organization profile
        org_context = ""
        if context:
            org_context = f"""
            The user is from an organization with the following profile:
            - Name: {context.get('name', 'Unknown')}
            - Sector: {context.get('sector', 'Unknown')}
            - Mission: {context.get('mission', 'Not specified')}
            - UEN: {context.get('uen', 'Not specified')}
            """
        
        # Build conversation history (keep last 10 messages)
        history_text = ""
        for msg in history[-10:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role}: {msg.get('content', '')}\n"
        
        system_prompt = f"""You are a helpful AI assistant specializing in Singapore grants and funding for non-profit organizations (NPOs), charities, and social enterprises.

Your knowledge includes:
- Singapore government grants (NAC, Tote Board, MCCY, MSF, etc.)
- Grant application best practices
- Eligibility requirements for various grants
- Tips for writing successful grant applications
- Funding landscape in Singapore for the social sector

{org_context}

Guidelines:
- Be helpful, concise, and accurate
- If you don't know something specific, say so and suggest where they might find the information
- Provide actionable advice when possible
- Keep responses under 200 words unless more detail is needed
- Use bullet points for lists
- Be encouraging and supportive

Previous conversation:
{history_text}

User's current message: {message}

Respond helpfully:"""

        response = model.generate_content(system_prompt)
        
        logger.info("Successfully generated AI chat response")
        
        return https_fn.Response(
            response=json.dumps({
                "response": response.text,
                "success": True
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error in ai_chat: {e}")
        return https_fn.Response(
            response=json.dumps({
                "response": "I'm having trouble connecting right now. Please try again in a moment.",
                "success": False
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
