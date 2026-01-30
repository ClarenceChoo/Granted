"""
HTTP function for free-form AI chat about grants.
Migrated from Gemini to OpenAI.
"""

import json
import logging
import os
from firebase_functions import https_fn

# OpenAI import
from openai import OpenAI

# Gemini import (commented out)
# import google.generativeai as genai

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


# Changed from secrets=["GEMINI_API_KEY"] to secrets=["OPENAI_API_KEY"]
@https_fn.on_request(secrets=["OPENAI_API_KEY"])
def ai_chat(req: https_fn.Request) -> https_fn.Response:
    """
    Free-form AI chat endpoint for grant-related questions using OpenAI.
    
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
        
        # Get API key from secret (changed from GEMINI_API_KEY to OPENAI_API_KEY)
        api_key = os.environ.get("OPENAI_API_KEY")
        
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured")
            return https_fn.Response(
                response=json.dumps({
                    "response": "AI chat is not available. Please configure OPENAI_API_KEY.",
                    "success": False
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
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
- Be encouraging and supportive"""

        # ============================================
        # OpenAI Implementation
        # ============================================
        client = OpenAI(api_key=api_key)
        
        # Build messages array for OpenAI
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (last 10 messages)
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
        
        # Add current user message
        messages.append({"role": "user", "content": message})
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        
        response_text = response.choices[0].message.content
        
        # ============================================
        # Gemini Implementation (commented out)
        # ============================================
        # genai.configure(api_key=api_key)
        # model = genai.GenerativeModel('gemini-2.0-flash-lite')
        # 
        # # Build conversation history for Gemini
        # history_text = ""
        # for msg in history[-10:]:
        #     role = "User" if msg.get("role") == "user" else "Assistant"
        #     history_text += f"{role}: {msg.get('content', '')}\n"
        # 
        # full_prompt = f"""{system_prompt}
        # 
        # Previous conversation:
        # {history_text}
        # 
        # User's current message: {message}
        # 
        # Respond helpfully:"""
        # 
        # response = model.generate_content(full_prompt)
        # response_text = response.text
        
        logger.info("Successfully generated AI chat response")
        
        return https_fn.Response(
            response=json.dumps({
                "response": response_text,
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
