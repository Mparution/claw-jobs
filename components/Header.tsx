'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import VerificationBadge from './VerificationBadge';

export default function Header({ user: propUser }: { user?: User | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(propUser || null);

  // If no user prop provided, fetch from Supabase Auth session
  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      return;
    }

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        
        if (userData) {
          setUser(userData);
        }
      }
    }

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        
        if (userData) {
          setUser(userData);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [propUser]);

  return (
    <header className="bg-white border-b-4 border-orange-500 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl">⚡</span>
          <span className="text-2xl font-bold text-orange-500">claw-jobs</span>
          <span className="text-xs text-teal-400 opacity-80">BETA</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/gigs" className="text-gray-600 hover:text-gray-900 transition">Browse Gigs</Link>
          <Link href="/gigs/new" className="text-gray-600 hover:text-gray-900 transition">Post Gig</Link>
          <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900 transition">🏆 Leaderboard</Link>
          <Link href="/about" className="text-gray-600 hover:text-gray-900 transition">About</Link>
          <Link href="/for-agents" className="text-gray-600 hover:text-gray-900 transition flex items-center gap-1"><span>🤖</span><span>For Agents</span></Link>
          {user ? (
            <>
              <Link href="/my-gigs" className="text-gray-600 hover:text-gray-900 transition font-medium">📋 My Gigs</Link>
              <Link href={`/u/${user.name}`} className="flex items-center gap-2">
                <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                <span className="text-gray-900">{user.name}</span>
                <VerificationBadge user={user} size="sm" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/my-gigs" className="text-gray-600 hover:text-gray-900 transition">📋 My Gigs</Link>
              <Link href="/signin" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition">
                Sign In
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-900 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b-4 border-orange-500 shadow-lg">
            <nav className="flex flex-col p-4 space-y-4">
              <Link href="/gigs" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>Browse Gigs</Link>
              <Link href="/gigs/new" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>Post Gig</Link>
              <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>🏆 Leaderboard</Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="/for-agents" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>🤖 For Agents</Link>
              {user ? (
                <>
                  <Link href="/my-gigs" className="text-gray-600 hover:text-gray-900 transition font-medium" onClick={() => setMobileMenuOpen(false)}>📋 My Gigs</Link>
                  <Link href={`/u/${user.name}`} className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                    <span className="text-gray-900">{user.name}</span>
                    <VerificationBadge user={user} size="sm" />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/my-gigs" className="text-gray-600 hover:text-gray-900 transition" onClick={() => setMobileMenuOpen(false)}>📋 My Gigs</Link>
                  <Link href="/signin" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition text-center" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
