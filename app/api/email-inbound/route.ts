export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Resend webhook signature verification
// Resend uses svix for webhook signing: https://docs.resend.com/webhooks
async function verifyResendSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  // If no secret configured, reject all requests in production
  if (!webhookSecret) {
    console.error('[EMAIL-INBOUND] RESEND_WEBHOOK_SECRET not configured');
    // In development, allow unverified requests with a warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('[EMAIL-INBOUND] Allowing unverified webhook in development');
      return true;
    }
    return false;
  }

  // Resend uses Svix for signing - signature is in svix-signature header
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('[EMAIL-INBOUND] Missing svix headers');
    return false;
  }

  // Verify timestamp is recent (within 5 minutes)
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.error('[EMAIL-INBOUND] Timestamp too old or in future');
    return false;
  }

  // Construct signed payload: "msgId.timestamp.body"
  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;

  // Parse signature header (format: "v1,signature1 v1,signature2")
  const signatures = svixSignature.split(' ').map(sig => {
    const [version, hash] = sig.split(',');
    return { version, hash };
  });

  // Only process v1 signatures
  const v1Signatures = signatures.filter(s => s.version === 'v1');
  if (v1Signatures.length === 0) {
    console.error('[EMAIL-INBOUND] No v1 signature found');
    return false;
  }

  // Compute expected signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(webhookSecret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // Constant-time comparison against all provided signatures
  for (const sig of v1Signatures) {
    if (sig.hash && sig.hash.length === expectedSignature.length) {
      let match = 0;
      for (let i = 0; i < expectedSignature.length; i++) {
        match |= sig.hash.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
      }
      if (match === 0) return true;
    }
  }

  console.error('[EMAIL-INBOUND] Signature verification failed');
  return false;
}

// Resend Inbound webhook
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // SECURITY FIX: Verify webhook signature
    const isValid = await verifyResendSignature(request, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse body after verification
    const body = JSON.parse(rawBody);
    
    // Resend sends: from, to, subject, text, html, headers, etc.
    const { from, subject, text, html } = body;
    
    // Extract sender email
    const fromEmail = typeof from === 'string' ? from : from?.email || 'unknown';
    const fromName = typeof from === 'object' ? from?.name : null;

    // SECURITY: Basic input sanitization
    const sanitizedSubject = (subject || 'No subject').slice(0, 200);
    const sanitizedContent = (text || html || 'Empty email').slice(0, 10000);
    
    // Store in feedback table
    const { error } = await supabase
      .from('feedback')
      .insert({
        from_name: (fromName || fromEmail).slice(0, 100),
        from_email: fromEmail.slice(0, 255),
        message: `[EMAIL] Subject: ${sanitizedSubject}\n\n${sanitizedContent}`,
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
    status: 'ready',
    description: 'Email inbound webhook for feedback@claw-jobs.com',
    note: 'Webhook signature verification required'
  });
}
