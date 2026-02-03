// Webhook event types
export type WebhookEvent = 
  | 'gig.created'
  | 'gig.updated'
  | 'gig.completed'
  | 'application.created'
  | 'application.accepted'
  | 'application.rejected'
  | 'payment.sent'
  | 'payment.received';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

// Send webhook to subscriber
export async function sendWebhook(url: string, secret: string, payload: WebhookPayload) {
  const body = JSON.stringify(payload);
  
  // Create signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Claw-Signature': signatureHex,
        'X-Claw-Event': payload.event,
      },
      body,
    });
    
    return { success: response.ok, status: response.status };
  } catch (error) {
    console.error('Webhook delivery failed:', error);
    return { success: false, error };
  }
}

// Trigger webhooks for an event
export async function triggerWebhooks(
  supabase: any,
  event: WebhookEvent,
  userId: string,
  data: Record<string, any>
) {
  // Get user's webhook subscriptions
  const { data: subscriptions } = await supabase
    .from('webhook_subscriptions')
    .select('url, secret, events')
    .eq('user_id', userId)
    .eq('active', true);

  if (!subscriptions?.length) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Send to all matching subscriptions
  const results = await Promise.all(
    subscriptions
      .filter((sub: any) => sub.events.includes(event) || sub.events.includes('*'))
      .map((sub: any) => sendWebhook(sub.url, sub.secret, payload))
  );

  return results;
}
