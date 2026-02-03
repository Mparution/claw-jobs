// ===========================================
// CLAW JOBS - LIGHTNING PAYMENTS VIA NWC
// Supports: mainnet, testnet (signet), mock mode
// ===========================================

import { nwc } from '@getalby/sdk';

let nwcClient: nwc.NWCClient | null = null;

// Check if we're in mock mode (for testing)
const isMockMode = process.env.LIGHTNING_MODE === 'mock';
const isTestnet = process.env.LIGHTNING_NETWORK === 'testnet' || process.env.LIGHTNING_NETWORK === 'signet';

// Mock payment tracking (in-memory for testing)
const mockPayments = new Map<string, { paid: boolean; amount: number }>();

function generateMockHash(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

async function getClient(): Promise<nwc.NWCClient> {
  if (isMockMode) {
    throw new Error('Mock mode - no real client');
  }
  
  if (nwcClient) return nwcClient;
  
  const nwcUrl = process.env.NWC_URL;
  if (!nwcUrl) {
    throw new Error('NWC_URL environment variable not set');
  }
  
  nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });
  return nwcClient;
}

export async function createInvoice(amount_sats: number, description: string) {
  // Mock mode - return fake invoice
  if (isMockMode) {
    const payment_hash = generateMockHash();
    const mockInvoice = `lntbs${amount_sats}n1mock${payment_hash.slice(0, 20)}`;
    mockPayments.set(payment_hash, { paid: false, amount: amount_sats });
    
    return {
      invoice: mockInvoice,
      payment_hash,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      mock: true
    };
  }

  try {
    const client = await getClient();
    const response: any = await client.makeInvoice({
      amount: amount_sats * 1000,
      description,
    });
    
    return {
      invoice: response.invoice,
      payment_hash: response.payment_hash,
      expires_at: response.expires_at,
      testnet: isTestnet
    };
  } catch (error: any) {
    console.error('NWC create invoice error:', error);
    throw new Error('Failed to create Lightning invoice');
  }
}

export async function checkInvoice(payment_hash: string) {
  // Mock mode - auto-settle after creation
  if (isMockMode) {
    const mockPayment = mockPayments.get(payment_hash);
    if (mockPayment) {
      // Auto-settle mock payments
      mockPayment.paid = true;
      return { settled: true, state: 'SETTLED', mock: true };
    }
    return { settled: false, state: 'PENDING', mock: true };
  }

  try {
    const client = await getClient();
    const response: any = await client.lookupInvoice({ payment_hash });
    
    const isPaid = !!response.preimage || !!response.settled_at;
    
    return {
      settled: isPaid,
      state: isPaid ? 'SETTLED' : 'PENDING',
      testnet: isTestnet
    };
  } catch (error) {
    console.error('NWC check invoice error:', error);
    throw new Error('Failed to check invoice status');
  }
}

export async function payInvoice(invoice: string) {
  // Mock mode - instant success
  if (isMockMode) {
    const payment_hash = generateMockHash();
    return {
      payment_hash,
      payment_preimage: generateMockHash(),
      amount: 1000,
      fee: 0,
      mock: true
    };
  }

  try {
    const client = await getClient();
    const response: any = await client.payInvoice({ invoice });
    
    return {
      payment_hash: response.payment_hash || '',
      payment_preimage: response.preimage,
      amount: response.amount,
      fee: response.fees_paid || 0,
      testnet: isTestnet
    };
  } catch (error: any) {
    console.error('NWC pay invoice error:', error);
    throw new Error('Failed to pay Lightning invoice');
  }
}

export async function getBalance() {
  // Mock mode - unlimited test balance
  if (isMockMode) {
    return { balance_sats: 1000000, mock: true };
  }

  try {
    const client = await getClient();
    const response: any = await client.getBalance();
    return {
      balance_sats: Math.floor(response.balance / 1000),
      testnet: isTestnet
    };
  } catch (error) {
    console.error('NWC get balance error:', error);
    throw new Error('Failed to get wallet balance');
  }
}

// Helper to check current mode
export function getLightningMode() {
  if (isMockMode) return 'mock';
  if (isTestnet) return 'testnet';
  return 'mainnet';
}
