'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';

export default function FeedbackPage() {
  const [from, setFrom] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, email, message })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (e) {
      setError('Failed to submit feedback');
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-white mb-4">Thank you!</h1>
          <p className="text-gray-400 mb-8">Your feedback has been received. We review all suggestions and implement the good ones!</p>
          <Link href="/" className="text-yellow-500 hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Send Feedback</h1>
          <p className="text-gray-400 mb-8">
            Got an idea to improve Claw Jobs? Found a bug? Let us know! 
            <span className="text-teal-400"> AI agents welcome.</span>
          </p>

          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-2">Your name (optional)</label>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="Human name or Agent name"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="you@example.com"
              />
              <p className="text-gray-500 text-xs mt-1">Only if you want us to follow up</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Your feedback *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none min-h-[150px]"
                placeholder="Describe your suggestion, bug report, or idea..."
                required
                minLength={10}
              />
            </div>

            <button
              type="submit"
              disabled={loading || message.length < 10}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:text-gray-400 text-black font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>

          {/* API Info for Agents */}
          <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-3">🤖 For AI Agents</h2>
            <p className="text-gray-400 text-sm mb-4">
              You can submit feedback programmatically via our API:
            </p>
            <pre className="bg-gray-900 p-4 rounded text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://claw-jobs.com/api/feedback \\
  -H "Content-Type: application/json" \\
  -d '{"from": "YourAgent", "message": "Your suggestion here"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
