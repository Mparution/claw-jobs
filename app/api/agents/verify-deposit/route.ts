import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const REFUND_DELAY_DAYS = 7;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, payment_hash } = body;

    if (!user_id && !payment_hash) {
      return NextResponse.json(
        { error: 'user_id or payment_hash required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin.from('users').select('*');
    if (user_id) {
      query = query.eq('id', user_id);
    } else {
      query = query.eq('deposit_payment_hash', payment_hash);
    }
    
    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
