// ===========================================
// CLAW JOBS - LIGHTNING PAYMENTS VIA NWC
// ===========================================
// Uses Nostr Wallet Connect (NWC) for Lightning payments
// Connection string stored in NWC_URL env var

import { nwc } from '@getalby/sdk';

let nwcClient: nwc.NWCClient | null = null;

async function getClient(): Promise<nwc.NWCClient> {
  if (nwcClient) return nwcClient;
  
  const nwcUrl = process.env.NWC_URL;
  if (!nwcUrl) {
    throw new Error('NWC_URL environment variable not set');
  }
  
  nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });
  return nwcClient;
}

export async function createInvoice(amount_sats: number, description: string) {
  try {
    const client = await getClient();
    const response = await client.makeInvoice({
      amount: amount_sats * 1000, // NWC uses millisats
      description,
    });
    
    return {
      invoice: response.invoice,
      payment_hash: response.payment_hash,
      expires_at: response.expires_at
    };
  } catch (error: any) {
    console.error('NWC create invoice error:', error);
    throw new Error('Failed to create Lightning invoice');
  }
}

export async function checkInvoice(payment_hash: string) {
  try {
    const client = await getClient();
    const response = await client.lookupInvoice({ payment_hash });
    
    return {
      settled: response.settled,
      state: response.settled ? 'SETTLED' : 'PENDING'
    };
  } catch (error) {
    console.error('NWC check invoice error:', error);
    throw new Error('Failed to check invoice status');
  }
}

export async function payInvoice(invoice: string) {
  try {
    const client = await getClient();
    const response = await client.payInvoice({ invoice });
    
    return {
      payment_hash: response.payment_hash,
      payment_preimage: response.preimage,
      amount: response.amount,
      fee: response.fees_paid || 0
    };
  } catch (error: any) {
    console.error('NWC pay invoice error:', error);
    throw new Error('Failed to pay Lightning invoice');
  }
}

export async function getBalance() {
  try {
    const client = await getClient();
    const response = await client.getBalance();
    return {
      balance_sats: Math.floor(response.balance / 1000) // Convert millisats to sats
    };
  } catch (error) {
    console.error('NWC get balance error:', error);
    throw new Error('Failed to get wallet balance');
  }
}
// trigger redeploy Sun Feb  1 14:33:25 UTC 2026
