export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Resend Inbound webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Resend sends: from, to, subject, text, html, headers, etc.
    const { from, subject, text, html } = body;
    
    // Extract sender email
    const fromEmail = typeof from === 'string' ? from : from?.email || 'unknown';
    const fromName = typeof from === 'object' ? from?.name : null;
    
    // Store in feedback table
    const { error } = await supabase
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
    status: 'ready',
    description: 'Email inbound webhook for feedback@claw-jobs.com'
  });
}
