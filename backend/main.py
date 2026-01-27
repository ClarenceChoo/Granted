from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from dotenv import load_dotenv
import resend

# Load environment variables from backend/.env (so you don't need to export each time)
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Resend API key
RESEND_API_KEY = os.getenv("VITE_RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


# Pydantic models
class GrantData(BaseModel):
    id: str
    name: str
    agency: str
    description: str
    quantum: Optional[str] = None
    deadline: Optional[str] = None
    sectors: list[str]
    matchScore: Optional[int] = None


class OrganizationData(BaseModel):
    name: str
    sector: str
    mission: str


class SendGrantEmailRequest(BaseModel):
    email: EmailStr
    organization: OrganizationData
    grants: list[GrantData]


class EmailResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@app.get("/")
async def root():
    return {"message": "Granted Backend API"}


@app.post("/api/send-grant-email", response_model=EmailResponse)
async def send_grant_email(request: SendGrantEmailRequest):
    """Send an email with top grant matches to the user."""
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Resend API key not configured")
    
    try:
        # Get top 3 grants
        top_grants = request.grants[:3]

        # Build the email HTML using table-based markup for compatibility
        grants_html = ""
        for index, grant in enumerate(top_grants, 1):
            match_score = grant.matchScore or 0

            sectors_html = ""
            if grant.sectors:
                sector_badges = "".join([
                    f'<span style="display:inline-block; margin-right:6px; margin-bottom:6px; background:#eef2ff; color:#3730a3; padding:6px 10px; border-radius:6px; font-weight:600; font-size:12px;">{sector}</span>'
                    for sector in grant.sectors
                ])
                sectors_html = f'''<div style="margin-top:12px;"><div style="font-size:12px; color:#9ca3af; font-weight:600; text-transform:uppercase; margin-bottom:8px;">Applicable Sectors</div><div>{sector_badges}</div></div>'''

            details_row = f""
            if grant.quantum or grant.deadline:
                details_row = f'''<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse; margin-top:8px;"><tr><td style="font-size:12px; color:#9ca3af; font-weight:600; text-transform:uppercase; padding-bottom:6px;">{('Grant Amount' if grant.quantum else '')}</td><td style="font-size:12px; color:#9ca3af; font-weight:600; text-transform:uppercase; padding-bottom:6px; text-align:right;">{('Deadline' if grant.deadline else '')}</td></tr><tr><td style="font-size:15px; color:#059669; font-weight:700;">{grant.quantum or ''}</td><td style="font-size:15px; color:#dc2626; font-weight:700; text-align:right;">{grant.deadline or ''}</td></tr></table>'''

            grants_html += f'''
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse; margin-bottom:18px; border:1px solid #e5e7eb; border-radius:8px; background:#ffffff;">
          <tr>
            <td style="background-color:#6b46c1; color:#ffffff; padding:16px; text-align:left;">
              <div style="font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:6px;">Match #{index}</div>
              <div style="font-size:18px; font-weight:700;">{grant.name}</div>
            </td>
            <td style="background-color:#6b46c1; color:#ffffff; padding:16px; text-align:right; vertical-align:middle; width:140px;">
              <div style="display:inline-block; background-color:rgba(255,255,255,0.12); padding:8px 12px; border-radius:6px;"><div style="font-size:22px; font-weight:700;">{match_score}%</div><div style="font-size:11px; font-weight:600; text-transform:uppercase; opacity:0.9;">Match Score</div></div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:14px;">
              <div style="font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; margin-bottom:6px;">Funding Agency</div>
              <div style="font-size:15px; font-weight:600; color:#111827; margin-bottom:10px;">{grant.agency}</div>
              <div style="font-size:13px; color:#374151; line-height:1.5; margin-bottom:10px;">{grant.description}</div>
              {details_row}
              {sectors_html}
              <div style="margin-top:12px;"><a href="https://granted.app/grant/{grant.id}" style="background-color:#6b46c1; color:#ffffff; padding:10px 14px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">View Full Details →</a></div>
            </td>
          </tr>
        </table>
        '''

        html = f'''<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin:0; padding:0; }}
          a {{ color: #6b46c1; text-decoration:none; }}
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
          <tr>
            <td align="center" style="padding:20px 10px;">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse; background:#ffffff; border-radius:8px; overflow:hidden;">
                <tr>
                  <td style="background-color:#6b46c1; color:#ffffff; text-align:center; padding:28px 18px;">
                    <div style="font-size:22px; font-weight:700;">✨ Your Grant Matches</div>
                    <div style="font-size:14px; opacity:0.95; margin-top:6px;">Personalized recommendations for {request.organization.name}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0; font-size:15px; color:#374151;">Hi,</p>
                    <p style="margin:0 0 16px 0; font-size:14px; color:#6b7280; line-height:1.5;">We've analyzed our grant database and found the top 3 grants that match your organization's profile. These opportunities align with your sector (<strong>{request.organization.sector}</strong>) and mission focus.</p>
                    {grants_html}
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse; margin-top:12px; background:#f0f9ff; border-left:4px solid #0369a1; border-radius:6px;">
                      <tr>
                        <td style="padding:12px 14px;"><div style="font-weight:600; color:#0369a1; margin-bottom:8px;">Why These Matches?</div><div style="font-size:13px; color:#0c4a6e; line-height:1.5;">Our matching algorithm analyzes sector alignment, mission keywords, and grant requirements to find the best opportunities for your organization. Higher match scores indicate better alignment with your profile.</div></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb; padding:16px; text-align:center; border-top:1px solid #e5e7eb; font-size:13px; color:#9ca3af;">Questions about these grants? Visit our platform for more details.<br /><span style="color:#c6c6c6; font-size:12px;">Granted • Making Grant Discovery Simple</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>'''

        # Send email via Resend
        response = resend.Emails.send(
            {
                "from": "onboarding@resend.dev",
                "to": request.email,
                "subject": f"🎉 Your Top 3 Grant Matches - {request.organization.name}",
                "html": html,
            }
        )

        if response and hasattr(response, 'id'):
            return EmailResponse(
                success=True,
                message="Email sent successfully!",
                data={"email_id": response.id},
            )
        else:
            return EmailResponse(
                success=False,
                message="Failed to send email",
                data=None,
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")


# Gemini Integration
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatRefineRequest(BaseModel):
    mission: str
    sector: str

class ChatRefineResponse(BaseModel):
    refinedMission: str
    suggestions: dict

@app.post("/api/chat-refine", response_model=ChatRefineResponse)
async def chat_refine(request: ChatRefineRequest):
    """
    Uses Gemini to refine the mission statement and generate suggestions.
    """
    if not GEMINI_API_KEY:
        # Fallback to mock if no key
        return ChatRefineResponse(
            refinedMission=f"{request.mission} (AI Enhancement Unavailable - No Key)",
            suggestions={
                "headline": "AI Suggestion Unavailable",
                "blurb": "Please configure GEMINI_API_KEY in backend/.env to see real AI suggestions.",
                "suggestedMission": request.mission
            }
        )

    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        prompt = f"""
        Act as a professional grant writer for a Singapore non-profit in the '{request.sector}' sector.
        
        The user has provided this rough mission statement: "{request.mission}"
        
        Task 1: Rewrite this mission statement to be more professional, impactful, and grant-ready. Keep it under 50 words.
        
        Task 2: Suggest a personalized "Grant Opportunity Strategy" blurb (2-3 sentences) explaining what kind of grants they should target.
        
        Return the output purely as a JSON object with this structure:
        {{
            "refined_mission": "...",
            "strategy_blurb": "..."
        }}
        Do not include markdown formatting like ```json. Just the raw JSON string.
        """
        
        response = model.generate_content(prompt)
        # Simple cleanup if the model adds backticks
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        
        import json
        data = json.loads(cleaned_text)
        
        return ChatRefineResponse(
            refinedMission=data.get("refined_mission", request.mission),
            suggestions={
                "headline": f"AI Strategy for {request.sector}",
                "blurb": data.get("strategy_blurb", "Focus on community impact and sustainable growth."),
                "suggestedMission": data.get("refined_mission", request.mission)
            }
        )
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback on error
        return ChatRefineResponse(
            refinedMission=request.mission,
            suggestions={
                "headline": "AI Service Temporarily Unavailable",
                "blurb": "We couldn't generate a custom strategy right now, but your mission has been saved.",
                "suggestedMission": request.mission
            }
        )


# Free-form AI Chat Endpoint
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context: Optional[dict] = None  # Organization profile context

class ChatResponse(BaseModel):
    response: str
    success: bool

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Free-form AI chat endpoint for grant-related questions.
    """
    if not GEMINI_API_KEY:
        return ChatResponse(
            response="AI chat is not available. Please configure GEMINI_API_KEY.",
            success=False
        )

    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Build context from organization profile
        org_context = ""
        if request.context:
            org_context = f"""
            The user is from an organization with the following profile:
            - Name: {request.context.get('name', 'Unknown')}
            - Sector: {request.context.get('sector', 'Unknown')}
            - Mission: {request.context.get('mission', 'Not specified')}
            - UEN: {request.context.get('uen', 'Not specified')}
            """
        
        # Build conversation history
        history_text = ""
        for msg in request.history[-10:]:  # Keep last 10 messages for context
            role = "User" if msg.role == "user" else "Assistant"
            history_text += f"{role}: {msg.content}\n"
        
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

User's current message: {request.message}

Respond helpfully:"""

        response = model.generate_content(system_prompt)
        
        return ChatResponse(
            response=response.text,
            success=True
        )
        
    except Exception as e:
        print(f"Chat API Error: {e}")
        return ChatResponse(
            response="I'm having trouble connecting right now. Please try again in a moment.",
            success=False
        )


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
