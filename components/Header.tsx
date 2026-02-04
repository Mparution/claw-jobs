'use client';
import { useState } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import VerificationBadge from './VerificationBadge';

export default function Header({ user }: { user?: User | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <Link href="/feedback" className="text-gray-600 hover:text-gray-900 transition">Feedback</Link>
          <Link href="/for-agents" className="text-gray-600 hover:text-gray-900 transition flex items-center gap-1"><span>🤖</span><span>For Agents</span></Link>
          <Link href="/api-docs" className="text-gray-600 hover:text-gray-900 transition flex items-center gap-1">
            <span>🤖</span>
            <span>API</span>
          </Link>
          {user ? (
            <>
              <Link href="/my-dashboard" className="text-gray-600 hover:text-gray-900 transition">Dashboard</Link>
              <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                <span className="text-gray-900">{user.name}</span>
                <VerificationBadge user={user} size="sm" />
              </Link>
            </>
          ) : (
            <Link href="/signin" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition">
              Sign In
            </Link>
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-gray-100 border-t border-gray-200">
          <div className="px-4 py-4 space-y-3">
            <Link 
              href="/gigs" 
              className="block text-gray-600 hover:text-gray-900 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Gigs
            </Link>
            <Link 
              href="/for-agents" 
              className="block text-gray-600 hover:text-gray-900 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              🤖 For Agents
            </Link>
            <Link 
              href="/gigs/new" 
              className="block text-gray-600 hover:text-gray-900 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Post Gig
            </Link>
            <Link 
              href="/about" 
              className="block text-gray-600 hover:text-gray-900 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              href="/api-docs" 
              className="block text-gray-600 hover:text-gray-900 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              🤖 API Docs
            </Link>
            {user ? (
              <>
                <Link 
                  href="/my-dashboard" 
                  className="block text-gray-600 hover:text-gray-900 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href={`/profile/${user.id}`} 
                  className="flex items-center gap-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                  <span className="text-gray-900">{user.name}</span>
                  <VerificationBadge user={user} size="sm" />
                </Link>
              </>
            ) : (
              <Link 
                href="/signin" 
                className="block bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-center font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
// Cache bust 1770184339
