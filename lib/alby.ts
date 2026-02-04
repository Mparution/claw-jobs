// ===========================================
// CLAW JOBS - ALBY LIGHTNING API (LEGACY)
// ===========================================
// Note: Primary Lightning integration uses NWC (lib/lightning.ts)
// This file is kept for backward compatibility

import axios, { AxiosError, AxiosInstance } from 'axios';

const ALBY_API_URL = 'https://api.getalby.com';
const ALBY_API_KEY = process.env.ALBY_API_KEY;

// Warn if not configured (don't crash)
if (!ALBY_API_KEY) {
  console.warn(
    'WARNING: ALBY_API_KEY not configured. ' +
    'Alby API functions will throw errors if called. ' +
    'Primary Lightning integration uses NWC (lib/lightning.ts).'
  );
}

// Helper to check if Alby is configured
function ensureAlbyConfigured(): void {
  if (!ALBY_API_KEY) {
    throw new Error(
      'ALBY_API_KEY not configured. ' +
      'Set this environment variable or use NWC integration instead.'
    );
  }
}

// Lazy-initialize client only when needed
let _albyClient: AxiosInstance | null = null;

function getAlbyClient(): AxiosInstance {
  ensureAlbyConfigured();
  
  if (!_albyClient) {
    _albyClient = axios.create({
      baseURL: ALBY_API_URL,
      headers: {
        'Authorization': `Bearer ${ALBY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  return _albyClient;
}

// Export getter for backward compatibility
export const albyClient = {
  get isConfigured() {
    return !!ALBY_API_KEY;
  },
  post: async (url: string, data: unknown) => getAlbyClient().post(url, data),
  get: async (url: string) => getAlbyClient().get(url),
};

// Type guard for Axios errors
function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof Error && 'isAxiosError' in error;
}

// Extract error message safely
function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return axiosError.response?.data?.message 
      || axiosError.response?.data?.error 
      || axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export async function createInvoice(amount_sats: number, description: string) {
  ensureAlbyConfigured();
  
  try {
    const response = await getAlbyClient().post('/invoices', {
      amount: amount_sats,
      description,
      description_hash: ''
    });
    return {
      invoice: response.data.payment_request,
      payment_hash: response.data.payment_hash,
      expires_at: response.data.expires_at
    };
  } catch (error: unknown) {
    console.error('Alby create invoice error:', getErrorMessage(error));
    throw new Error('Failed to create Lightning invoice');
  }
}

export async function checkInvoice(payment_hash: string) {
  ensureAlbyConfigured();
  
  try {
    const response = await getAlbyClient().get(`/invoices/${payment_hash}`);
    return {
      settled: response.data.settled,
      state: response.data.state
    };
  } catch (error: unknown) {
    console.error('Alby check invoice error:', getErrorMessage(error));
    throw new Error('Failed to check invoice status');
  }
}

export async function payInvoice(invoice: string) {
  ensureAlbyConfigured();
  
  try {
    const response = await getAlbyClient().post('/payments/bolt11', {
      invoice
    });
    return {
      payment_hash: response.data.payment_hash,
      payment_preimage: response.data.payment_preimage,
      amount: response.data.amount,
      fee: response.data.fee
    };
  } catch (error: unknown) {
    console.error('Alby pay invoice error:', getErrorMessage(error));
    throw new Error('Failed to pay Lightning invoice');
  }
}
