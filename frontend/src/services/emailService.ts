import type { Grant, Organization } from '../types';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send email via backend API (avoids CORS issues)
 */
export const sendEmail = async (payload: EmailPayload) => {
  try {
    const response = await fetch('http://localhost:8000/api/send-grant-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: Array.isArray(payload.to) ? payload.to[0] : payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send email');
    }

    const data = await response.json();
    return {
      success: data.success,
      data: data.data,
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};

// Helper function for specific use cases (e.g., grant notifications)
export const sendGrantNotification = async (
  email: string,
  grantTitle: string,
  grantLink: string
) => {
  const html = `
    <h2>New Grant Match: ${grantTitle}</h2>
    <p>We found a grant that matches your profile!</p>
    <a href="${grantLink}">View Grant Details</a>
  `;

  return sendEmail({
    to: email,
    subject: `Grant Alert: ${grantTitle}`,
    html,
  });
};

// Send top 3 grant matches with beautiful HTML email
export const sendTopGrantMatches = async (
  email: string,
  organization: Organization,
  topGrants: Grant[]
) => {
  const top3Grants = topGrants.slice(0, 3);
  
  const grantsHTML = top3Grants
    .map((grant, index) => {
      const matchPercentage = grant.matchScore || 0;
      const position = index + 1;
      
      return `
        <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Grant Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 8px;">Match #${position}</div>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">${grant.name}</h3>
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700;">${matchPercentage}%</div>
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Match Score</div>
              </div>
            </div>
          </div>
          
          <!-- Grant Body -->
          <div style="padding: 20px;">
            <!-- Agency Info -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">FUNDING AGENCY</div>
              <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${grant.agency}</div>
            </div>
            
            <!-- Description -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">DESCRIPTION</div>
              <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">${grant.description}</div>
            </div>
            
            <!-- Grant Details Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
              ${grant.quantum ? `
                <div>
                  <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Grant Amount</div>
                  <div style="font-size: 16px; font-weight: 700; color: #059669;">${grant.quantum}</div>
                </div>
              ` : ''}
              ${grant.deadline ? `
                <div>
                  <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Deadline</div>
                  <div style="font-size: 16px; font-weight: 700; color: #dc2626;">${grant.deadline}</div>
                </div>
              ` : ''}
            </div>
            
            <!-- Sectors -->
            ${grant.sectors && grant.sectors.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Applicable Sectors</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${grant.sectors
                    .map(
                      sector => `
                    <span style="background: #f0f9ff; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe;">
                      ${sector}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- CTA Button -->
            <div style="margin-top: 20px;">
              <a href="https://granted.app/grant/${grant.id}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s, box-shadow 0.2s;">
                View Full Details →
              </a>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.5; color: #1f2937; }
          a { color: #667eea; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 24px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">✨ Your Grant Matches</div>
            <div style="font-size: 16px; opacity: 0.95;">Personalized recommendations for ${organization.name}</div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 24px;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 32px;">
              <p style="font-size: 16px; color: #4b5563; margin: 0 0 12px 0;">Hi,</p>
              <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0;">We've analyzed our grant database and found the top 3 grants that match your organization's profile. These opportunities align with your sector (<strong>${organization.sector}</strong>) and mission focus.</p>
            </div>
            
            <!-- Grants -->
            <div>${grantsHTML}</div>
            
            <!-- Why These Matches -->
            <div style="background: #f0f9ff; border-left: 4px solid #0369a1; padding: 16px; border-radius: 8px; margin-top: 32px;">
              <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px;">Why These Matches?</div>
              <div style="font-size: 14px; color: #0c4a6e; line-height: 1.6;">
                Our matching algorithm analyzes sector alignment, mission keywords, and grant requirements to find the best opportunities for your organization. Higher match scores indicate better alignment with your profile.
              </div>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 13px; color: #9ca3af; margin: 0 0 12px 0;">Questions about these grants? Visit our platform for more details.</p>
            <p style="font-size: 12px; color: #d1d5db; margin: 0;">
              Granted • Making Grant Discovery Simple
            </p>
          </div>
          
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Your Top 3 Grant Matches - ${organization.name}`,
    html,
  });
};

// POST top grants to backend endpoint in the format it expects
export const sendTopGrantMatches_viaApi = async (
  email: string,
  organization: Organization,
  topGrants: Grant[]
) => {
  const top3Grants = topGrants.slice(0, 3);

  try {
    const res = await fetch('http://localhost:8000/api/send-grant-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        organization: {
          name: organization.name,
          sector: organization.sector,
          mission: organization.mission || '',
        },
        grants: top3Grants.map(g => ({
          id: g.id,
          name: g.name,
          agency: g.agency,
          description: g.description,
          quantum: g.quantum || null,
          deadline: g.deadline || null,
          sectors: g.sectors || [],
          matchScore: g.matchScore || 0,
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = data.detail || data.message || JSON.stringify(data);
      throw new Error(detail);
    }

    return {
      success: true,
      data: data.data || null,
    };
  } catch (err) {
    console.error('Email sending failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

