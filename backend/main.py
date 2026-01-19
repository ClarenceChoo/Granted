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

        # Build the email HTML
        grants_html = ""
        for index, grant in enumerate(top_grants, 1):
            match_score = grant.matchScore or 0
            
            # Build grant details grid
            details_grid = ""
            if grant.quantum:
                details_grid += f'''<div>
                <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Grant Amount</div>
                <div style="font-size: 16px; font-weight: 700; color: #059669;">{grant.quantum}</div>
              </div>'''
            
            if grant.deadline:
                details_grid += f'''<div>
                <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Deadline</div>
                <div style="font-size: 16px; font-weight: 700; color: #dc2626;">{grant.deadline}</div>
              </div>'''
            
            # Build sectors badges
            sectors_html = ""
            if grant.sectors:
                sector_badges = "".join([
                    f'<span style="background: #f0f9ff; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe;">{sector}</span>'
                    for sector in grant.sectors
                ])
                sectors_html = f'''<div style="margin-bottom: 16px;">
              <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Applicable Sectors</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                {sector_badges}
              </div>
            </div>'''
            
            grants_html += f'''
        <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 8px;">Match #{index}</div>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">{grant.name}</h3>
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700;">{match_score}%</div>
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Match Score</div>
              </div>
            </div>
          </div>
          
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">FUNDING AGENCY</div>
              <div style="font-size: 16px; font-weight: 600; color: #1f2937;">{grant.agency}</div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">DESCRIPTION</div>
              <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">{grant.description}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
              {details_grid}
            </div>
            
            {sectors_html}
            
            <div style="margin-top: 20px;">
              <a href="https://granted.app/grant/{grant.id}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                View Full Details →
              </a>
            </div>
          </div>
        </div>
      '''

        html = f'''<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.5; color: #1f2937; }}
          a {{ color: #667eea; text-decoration: none; }}
          a:hover {{ text-decoration: underline; }}
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 24px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">✨ Your Grant Matches</div>
            <div style="font-size: 16px; opacity: 0.95;">Personalized recommendations for {request.organization.name}</div>
          </div>
          
          <div style="padding: 40px 24px;">
            
            <div style="margin-bottom: 32px;">
              <p style="font-size: 16px; color: #4b5563; margin: 0 0 12px 0;">Hi,</p>
              <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0;">We've analyzed our grant database and found the top 3 grants that match your organization's profile. These opportunities align with your sector (<strong>{request.organization.sector}</strong>) and mission focus.</p>
            </div>
            
            <div>{grants_html}</div>
            
            <div style="background: #f0f9ff; border-left: 4px solid #0369a1; padding: 16px; border-radius: 8px; margin-top: 32px;">
              <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px;">Why These Matches?</div>
              <div style="font-size: 14px; color: #0c4a6e; line-height: 1.6;">
                Our matching algorithm analyzes sector alignment, mission keywords, and grant requirements to find the best opportunities for your organization. Higher match scores indicate better alignment with your profile.
              </div>
            </div>
            
          </div>
          
          <div style="background: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 13px; color: #9ca3af; margin: 0 0 12px 0;">Questions about these grants? Visit our platform for more details.</p>
            <p style="font-size: 12px; color: #d1d5db; margin: 0;">
              Granted • Making Grant Discovery Simple
            </p>
          </div>
          
        </div>
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


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
