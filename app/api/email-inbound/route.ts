export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Verify Resend webhook signature
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  const signature = request.headers.get('svix-signature');
  const timestamp = request.headers.get('svix-timestamp');
  const webhookId = request.headers.get('svix-id');
  
  // If no signature headers, check for a shared secret as fallback
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    // No secret configured - log warning but allow (for backwards compatibility)
    // In production, you should ALWAYS configure RESEND_WEBHOOK_SECRET
    console.warn('RESEND_WEBHOOK_SECRET not configured - webhook verification skipped');
    return true;
  }
  
  if (!signature || !timestamp || !webhookId) {
    console.error('Missing webhook signature headers');
    return false;
  }
  
  // Verify timestamp is within 5 minutes
  const timestampMs = parseInt(timestamp) * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    console.error('Webhook timestamp too old');
    return false;
  }
  
  // Verify signature using HMAC-SHA256
  try {
    const signedPayload = `${webhookId}.${timestamp}.${body}`;
    const encoder = new TextEncoder();
    
    // Decode base64 secret
    const secretBytes = Uint8Array.from(atob(webhookSecret.replace('whsec_', '')), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    // Check if any of the provided signatures match
    const signatures = signature.split(' ').map(s => s.replace('v1,', ''));
    return signatures.some(sig => sig === expectedSignature);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Resend Inbound webhook
export async function POST(request: NextRequest) {
  try {
    // Read body as text for signature verification
    const bodyText = await request.text();
    
    // ===========================================
    // SECURITY FIX: Verify webhook signature
    // ===========================================
    const isValid = await verifyWebhookSignature(request, bodyText);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
    
    const body = JSON.parse(bodyText);
    
    // Resend sends: from, to, subject, text, html, headers, etc.
    const { from, subject, text, html } = body;
    
    // Extract sender email
    const fromEmail = typeof from === 'string' ? from : from?.email || 'unknown';
    const fromName = typeof from === 'object' ? from?.name : null;
    
    // Basic validation
    if (!fromEmail || fromEmail === 'unknown') {
      return NextResponse.json({ error: 'Invalid sender' }, { status: 400 });
    }
    
    // Store in feedback table
    const { error } = await supabaseAdmin
      .from('feedback')
      .insert({
        from_name: fromName || fromEmail,
        from_email: fromEmail,
        message: `[EMAIL] Subject: ${subject || 'No subject'}\n\n${text || html || 'Empty email'}`,
        status: 'new'
      });

    if (error) {
      console.error('Failed to store email:', error);
      return NextResponse.json({ error: 'Failed to store' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email received' });
  } catch (e) {
    console.error('Email webhook error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'email-inbound',
    note: 'POST emails to this endpoint via Resend webhook'
  });
}
