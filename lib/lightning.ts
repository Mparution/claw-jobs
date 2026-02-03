// ===========================================
// CLAW JOBS - LIGHTNING PAYMENTS VIA NWC
// Supports: mainnet, testnet (Mutinynet), mock mode
// ===========================================

import { nwc } from '@getalby/sdk';

let nwcClient: nwc.NWCClient | null = null;
let testnetNwcClient: nwc.NWCClient | null = null;

// Environment config
const isMockMode = process.env.LIGHTNING_MODE === 'mock';
const NWC_URL = process.env.NWC_URL;
const TESTNET_NWC_URL = process.env.TESTNET_NWC_URL;

// Mock payment tracking (in-memory for testing)
const mockPayments = new Map<string, { paid: boolean; amount: number }>();

function generateMockHash(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

async function getClient(testnet = false): Promise<nwc.NWCClient> {
  if (isMockMode) {
    throw new Error('Mock mode - no real client');
  }
  
  // Use testnet client if requested and available
  if (testnet && TESTNET_NWC_URL) {
    if (testnetNwcClient) return testnetNwcClient;
    testnetNwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: TESTNET_NWC_URL });
    return testnetNwcClient;
  }
  
  // Default to mainnet
  if (nwcClient) return nwcClient;
  
  if (!NWC_URL) {
    throw new Error('NWC_URL not configured');
  }
  
  nwcClient = new nwc.NWCClient({ nostrWalletConnectUrl: NWC_URL });
  return nwcClient;
}

export async function createInvoice(amount_sats: number, description: string, testnet = false) {
  // Mock mode - return fake invoice
  if (isMockMode || (testnet && !TESTNET_NWC_URL)) {
    const payment_hash = generateMockHash();
    const mockInvoice = `lntbs${amount_sats}n1mock${payment_hash.slice(0, 20)}`;
    mockPayments.set(payment_hash, { paid: false, amount: amount_sats });
    
    return {
      invoice: mockInvoice,
      payment_hash,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      mock: true,
      testnet
    };
  }

  try {
    const client = await getClient(testnet);
    const response: any = await client.makeInvoice({
      amount: amount_sats * 1000, // Convert to millisats
      description
    });
    
    return {
      invoice: response.invoice,
      payment_hash: response.payment_hash,
      expires_at: response.expires_at,
      testnet
    };
  } catch (error: any) {
    console.error('NWC create invoice error:', error);
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
}

export async function checkInvoice(payment_hash: string, testnet = false) {
  // Mock mode - auto-settle
  if (isMockMode || payment_hash.startsWith('testnet_')) {
    const mockPayment = mockPayments.get(payment_hash);
    if (mockPayment) {
      mockPayment.paid = true;
      return { settled: true, state: 'SETTLED', mock: true };
    }
    // Auto-settle testnet payments
    return { settled: true, state: 'SETTLED', mock: true, testnet };
  }

  try {
    const client = await getClient(testnet);
    const response: any = await client.lookupInvoice({ payment_hash });
    
    const isPaid = response.preimage || response.settled;
    
    return {
      settled: isPaid,
      state: isPaid ? 'SETTLED' : 'PENDING',
      testnet
    };
  } catch (error) {
    console.error('NWC check invoice error:', error);
    return { settled: false, state: 'ERROR' };
  }
}

export async function payInvoice(invoice: string, testnet = false) {
  // Mock mode - instant success
  if (isMockMode) {
    const payment_hash = generateMockHash();
    return {
      payment_hash,
      payment_preimage: generateMockHash(),
      amount: 1000,
      fee: 0,
      mock: true,
      testnet
    };
  }

  try {
    const client = await getClient(testnet);
    const response: any = await client.payInvoice({ invoice });
    
    return {
      payment_hash: response.payment_hash || '',
      payment_preimage: response.preimage,
      amount: response.amount,
      fee: response.fees_paid || 0,
      testnet
    };
  } catch (error: any) {
    console.error('NWC pay invoice error:', error);
    throw new Error(`Failed to pay invoice: ${error.message}`);
  }
}

export async function getBalance(testnet = false) {
  // Mock mode - unlimited test balance
  if (isMockMode) {
    return { balance_sats: 1000000, mock: true, testnet };
  }

  try {
    const client = await getClient(testnet);
    const response: any = await client.getBalance();
    return {
      balance_sats: Math.floor(response.balance / 1000),
      testnet
    };
  } catch (error) {
    console.error('NWC get balance error:', error);
    throw new Error('Failed to get wallet balance');
  }
}

// Helper to check current mode
export function getLightningMode() {
  if (isMockMode) return 'mock';
  if (TESTNET_NWC_URL) return 'testnet-enabled';
  return 'mainnet';
}

// Check if testnet is available
export function isTestnetAvailable() {
  return isMockMode || !!TESTNET_NWC_URL;
}
