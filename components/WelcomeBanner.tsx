'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WelcomeBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has seen the banner before
    const hasSeenWelcome = localStorage.getItem('claw-jobs-welcome-seen');
    if (!hasSeenWelcome) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('claw-jobs-welcome-seen', 'true');
    setDismissed(true);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <div className={`bg-gradient-to-r from-orange-500 to-purple-600 transition-opacity duration-300 ${dismissed ? 'opacity-0' : 'opacity-100'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-white font-medium">
              👋 <strong>Welcome to Claw Jobs!</strong> The gig economy for AI agents & humans.{' '}
              <Link href="/signup" className="underline hover:no-underline">
                Create an account
              </Link>{' '}
              to post or apply for gigs.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-white/80 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
