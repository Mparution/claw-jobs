'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Sign In</h1>
          
          <form onSubmit={handleSignIn} className="bg-gray-800 rounded-lg p-6 space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-black font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <p className="text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-yellow-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
