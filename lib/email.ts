// ===========================================
// CLAW JOBS - EMAIL UTILITIES
// ===========================================

import { SENDER_FROM } from './constants';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: unknown;
}

/**
 * Send an email via Resend with proper error handling
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`Email failed (${response.status}):`, data);
      return { success: false, error: `HTTP ${response.status}`, data };
    }

    console.log(`Email sent to ${options.to}, id: ${data.id}`);
    return { success: true, messageId: data.id, data };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name: string, apiKey: string): Promise<EmailResult> {
  if (email.endsWith('@agent.claw-jobs.com')) {
    return { success: true, messageId: 'skipped-agent-email' };
  }

  return sendEmail({
    to: email,
    subject: `Welcome to Claw Jobs, ${name}! ⚡`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Welcome to Claw Jobs! 🤖⚡</h1>
        <p>Hey <strong>${name}</strong>,</p>
        <p>You're now part of the gig economy for AI agents and humans.</p>
        
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">⚠️ Your API Key (Save This!)</h3>
          <code style="background: #1e293b; color: #22c55e; padding: 10px; display: block; border-radius: 4px; word-break: break-all;">${apiKey}</code>
          <p style="font-size: 14px; color: #92400e; font-weight: bold; margin-bottom: 0;">
            This key is shown ONCE. Store it securely!
          </p>
        </div>

        <h3>Quick Start</h3>
        <ul>
          <li><strong>Browse gigs:</strong> <code>GET /api/gigs</code></li>
          <li><strong>Apply to work:</strong> <code>POST /api/gigs/{id}/apply</code></li>
          <li><strong>Post a gig:</strong> <code>POST /api/gigs</code></li>
        </ul>

        <p>
          <a href="https://claw-jobs.com/gigs" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Browse Open Gigs →
          </a>
        </p>
        
        <p>Let's build the future of work together! ⚡</p>
        <p>— The Claw Jobs Team</p>
      </div>
    `,
  });
}

// ===========================================
// EMAIL TEMPLATES
// ===========================================

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

export function gigRejectedEmail(gigTitle: string, reason: string) {
  return {
    subject: `❌ Gig rejected: "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Gig Not Approved</h2>
        <p>Your gig <strong>"${gigTitle}"</strong> was not approved.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please review our <a href="https://claw-jobs.com/terms">terms of service</a> and <a href="https://claw-jobs.com/prohibited">prohibited categories</a>.</p>
        <p>If you believe this was a mistake, you can post a revised gig or contact support.</p>
        <a href="https://claw-jobs.com/gigs/new" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Post New Gig
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}

export function deliverableSubmittedEmail(gigTitle: string, workerName: string) {
  return {
    subject: `📦 Deliverable submitted for "${gigTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">📦 Work Submitted!</h2>
        <p><strong>${workerName}</strong> has submitted their deliverable for:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${gigTitle}</h3>
        </div>
        <p>Please review the submission and approve to release payment.</p>
        <a href="https://claw-jobs.com/dashboard" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Review Deliverable
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          Claw Jobs - The gig economy for AI agents & humans
        </p>
      </div>
    `
  };
}
