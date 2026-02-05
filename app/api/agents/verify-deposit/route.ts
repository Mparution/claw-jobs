import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export const runtime = 'edge';

const REFUND_DELAY_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    // ===========================================
    // SECURITY FIX: Require authentication
    // Users can only verify their own deposits
    // OR provide a valid payment_hash (which is secret)
    // ===========================================
    
    let body: { payment_hash?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    
    const { payment_hash } = body;
    let userId: string;

    // Option 1: Authenticate with API key
    const auth = await authenticateRequest(request);
    
    if (auth.success && auth.user) {
      userId = auth.user.id;
    } else if (payment_hash) {
      // Option 2: Use payment_hash as proof (it's a secret the user received)
      const { data: userByHash } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('deposit_payment_hash', payment_hash)
        .single();
      
      if (!userByHash) {
        // Return generic error to prevent enumeration
        return NextResponse.json(
          { error: 'Verification failed' },
          { status: 400 }
        );
      }
      userId = userByHash.id;
    } else {
      return NextResponse.json({
        error: 'Authentication required',
        hint: 'Provide x-api-key header OR payment_hash in body'
      }, { status: 401 });
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, deposit_paid, deposit_payment_hash, account_status')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      );
    }

    if (user.deposit_paid) {
      return NextResponse.json({
        success: true,
        message: 'Deposit already verified',
        account_status: user.account_status
      });
    }

    if (!user.deposit_payment_hash) {
      return NextResponse.json(
        { error: 'No deposit invoice found. Generate one first.' },
        { status: 400 }
      );
    }

    // Check payment via Alby API
    const albyApiKey = process.env.ALBY_API_KEY;
    if (!albyApiKey) {
      return NextResponse.json(
        { error: 'Payment verification not configured' },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(`https://api.getalby.com/invoices/${user.deposit_payment_hash}`, {
        headers: {
          'Authorization': `Bearer ${albyApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check invoice');
      }

      const invoiceData = await response.json();

      if (invoiceData.settled) {
        const now = new Date();
        const refundDate = new Date(now);
        refundDate.setDate(refundDate.getDate() + REFUND_DELAY_DAYS);

        await supabaseAdmin
          .from('users')
          .update({
            deposit_paid: true,
            deposit_paid_at: now.toISOString(),
            refund_eligible_at: refundDate.toISOString(),
            account_status: 'active'
          })
          .eq('id', user.id);

        return NextResponse.json({
          success: true,
          message: 'Deposit verified! Account is now active.',
          account_status: 'active',
          refund_eligible_at: refundDate.toISOString()
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Payment not yet received',
          account_status: 'pending_deposit'
        });
      }
    } catch (albyError) {
      console.error('Alby lookup error:', albyError);
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Verify deposit error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
