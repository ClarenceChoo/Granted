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
  
  // Use table-based markup and simple inline styles for better email client compatibility
  const grantsHTML = top3Grants
    .map((grant, index) => {
      const matchPercentage = grant.matchScore || 0;
      const position = index + 1;

      return `
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <tr>
            <td style="background-color: #6b46c1; color: #ffffff; padding: 18px; text-align: left;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; opacity: 0.95; margin-bottom: 6px;">Match #${position}</div>
              <div style="font-size: 18px; font-weight: 700; line-height: 1.2;">${grant.name}</div>
            </td>
            <td style="background-color: #6b46c1; color: #ffffff; padding: 18px; text-align: right; vertical-align: middle; width:140px;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.12); padding: 8px 12px; border-radius: 6px;">
                <div style="font-size: 22px; font-weight: 700;">${matchPercentage}%</div>
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; opacity: 0.9;">Match Score</div>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 16px;">
              <div style="margin-bottom: 12px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Funding Agency</div>
              <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 12px;">${grant.agency}</div>

              <div style="font-size: 13px; color: #374151; line-height: 1.5; margin-bottom: 12px;">${grant.description}</div>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; margin-top: 8px;">
                <tr>
                  <td style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; padding-bottom: 6px;">${grant.quantum ? 'Grant Amount' : ''}</td>
                  <td style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; padding-bottom: 6px; text-align: right;">${grant.deadline ? 'Deadline' : ''}</td>
                </tr>
                <tr>
                  <td style="font-size: 15px; color: #059669; font-weight: 700;">${grant.quantum || ''}</td>
                  <td style="font-size: 15px; color: #dc2626; font-weight: 700; text-align: right;">${grant.deadline || ''}</td>
                </tr>
              </table>

              ${grant.sectors && grant.sectors.length > 0 ? `
                <div style="margin-top: 12px;">
                  <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Applicable Sectors</div>
                  <div style="font-size: 12px;">
                    ${grant.sectors.map(s => `<span style="display:inline-block; margin-right:6px; margin-bottom:6px; background:#eef2ff; color:#3730a3; padding:6px 10px; border-radius:6px; font-weight:600; font-size:12px;">${s}</span>`).join('')}
                  </div>
                </div>
              ` : ''}

              <div style="margin-top: 14px;">
                <a href="https://granted.app/grant/${grant.id}" style="background-color:#6b46c1; color:#ffffff; padding:10px 16px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600;">View Full Details →</a>
              </div>
            </td>
          </tr>
        </table>
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
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin:0; padding:0; }
          a { color: #6b46c1; }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 20px 10px;">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; background:#ffffff; border-radius:8px; overflow:hidden;">
                <tr>
                  <td style="background-color:#6b46c1; color:#ffffff; text-align:center; padding:36px 20px;">
                    <div style="font-size:24px; font-weight:700;">✨ Your Grant Matches</div>
                    <div style="font-size:14px; opacity:0.95; margin-top:6px;">Personalized recommendations for ${organization.name}</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px 20px;">
                    <p style="margin:0 0 12px 0; font-size:15px; color:#374151;">Hi,</p>
                    <p style="margin:0 0 18px 0; font-size:14px; color:#6b7280; line-height:1.5;">We've analyzed our grant database and found the top 3 grants that match your organization's profile. These opportunities align with your sector (<strong>${organization.sector}</strong>) and mission focus.</p>

                    ${grantsHTML}

                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; margin-top: 16px; background:#f0f9ff; border-left:4px solid #0369a1; border-radius:6px;">
                      <tr>
                        <td style="padding:12px 14px;">
                          <div style="font-weight:600; color:#0369a1; margin-bottom:8px;">Why These Matches?</div>
                          <div style="font-size:13px; color:#0c4a6e; line-height:1.5;">Our matching algorithm analyzes sector alignment, mission keywords, and grant requirements to find the best opportunities for your organization. Higher match scores indicate better alignment with your profile.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f9fafb; padding:16px 20px; text-align:center; border-top:1px solid #e5e7eb; font-size:13px; color:#9ca3af;">
                    Questions about these grants? Visit our platform for more details.<br />
                    <span style="color:#c6c6c6; font-size:12px;">Granted • Making Grant Discovery Simple</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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

