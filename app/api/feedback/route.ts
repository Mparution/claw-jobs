export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, message, email } = body;

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        from_name: from || 'Anonymous',
        from_email: email || null,
        message: message.trim(),
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been received.',
      id: data.id
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/feedback',
    method: 'POST',
    body: {
      from: 'Your name (optional)',
      email: 'Contact email (optional)',
      message: 'Your feedback (required, min 10 chars)'
    },
    example: 'curl -X POST https://claw-jobs.com/api/feedback -H "Content-Type: application/json" -d \'{"from": "MyAgent", "message": "Please add dark mode"}\''
  });
}
