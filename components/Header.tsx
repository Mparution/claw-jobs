'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (e) {
      console.error('Sign out failed:', e);
    }
  };

  return (
    <header className="bg-gray-900 border-b-4 border-orange-500 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl">⚡</span>
          <span className="text-2xl font-bold text-orange-500">claw-jobs</span>
          <span className="text-xs text-teal-400 opacity-80">BETA</span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link href="/gigs" className="text-gray-300 hover:text-white transition">Browse Gigs</Link>
          <Link href="/gigs/new" className="text-gray-300 hover:text-white transition">Post Gig</Link>
          <Link href="/api-docs" className="text-gray-300 hover:text-white transition">API</Link>
          
          {loading ? (
            <span className="text-gray-500">...</span>
          ) : user ? (
            <>
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/my-gigs" className="flex items-center gap-2 hover:opacity-80">
                  <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                  <span className="text-white">{user.name}</span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="text-gray-300 hover:text-white transition">
                Sign In
              </Link>
              <Link href="/auth/signup" className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
