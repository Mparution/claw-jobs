export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { moderateGig } from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';

// Webhook secret for Supabase database webhooks
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || process.env.ADMIN_SECRET;

// Telegram notification config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Additional checks beyond keyword matching
interface ExtendedModerationResult {
  status: 'approved' | 'rejected' | 'pending_review';
  reason?: string;
  flaggedIssues: string[];
}

function performExtendedModeration(gig: {
  title: string;
  description: string;
  budget_sats: number;
  category: string;
  poster?: { name: string; type: string; reputation_score: number; gigs_completed: number } | null;
}): ExtendedModerationResult {
  const flaggedIssues: string[] = [];
  const fullText = `${gig.title} ${gig.description}`.toLowerCase();

  // 1. Check for contact info bypassing platform
  const contactPatterns = [
    /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/i, // email
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone
    /discord\.gg\/\w+/i, // discord invite
    /t\.me\/\w+/i, // telegram link
    /wa\.me\/\d+/i, // whatsapp
    /\bsignal\s*(group|chat|me)\b/i,
  ];
  
  for (const pattern of contactPatterns) {
    if (pattern.test(fullText)) {
      flaggedIssues.push('Contains external contact info (may bypass platform)');
      break;
    }
  }

  // 2. Check for unrealistic pay
  if (gig.budget_sats > 10_000_000) { // > 10M sats (~$1000)
    flaggedIssues.push('Very high budget - verify legitimacy');
  }
  if (gig.budget_sats < 100 && !fullText.includes('test')) {
    flaggedIssues.push('Suspiciously low budget');
  }

  // 3. Check for potential spam/duplicates indicators
  const spamIndicators = [
    /\b(urgent|asap|immediate|now)\b.*\b(money|cash|pay|earn)\b/i,
    /\b(easy|quick|fast)\s+(money|cash|earn|income)\b/i,
    /\b(make|earn)\s+\$?\d+k?\s+(daily|weekly|monthly)\b/i,
    /\b(guaranteed|100%|no risk)\b/i,
  ];
  
  for (const pattern of spamIndicators) {
    if (pattern.test(fullText)) {
      flaggedIssues.push('Potential spam or misleading claims');
      break;
    }
  }

  // 4. Check for discrimination/hate speech indicators
  const hateIndicators = [
    /\b(only|no)\s+(men|women|whites?|blacks?|asians?|muslims?|jews?|christians?)\b/i,
    /\b(hate|kill|destroy)\s+(all\s+)?\w+s?\b/i,
  ];
  
  for (const pattern of hateIndicators) {
    if (pattern.test(fullText)) {
      flaggedIssues.push('Potential discriminatory content');
      break;
    }
  }

  // 5. Use existing keyword moderation
  const keywordResult = moderateGig(
    gig.title,
    gig.description,
    gig.category,
    gig.poster?.gigs_completed || 0,
    gig.poster?.reputation_score || 0
  );

  // Combine results
  if (keywordResult.status === MODERATION_STATUS.REJECTED) {
    return {
      status: 'rejected',
      reason: keywordResult.reason,
      flaggedIssues: [...flaggedIssues, ...keywordResult.prohibitedKeywords]
    };
  }

  // Any flags = needs review
  if (flaggedIssues.length > 0 || keywordResult.flaggedKeywords.length > 0) {
    return {
      status: 'pending_review',
      reason: flaggedIssues.join('; ') || `Flagged: ${keywordResult.flaggedKeywords.join(', ')}`,
      flaggedIssues: [...flaggedIssues, ...keywordResult.flaggedKeywords]
    };
  }

  // Clean
  if (keywordResult.autoApproved) {
    return {
      status: 'approved',
      flaggedIssues: []
    };
  }

  // New user or other review needed
  return {
    status: 'pending_review',
    reason: keywordResult.reason || 'Manual review required',
    flaggedIssues: keywordResult.flaggedKeywords
  };
}

async function sendTelegramNotification(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Failed to send Telegram notification:', e);
  }
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const providedSecret = request.headers.get('x-webhook-secret') || 
                         request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: {
    type: string;
    table: string;
    record: {
      id: string;
      title: string;
      description: string;
      budget_sats: number;
      category: string;
      poster_id: string;
      moderation_status?: string;
      created_at: string;
    };
    old_record?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle INSERT events on gigs table
  if (payload.type !== 'INSERT' || payload.table !== 'gigs') {
    return NextResponse.json({ message: 'Ignored - not a gig insert' });
  }

  const gig = payload.record;
  
  // Skip if already moderated (shouldn't happen on INSERT, but safety check)
  if (gig.moderation_status && gig.moderation_status !== 'pending') {
    return NextResponse.json({ message: 'Already moderated' });
  }

  // Fetch poster info for trust-based moderation
  const { data: poster } = await supabaseAdmin
    .from('users')
    .select('id, name, type, reputation_score, total_gigs_completed')
    .eq('id', gig.poster_id)
    .single();

  // Perform moderation
  const result = performExtendedModeration({
    title: gig.title,
    description: gig.description,
    budget_sats: gig.budget_sats,
    category: gig.category,
    poster: poster ? {
      name: poster.name,
      type: poster.type,
      reputation_score: poster.reputation_score || 0,
      gigs_completed: poster.total_gigs_completed || 0
    } : null
  });

  // Update gig in database
  const { error: updateError } = await supabaseAdmin
    .from('gigs')
    .update({
      moderation_status: result.status,
      moderation_notes: result.reason || null,
      moderated_at: new Date().toISOString(),
      moderated_by: 'astro',
      flagged_keywords: result.flaggedIssues.length > 0 ? result.flaggedIssues : null
    })
    .eq('id', gig.id);

  if (updateError) {
    console.error('Failed to update gig moderation status:', updateError);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  // Send notifications for non-approved gigs
  if (result.status === 'rejected') {
    const message = `🚫 <b>Gig Rejected</b>

<b>Title:</b> ${gig.title}
<b>Budget:</b> ${gig.budget_sats.toLocaleString()} sats
<b>Poster:</b> ${poster?.name || 'Unknown'}
<b>Reason:</b> ${result.reason}

<a href="https://claw-jobs.com/admin/moderation">Review in Admin</a>`;

    await sendTelegramNotification(message);
  } else if (result.status === 'pending_review') {
    const message = `⚠️ <b>Gig Needs Review</b>

<b>Title:</b> ${gig.title}
<b>Budget:</b> ${gig.budget_sats.toLocaleString()} sats
<b>Poster:</b> ${poster?.name || 'Unknown'}
<b>Flags:</b> ${result.flaggedIssues.join(', ') || result.reason}

<a href="https://claw-jobs.com/admin/moderation">Review in Admin</a>`;

    await sendTelegramNotification(message);
  }

  return NextResponse.json({
    success: true,
    gig_id: gig.id,
    moderation_status: result.status,
    reason: result.reason
  });
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'gig-moderation-webhook',
    timestamp: new Date().toISOString()
  });
}
