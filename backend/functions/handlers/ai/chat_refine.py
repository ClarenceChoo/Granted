"""
HTTP function for AI-powered mission statement refinement using OpenAI.
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
class MissionRefineOutput(BaseModel):
    refined_mission: str
    strategy_blurb: str


def get_cors_headers():
    """Return CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


@https_fn.on_request(secrets=["OPENAI_API_KEY"])
def chat_refine(req: https_fn.Request) -> https_fn.Response:
    """
    Uses OpenAI to refine the mission statement and generate grant strategy suggestions.
    
    POST body:
    {
        "mission": "Our rough mission statement...",
        "sector": "Social Services"
    }
    
    Returns:
    {
        "refinedMission": "Professional mission statement...",
        "suggestions": {
            "headline": "AI Strategy for Social Services",
            "blurb": "Strategy recommendations...",
            "suggestedMission": "..."
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
        request_data = req.get_json(silent=True)
        logger.info(f"Received refine request with method: {req.method}")
        if not request_data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        mission = request_data.get("mission", "")
        sector = request_data.get("sector", "")
        
        logger.info(f"Mission length: {len(mission)}, Sector: {sector}")
        
        if not mission:
            return https_fn.Response(
                response=json.dumps({"error": "Mission statement is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Get API key from secret
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            api_key = api_key.strip()  # Remove any trailing whitespace/newlines
        
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured")
            return https_fn.Response(
                response=json.dumps({
                    "refinedMission": f"{mission} (AI Enhancement Unavailable - No Key)",
                    "suggestions": {
                        "headline": "AI Suggestion Unavailable",
                        "blurb": "Please configure OPENAI_API_KEY to see real AI suggestions.",
                        "suggestedMission": mission
                    }
                }),
                status=200,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        # Configure OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Load and format prompt template
        prompt_template = PROMPTS["chat_refine"]["template"]
        prompt = prompt_template.format(sector=sector, mission=mission)
        
        logger.info(f"Calling OpenAI with prompt length: {len(prompt)}")
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a {PROMPTS['chat_refine']['system_role']}."},
                {"role": "user", "content": prompt}
            ],
            response_format=MissionRefineOutput,
            temperature=0.7,
            max_tokens=500
        )
        
        # Extract structured response
        data = completion.choices[0].message.parsed
        logger.info(f"Received structured response: refined_mission length={len(data.refined_mission)}")
        
        result = {
            "refinedMission": data.refined_mission,
            "suggestions": {
                "headline": f"AI Strategy for {sector}",
                "blurb": data.strategy_blurb,
                "suggestedMission": data.refined_mission
            }
        }
        
        logger.info(f"Successfully refined mission for sector: {sector}")
        
        return https_fn.Response(
            response=json.dumps(result),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error in chat_refine: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        fallback_mission = request_data.get("mission", "") if 'request_data' in locals() else ""
        return https_fn.Response(
            response=json.dumps({
                "refinedMission": fallback_mission,
                "suggestions": {
                    "headline": "AI Service Temporarily Unavailable",
                    "blurb": "We couldn't generate a custom strategy right now, but your mission has been saved.",
                    "suggestedMission": fallback_mission
                }
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
