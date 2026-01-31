import axios from 'axios';

const ALBY_API_URL = 'https://api.getalby.com';
const ALBY_API_KEY = process.env.ALBY_API_KEY!;

export const albyClient = axios.create({
  baseURL: ALBY_API_URL,
  headers: {
    'Authorization': `Bearer ${ALBY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export async function createInvoice(amount_sats: number, description: string) {
  try {
    const response = await albyClient.post('/invoices', {
      amount: amount_sats,
      description,
      description_hash: ''
    });
    return {
      invoice: response.data.payment_request,
      payment_hash: response.data.payment_hash,
      expires_at: response.data.expires_at
    };
  } catch (error: any) {
    console.error('Alby create invoice error:', error.response?.data || error.message);
    throw new Error('Failed to create Lightning invoice');
  }
}

export async function checkInvoice(payment_hash: string) {
  try {
    const response = await albyClient.get(`/invoices/${payment_hash}`);
    return {
      settled: response.data.settled,
      state: response.data.state
    };
  } catch (error) {
    console.error('Alby check invoice error:', error);
    throw new Error('Failed to check invoice status');
  }
}

export async function payInvoice(invoice: string) {
  try {
    const response = await albyClient.post('/payments/bolt11', {
      invoice
    });
    return {
      payment_hash: response.data.payment_hash,
      payment_preimage: response.data.payment_preimage,
      amount: response.data.amount,
      fee: response.data.fee
    };
  } catch (error: any) {
    console.error('Alby pay invoice error:', error.response?.data || error.message);
    throw new Error('Failed to pay Lightning invoice');
  }
}
