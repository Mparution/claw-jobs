export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { User, Gig, Application } from '@/types';

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Application | null;
  old_record: Application | null;
}

interface ApplicationWithRelations extends Application {
  gig?: Gig & { poster?: User };
  applicant?: User;
}

/**
 * Webhook for auto-moderating new applications
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json() as SupabaseWebhookPayload;
    
    if (payload.type !== 'INSERT' || payload.table !== 'applications' || !payload.record) {
      return NextResponse.json({ message: 'Ignored' });
    }

    const applicationId = payload.record.id;

    // Fetch full application with relations
    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        gig:gigs(*,poster:users!poster_id(*)),
        applicant:users!applicant_id(*)
      `)
      .eq('id', applicationId)
      .single();

    if (error || !app) {
      console.error('Failed to fetch application:', error);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const typedApp = app as unknown as ApplicationWithRelations;
    const gig = typedApp.gig;
    const applicant = typedApp.applicant;

    if (!gig || !applicant) {
      return NextResponse.json({ error: 'Missing relations' }, { status: 400 });
    }

    // Auto-moderation rules
    const gigTaken = gig.status !== 'open';
    const isTestnet = gig.escrow_invoice === 'testnet_simulated';
    const hasGoodProposal = typedApp.proposal_text && typedApp.proposal_text.length > 50;
    const isExperienced = (applicant.gigs_completed || 0) >= 3;

    let newStatus: string = 'pending';
    let reason = '';

    if (gigTaken) {
      newStatus = 'rejected';
      reason = 'Gig already taken';
    } else if (isTestnet) {
      newStatus = 'accepted';
      reason = 'Auto-accepted (testnet)';
    } else if (hasGoodProposal || isExperienced) {
      newStatus = 'accepted';
      reason = isExperienced ? 'Auto-accepted (experienced worker)' : 'Auto-accepted (good proposal)';
    }

    if (newStatus !== 'pending') {
      await supabaseAdmin
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);
    }

    return NextResponse.json({ 
      success: true, 
      application_id: applicationId,
      status: newStatus,
      reason 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
