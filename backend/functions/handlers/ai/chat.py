"""
HTTP function for free-form AI chat about grants using OpenAI.
"""

import json
import logging
import os
import traceback
from pathlib import Path
from firebase_functions import https_fn
from openai import OpenAI
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Load prompts from JSON file
PROMPTS_FILE = Path(__file__).parent / "prompts.json"
with open(PROMPTS_FILE, "r") as f:
    PROMPTS = json.load(f)


# Pydantic model for structured output
class ChatOutput(BaseModel):
    response: str


def get_cors_headers():
    """Return CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


@https_fn.on_request(secrets=["OPENAI_API_KEY"])
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
        return https_fn.Response("", status=204, headers=get_cors_headers())

    # Only allow POST requests
    if req.method != "POST":
        return https_fn.Response(
            response=json.dumps({"error": "Method not allowed. Use POST."}),
            status=405,
            headers=get_cors_headers(),
            mimetype="application/json",
        )

    try:
        # Parse request body
        request_data = req.get_json(silent=True)
        logger.info(f"Received chat request with method: {req.method}")
        if not request_data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json",
            )

        message = request_data.get("message", "")
        history = request_data.get("history", [])
        context = request_data.get("context", {})

        logger.info(
            f"Message length: {len(message)}, History items: {len(history)}, Context provided: {bool(context)}"
        )

        if not message:
            return https_fn.Response(
                response=json.dumps({"error": "Message is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json",
            )

        # Get API key from secret
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            api_key = api_key.strip()  # Remove any trailing whitespace/newlines

        if not api_key:
            logger.warning("OPENAI_API_KEY not configured")
            return https_fn.Response(
                response=json.dumps(
                    {
                        "response": "AI chat is not available. Please configure OPENAI_API_KEY.",
                        "success": False,
                    }
                ),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json",
            )

        # Configure OpenAI client
        client = OpenAI(api_key=api_key)

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

        # Build system prompt
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

        logger.info(f"Calling OpenAI with system prompt length: {len(system_prompt)}")

        # Build messages array for OpenAI
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages)
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})

        # Add current user message
        messages.append({"role": "user", "content": message})

        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=messages,
            response_format=ChatOutput,
            temperature=0.7,
            max_tokens=800,
        )

        # Extract structured response
        chat_data = completion.choices[0].message.parsed

        logger.info("Successfully generated AI chat response")

        return https_fn.Response(
            response=json.dumps({"response": chat_data.response, "success": True}),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json",
        )

    except Exception as e:
        logger.error(f"Error in ai_chat: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return https_fn.Response(
            response=json.dumps(
                {
                    "response": "I'm having trouble connecting right now. Please try again in a moment.",
                    "success": False,
                }
            ),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json",
        )
