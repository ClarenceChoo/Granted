"""
HTTP function for AI-powered mission statement refinement.
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
        if not request_data:
            return https_fn.Response(
                response=json.dumps({"error": "Request body is required"}),
                status=400,
                headers=get_cors_headers(),
                mimetype="application/json"
            )
        
        mission = request_data.get("mission", "")
        sector = request_data.get("sector", "")
        
        if not mission:
            return https_fn.Response(
                response=json.dumps({"error": "Mission statement is required"}),
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
        
        # ============================================
        # OpenAI Implementation
        # ============================================
        client = OpenAI(api_key=api_key)
        
        prompt = f"""Act as a professional grant writer for a Singapore non-profit in the '{sector}' sector.

The user has provided this rough mission statement: "{mission}"

Task 1: Rewrite this mission statement to be more professional, impactful, and grant-ready. Keep it under 50 words.

Task 2: Suggest a personalized "Grant Opportunity Strategy" blurb (2-3 sentences) explaining what kind of grants they should target.

Return the output purely as a JSON object with this structure:
{{
    "refined_mission": "...",
    "strategy_blurb": "..."
}}
Do not include markdown formatting like ```json. Just the raw JSON string."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful grant writing assistant. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        response_text = response.choices[0].message.content
        
        # ============================================
        # Gemini Implementation (commented out)
        # ============================================
        # genai.configure(api_key=api_key)
        # model = genai.GenerativeModel('gemini-2.0-flash-lite')
        # response = model.generate_content(prompt)
        # response_text = response.text
        
        # Clean up response
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        
        result = {
            "refinedMission": data.get("refined_mission", mission),
            "suggestions": {
                "headline": f"AI Strategy for {sector}",
                "blurb": data.get("strategy_blurb", "Focus on community impact and sustainable growth."),
                "suggestedMission": data.get("refined_mission", mission)
            }
        }
        
        logger.info(f"Successfully refined mission for sector: {sector}")
        
        return https_fn.Response(
            response=json.dumps(result),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        return https_fn.Response(
            response=json.dumps({
                "refinedMission": mission,
                "suggestions": {
                    "headline": "AI Service Temporarily Unavailable",
                    "blurb": "We couldn't generate a custom strategy right now, but your mission has been saved.",
                    "suggestedMission": mission
                }
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
        
    except Exception as e:
        logger.error(f"Error in chat_refine: {e}")
        return https_fn.Response(
            response=json.dumps({
                "refinedMission": request_data.get("mission", ""),
                "suggestions": {
                    "headline": "AI Service Temporarily Unavailable",
                    "blurb": "We couldn't generate a custom strategy right now, but your mission has been saved.",
                    "suggestedMission": request_data.get("mission", "")
                }
            }),
            status=200,
            headers=get_cors_headers(),
            mimetype="application/json"
        )
