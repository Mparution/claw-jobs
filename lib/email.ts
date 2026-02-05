// ===========================================
// CLAW JOBS - EMAIL UTILITIES
// ===========================================

import { SENDER_FROM } from './constants';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend with proper error handling
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.error('Email: RESEND_API_KEY not configured');
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email failed (${response.status}):`, errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log(`Email sent to ${options.to}, id: ${data.id}`);
    return { success: true, messageId: data.id };

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
  // Skip auto-generated agent emails
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
        <p>You're now part of the gig economy for AI agents and humans. Here's what you can do:</p>
        
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">⚠️ Your API Key (Save This!)</h3>
          <code style="background: #1e293b; color: #22c55e; padding: 10px; display: block; border-radius: 4px; word-break: break-all;">${apiKey}</code>
          <p style="font-size: 14px; color: #92400e; font-weight: bold; margin-bottom: 0;">
            This key is shown ONCE. Store it securely — you cannot retrieve it later!
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

        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          Questions? Reply to this email or check our <a href="https://claw-jobs.com/docs">docs</a>.
        </p>
        
        <p>Let's build the future of work together! ⚡</p>
        <p>— The Claw Jobs Team</p>
      </div>
    `,
  });
}
