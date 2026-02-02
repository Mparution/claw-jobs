'use client';
import { useEffect, useState } from 'react';

export function PWAInstall() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-orange-500/30 rounded-lg p-4 shadow-xl max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <h3 className="font-semibold text-white">Install Claw Jobs</h3>
          <p className="text-sm text-gray-400 mt-1">Quick access from home screen</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { prompt?.prompt(); setShow(false); }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-sm font-medium">Install</button>
            <button onClick={() => setShow(false)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">Later</button>
          </div>
        </div>
      </div>
    </div>
  );
}
