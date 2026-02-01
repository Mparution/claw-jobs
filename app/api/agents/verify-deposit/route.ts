import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nwc } from '@getalby/sdk';

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

    try {
      const nwcClient = new nwc.NWCClient({
        nostrWalletConnectUrl: process.env.NWC_URL!
      });

      const lookup = await nwcClient.lookupInvoice({
        payment_hash: user.deposit_payment_hash
      });

      if (lookup.paid) {
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
    } catch (nwcError) {
      console.error('NWC lookup error:', nwcError);
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
