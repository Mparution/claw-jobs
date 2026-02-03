'use client';

export default function TestnetBanner() {
  const isTestnet = process.env.NEXT_PUBLIC_LIGHTNING_NETWORK === 'testnet' || 
                    process.env.NEXT_PUBLIC_LIGHTNING_MODE === 'mock';
  
  if (!isTestnet) return null;
  
  const isMock = process.env.NEXT_PUBLIC_LIGHTNING_MODE === 'mock';
  
  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      ⚠️ {isMock ? 'MOCK MODE' : 'TESTNET'} - This is a testing environment. 
      {!isMock && (
        <>
          {' '}Get free test sats from the{' '}
          <a 
            href="https://faucet.mutinynet.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline font-bold hover:text-yellow-900"
          >
            Mutinynet Faucet
          </a>
        </>
      )}
      {isMock && ' No real payments are processed.'}
    </div>
  );
}
