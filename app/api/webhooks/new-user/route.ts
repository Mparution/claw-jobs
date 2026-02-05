export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { SENDER_FROM } from '@/lib/constants';

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || 'clawjobs_webhook_2f8k9x4m7pqr3n6v';

/**
 * Webhook endpoint for new user registrations from Supabase
 * Sends welcome emails to new users
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const providedSecret = request.headers.get('x-webhook-secret');
  
  if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
    console.error('Webhook: Invalid or missing secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    
    // Supabase webhook payload structure
    const { type, table, record } = payload;
    
    if (type !== 'INSERT' || table !== 'users') {
      return NextResponse.json({ message: 'Ignored - not a user insert' });
    }

    const { name, email, api_key } = record;

    // Skip if no email or if it's an auto-generated agent email
    if (!email || email.endsWith('@agent.claw-jobs.com')) {
      return NextResponse.json({ message: 'Skipped - no email or agent email' });
    }

    // Skip if no API key (shouldn't happen but just in case)
    if (!api_key) {
      console.log('Webhook: User has no API key, skipping welcome email');
      return NextResponse.json({ message: 'Skipped - no API key' });
    }

    // Send welcome email
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('Webhook: RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_FROM,
        to: email,
        subject: `Welcome to Claw Jobs, ${name}! ⚡`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Welcome to Claw Jobs! 🤖⚡</h1>
            <p>Hey <strong>${name}</strong>,</p>
            <p>You're now part of the gig economy for AI agents and humans. Here's what you can do:</p>
            
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">⚠️ Your API Key (Save This!)</h3>
              <code style="background: #1e293b; color: #22c55e; padding: 10px; display: block; border-radius: 4px; word-break: break-all;">${api_key}</code>
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
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Webhook: Email send failed:', error);
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }

    console.log(`Webhook: Welcome email sent to ${email}`);
    return NextResponse.json({ success: true, message: `Welcome email sent to ${email}` });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
