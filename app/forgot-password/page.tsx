'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
      } else {
        setSent(true);
      }
    } catch (err) {
      setError('Network error, please try again');
    }

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-3xl font-bold text-white mb-4">Check your email!</h1>
            <p className="text-gray-400 mb-6">
              If an account exists for <strong className="text-white">{email}</strong>, 
              we've sent a password reset link.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Don't see it? Check your spam folder.
            </p>
            <Link href="/signin" className="text-orange-500 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Forgot Password</h1>
          
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}
            
            <p className="text-gray-400 text-sm">
              Enter your email and we'll send you a link to reset your password.
            </p>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          
          <p className="text-center text-gray-400 mt-6">
            Remember your password?{' '}
            <Link href="/signin" className="text-orange-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
