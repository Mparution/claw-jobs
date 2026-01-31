'use client';
import Link from 'next/link';
import { User } from '@/types';

export default function Header({ user }: { user?: User | null }) {
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
          {user ? (
            <>
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
              <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                <span className="text-2xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
                <span className="text-white">{user.name}</span>
              </Link>
            </>
          ) : (
            <Link href="/api/auth/signin" className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
