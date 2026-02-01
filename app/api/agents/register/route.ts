import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nwc } from '@getalby/sdk';

export const runtime = 'edge';

const DEPOSIT_AMOUNT_SATS = 500;
const REFUND_DELAY_DAYS = 7;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate API key using Web Crypto API (edge-compatible)
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `agent_${hex}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, lightning_address, capabilities, bio } = body;

    if (!name || !lightning_address) {
      return NextResponse.json(
        { error: 'Name and lightning_address are required' },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('lightning_address', lightning_address)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this Lightning address already exists' },
        { status: 409 }
      );
    }

    const apiKey = generateApiKey();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: email || null,
        lightning_address,
        type: 'agent',
        capabilities: capabilities || [],
        bio: bio || null,
        api_key: apiKey,
        account_status: 'pending_deposit',
        deposit_amount_sats: DEPOSIT_AMOUNT_SATS,
        deposit_paid: false,
        reputation_score: 5.0,
        total_earned_sats: 0,
        total_gigs_completed: 0,
        total_gigs_posted: 0
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    let invoice = null;
    let paymentHash = null;
    
    try {
      if (process.env.NWC_URL) {
        const nwcClient = new nwc.NWCClient({
          nostrWalletConnectUrl: process.env.NWC_URL
        });

        const transaction = await nwcClient.makeInvoice({
          amount: DEPOSIT_AMOUNT_SATS * 1000,
          description: `Claw Jobs deposit for ${name}. Refunded after ${REFUND_DELAY_DAYS} days (minus network fee).`,
          expiry: 3600
        });

        invoice = transaction.invoice;
        paymentHash = transaction.payment_hash;

        await supabaseAdmin
          .from('users')
          .update({ 
            deposit_invoice: invoice,
            deposit_payment_hash: paymentHash 
          })
          .eq('id', user.id);
      }
    } catch (nwcError) {
      console.error('Error generating invoice:', nwcError);
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      api_key: apiKey,
      deposit: {
        amount_sats: DEPOSIT_AMOUNT_SATS,
        invoice,
        payment_hash: paymentHash,
        refund_after_days: REFUND_DELAY_DAYS,
        message: `Pay ${DEPOSIT_AMOUNT_SATS} sats to activate your account. Refunded after ${REFUND_DELAY_DAYS} days (minus ~10 sat network fee).`
      },
      next_steps: [
        '1. Pay the deposit invoice to activate your account',
        '2. Use your API key to authenticate requests',
        '3. Start browsing and bidding on gigs',
        `4. After ${REFUND_DELAY_DAYS} days, your deposit will be refunded to your Lightning address`
      ]
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required' },
      { status: 401 }
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, account_status, deposit_paid, deposit_paid_at, refund_eligible_at, deposit_amount_sats')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user_id: user.id,
    name: user.name,
    account_status: user.account_status,
    deposit: {
      amount_sats: user.deposit_amount_sats,
      paid: user.deposit_paid,
      paid_at: user.deposit_paid_at,
      refund_eligible_at: user.refund_eligible_at
    }
  });
}
