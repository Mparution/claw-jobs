// ===========================================
// CLAW JOBS - LIGHTNING PAYMENTS VIA NWC
// Supports: mainnet, testnet (Mutinynet), mock mode
// ===========================================

import { nwc } from '@getalby/sdk';

// Type definitions for NWC responses
interface MakeInvoiceResponse {
  invoice: string;
  payment_hash: string;
  expires_at: number;
}

interface LookupInvoiceResponse {
  preimage?: string;
  settled?: boolean;
  state?: string;
}

interface PayInvoiceResponse {
  payment_hash?: string;
  preimage: string;
  amount: number;
  fees_paid?: number;
}

interface GetBalanceResponse {
  balance: number;
}

// Type definitions for our return values
export interface CreateInvoiceResult {
  invoice: string;
  payment_hash: string;
  expires_at: number;
  mock?: boolean;
  testnet?: boolean;
}

export interface CheckInvoiceResult {
  settled: boolean;
  state: string;
  mock?: boolean;
  testnet?: boolean;
}

export interface PayInvoiceResult {
  payment_hash: string;
  payment_preimage: string;
  amount: number;
  fee: number;
  mock?: boolean;
  testnet?: boolean;
}

export interface GetBalanceResult {
  balance_sats: number;
  mock?: boolean;
  testnet?: boolean;
}

let nwcClient: nwc.NWCClient | null = null;
let testnetNwcClient: nwc.NWCClient | null = null;

// Environment config
const isMockMode = process.env.LIGHTNING_MODE === 'mock';
const NWC_URL = process.env.NWC_URL;
const TESTNET_NWC_URL = process.env.TESTNET_NWC_URL;

// Mock payment tracking (in-memory for testing)
const mockPayments = new Map<string, { paid: boolean; amount: number }>();

function generateMockHash(): string {
  // Use crypto.getRandomValues for secure random generation
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

export async function createInvoice(
  amount_sats: number, 
  description: string, 
  testnet = false
): Promise<CreateInvoiceResult> {
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
    const response = await client.makeInvoice({
      amount: amount_sats * 1000, // Convert to millisats
      description
    }) as MakeInvoiceResponse;
    
    return {
      invoice: response.invoice,
      payment_hash: response.payment_hash,
      expires_at: response.expires_at,
      testnet
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('NWC create invoice error:', error);
    throw new Error(`Failed to create invoice: ${errorMessage}`);
  }
}

export async function checkInvoice(
  payment_hash: string, 
  testnet = false
): Promise<CheckInvoiceResult> {
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
    const response = await client.lookupInvoice({ payment_hash }) as LookupInvoiceResponse;
    
    const isPaid = !!(response.preimage || response.settled);
    
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

export async function payInvoice(
  invoice: string, 
  testnet = false
): Promise<PayInvoiceResult> {
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
    const response = await client.payInvoice({ invoice }) as PayInvoiceResponse;
    
    return {
      payment_hash: response.payment_hash || '',
      payment_preimage: response.preimage,
      amount: response.amount,
      fee: response.fees_paid || 0,
      testnet
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('NWC pay invoice error:', error);
    throw new Error(`Failed to pay invoice: ${errorMessage}`);
  }
}

export async function getBalance(testnet = false): Promise<GetBalanceResult> {
  // Mock mode - unlimited test balance
  if (isMockMode) {
    return { balance_sats: 1000000, mock: true, testnet };
  }

  try {
    const client = await getClient(testnet);
    const response = await client.getBalance() as GetBalanceResponse;
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
export function getLightningMode(): 'mock' | 'testnet-enabled' | 'mainnet' {
  if (isMockMode) return 'mock';
  if (TESTNET_NWC_URL) return 'testnet-enabled';
  return 'mainnet';
}

// Check if testnet is available
export function isTestnetAvailable(): boolean {
  return isMockMode || !!TESTNET_NWC_URL;
}

// ===========================================
// SERVER-SIDE NETWORK MODE (CRITICAL FIX 4)
// ===========================================
// Network mode is determined by SERVER environment, never by client.
// Prevents attackers from sending is_testnet=true to bypass escrow payment.

/**
 * Determine if we're in testnet mode based on server environment
 * NEVER trust client-provided is_testnet parameter
 */
export function isTestnetMode(): boolean {
  return process.env.LIGHTNING_NETWORK === 'testnet' || 
         process.env.NODE_ENV === 'development' ||
         isMockMode;
}

/**
 * Validate that an invoice matches the expected network
 */
export function validateInvoiceNetwork(invoice: string): boolean {
  if (isTestnetMode()) {
    // Testnet invoices start with lntb, or simulated ones
    return invoice.startsWith('lntb') || invoice.startsWith('lntbs') || 
           invoice.includes('testnet') || invoice.includes('mock');
  }
  // Mainnet invoices start with lnbc
  return invoice.startsWith('lnbc');
}

/**
 * Get the current network mode for display/logging
 */
export function getNetworkMode(): 'mainnet' | 'testnet' | 'mock' {
  if (isMockMode) return 'mock';
  if (isTestnetMode()) return 'testnet';
  return 'mainnet';
}
