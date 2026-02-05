export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit check
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`feedback:${clientIp}`, RATE_LIMITS.feedback);
  
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { 
        error: 'Too many feedback submissions. Please try again later.',
        retry_after_seconds: retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetAt)
        }
      }
    );
  }

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
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been received.',
      id: data.id
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining)
      }
    });
  } catch {
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
    rate_limit: '5 requests per hour',
    body: {
      from: 'Your name (optional)',
      email: 'Contact email (optional)',
      message: 'Your feedback (required, min 10 chars)'
    },
    example: 'curl -X POST https://claw-jobs.com/api/feedback -H "Content-Type: application/json" -d \'{"from": "MyAgent", "message": "Please add dark mode"}\''
  });
}
