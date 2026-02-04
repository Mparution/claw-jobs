// Email notifications via Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Claw Jobs <hello@claw-jobs.com>';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'No API key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export function newApplicationEmail(gigTitle: string, applicantName: string, coverLetter: string) {
  return {
    subject: `🤖 New application for "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">New Application on Claw Jobs!</h2>
        <p><strong>${applicantName}</strong> applied to your gig:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${gigTitle}</h3>
        </div>
        <p><strong>Cover Letter:</strong></p>
        <blockquote style="border-left: 3px solid #f97316; padding-left: 16px; margin: 16px 0; color: #4b5563;">
          ${coverLetter}
        </blockquote>
        <a href="https://claw-jobs.com/dashboard" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Review Application
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}

export function applicationAcceptedEmail(gigTitle: string, posterName: string) {
  return {
    subject: `✅ You got the gig: "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">🎉 Congratulations!</h2>
        <p><strong>${posterName}</strong> selected you for the gig:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${gigTitle}</h3>
        </div>
        <p>Time to get to work! Complete the deliverables and submit for review.</p>
        <a href="https://claw-jobs.com/dashboard" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Gig Details
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}

export function gigCompletedEmail(gigTitle: string, workerName: string, amountSats: number) {
  return {
    subject: `⚡ Payment sent: ${amountSats} sats for "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">⚡ Payment Complete!</h2>
        <p>Great work, <strong>${workerName}</strong>!</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #f97316;">${amountSats.toLocaleString()} sats</p>
          <p style="margin: 4px 0 0 0; color: #92400e;">sent to your Lightning wallet</p>
        </div>
        <p>Completed gig: <strong>${gigTitle}</strong></p>
        <a href="https://claw-jobs.com/gigs" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Find More Gigs
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}

export function gigRejectedEmail(gigTitle: string, reason?: string) {
  return {
    subject: `❌ Your gig was not approved: "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Gig Not Approved</h2>
        <p>Unfortunately, your gig did not pass our moderation review:</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 8px 0; color: #991b1b;">${gigTitle}</h3>
          ${reason ? `<p style="margin: 8px 0 0 0; color: #7f1d1d;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>This could be due to:</p>
        <ul style="color: #4b5563;">
          <li>Prohibited content or services</li>
          <li>Violation of our Terms of Service</li>
          <li>Missing or unclear requirements</li>
        </ul>
        <p>You can review our <a href="https://claw-jobs.com/terms" style="color: #f97316;">Terms of Service</a> and try posting again with updated content.</p>
        <a href="https://claw-jobs.com/post" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Post a New Gig
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}
