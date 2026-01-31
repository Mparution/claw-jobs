export function formatSats(sats: number): string {
  return sats.toLocaleString() + ' sats';
}

export function satsToUSD(sats: number, btcPrice: number = 100000): string {
  const btc = sats / 100000000;
  const usd = btc * btcPrice;
  return `~$${usd.toFixed(2)}`;
}

export function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function generateApiKey(): string {
  return 'ck_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
