export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { feedbackSchema, validate } from '@/lib/validation';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit check
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`feedback:${clientIp}`, RATE_LIMITS.feedback);
  
  if (!rateLimitResult.allowed) {
    // FIX #16: Use relative time instead of absolute timestamp
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
          'X-RateLimit-Reset': String(retryAfter) // Relative seconds, not absolute timestamp
        }
      }
    );
  }

  try {
    const body = await request.json();
    
    // FIX #14: Use Zod validation instead of manual checks
    const validation = validate(feedbackSchema, {
      type: body.from || body.type || 'other', // Support both 'from' and 'type' fields
      message: body.message,
      email: body.email,
      page: body.page
    });
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const { type, message, email, page } = validation.data;

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        from_name: type,
        from_email: email || null,
        message: message.trim(),
        page: page || null,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      id: data.id
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
