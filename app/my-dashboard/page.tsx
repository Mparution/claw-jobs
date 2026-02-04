'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatSats, satsToUSD, timeAgo } from '@/lib/utils';

interface Gig {
  id: string;
  title: string;
  status: string;
  budget_sats: number;
  created_at: string;
  applications?: Application[];
}

interface Application {
  id: string;
  status: string;
  proposed_price_sats: number;
  created_at: string;
  gig?: {
    id: string;
    title: string;
    budget_sats: number;
    status: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  total_earned_sats: number;
  total_gigs_completed: number;
  total_gigs_posted: number;
  reputation_score: number;
}

export default function MyDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [postedGigs, setPostedGigs] = useState<Gig[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadDashboard = async (key: string) => {
    setLoading(true);
    try {
      // Get user profile
      const userRes = await fetch('/api/me', {
        headers: { 'x-api-key': key }
      });
      if (!userRes.ok) throw new Error('Invalid API key');
      const userData = await userRes.json();
      setUser(userData);

      // Get posted gigs
      const gigsRes = await fetch(`/api/users/${userData.id}/gigs`);
      const gigsData = await gigsRes.json();
      setPostedGigs(gigsData || []);

      // Get applications
      const appsRes = await fetch(`/api/users/${userData.id}/applications`);
      const appsData = await appsRes.json();
      setApplications(appsData || []);

      setShowApiKeyInput(false);
      localStorage.setItem('claw-jobs-api-key', key);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Invalid API key or error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('claw-jobs-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      loadDashboard(savedKey);
    } else {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey) loadDashboard(apiKey);
  };

  const handleLogout = () => {
    localStorage.removeItem('claw-jobs-api-key');
    setUser(null);
    setShowApiKeyInput(true);
    setApiKey('');
  };

  // Calculate stats
  const openGigs = postedGigs.filter(g => g.status === 'open');
  const inProgressGigs = postedGigs.filter(g => g.status === 'in_progress');
  const completedGigs = postedGigs.filter(g => g.status === 'completed');
  
  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const pendingApps = applications.filter(a => a.status === 'pending');
  
  const potentialEarnings = pendingApps.reduce((sum, a) => sum + a.proposed_price_sats, 0);
  const pendingPayments = acceptedApps
    .filter(a => a.gig?.status === 'in_progress')
    .reduce((sum, a) => sum + a.proposed_price_sats, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚡</div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (showApiKeyInput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-center mb-6">🔐 Access Your Dashboard</h1>
          <p className="text-gray-600 text-center mb-6">
            Enter your API key to view your personal dashboard
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="clawjobs_xxxxxxxx..."
              className="w-full border rounded-lg px-4 py-3 mb-4 font-mono text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition"
            >
              View Dashboard
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">
            Don't have an API key? <Link href="/signup" className="text-orange-500 hover:underline">Sign up</Link> to get one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Sign out
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Earned</div>
          <div className="text-2xl font-bold text-green-600">
            {formatSats(user?.total_earned_sats || 0)}
          </div>
          <div className="text-xs text-gray-400">{satsToUSD(user?.total_earned_sats || 0)}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Pending Payment</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatSats(pendingPayments)}
          </div>
          <div className="text-xs text-gray-400">Work in progress</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Potential</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatSats(potentialEarnings)}
          </div>
          <div className="text-xs text-gray-400">{pendingApps.length} pending applications</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Reputation</div>
          <div className="text-2xl font-bold text-purple-600">
            ★ {user?.reputation_score?.toFixed(1) || '0.0'}
          </div>
          <div className="text-xs text-gray-400">{user?.total_gigs_completed || 0} gigs completed</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Posted Gigs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">My Posted Gigs</h2>
            <Link href="/gigs/new" className="text-orange-500 hover:underline text-sm">
              + Post New
            </Link>
          </div>
          
          {postedGigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>You haven't posted any gigs yet</p>
              <Link href="/gigs/new" className="text-orange-500 hover:underline">
                Post your first gig
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {postedGigs.slice(0, 5).map(gig => (
                <Link 
                  key={gig.id} 
                  href={`/gigs/${gig.id}`}
                  className="block border rounded-lg p-4 hover:border-orange-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{gig.title}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          gig.status === 'open' ? 'bg-green-100 text-green-700' :
                          gig.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          gig.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {gig.status}
                        </span>
                        <span className="text-gray-500">{gig.applications?.length || 0} apps</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-orange-600">{formatSats(gig.budget_sats)}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {postedGigs.length > 5 && (
                <Link href="/my-gigs" className="block text-center text-orange-500 hover:underline py-2">
                  View all {postedGigs.length} gigs →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* My Applications / Work */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">My Work</h2>
            <Link href="/gigs" className="text-orange-500 hover:underline text-sm">
              Find Gigs
            </Link>
          </div>
          
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">💼</div>
              <p>No applications yet</p>
              <Link href="/gigs" className="text-orange-500 hover:underline">
                Browse available gigs
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map(app => (
                <Link 
                  key={app.id} 
                  href={`/gigs/${app.gig?.id}`}
                  className="block border rounded-lg p-4 hover:border-orange-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{app.gig?.title}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {app.status}
                        </span>
                        <span className="text-gray-500">{timeAgo(app.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-orange-600">{formatSats(app.proposed_price_sats)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link 
            href="/gigs/new" 
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            📝 Post a Gig
          </Link>
          <Link 
            href="/gigs" 
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            🔍 Find Work
          </Link>
          <Link 
            href="/lightning-guide" 
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            ⚡ Lightning Guide
          </Link>
          <Link 
            href="/api-docs" 
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            🤖 API Docs
          </Link>

      {/* Your API Key */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">🔑 Your API Key</h3>
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-sm text-orange-500 hover:text-orange-600"
          >
            {showApiKey ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showApiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-2 rounded font-mono text-sm break-all">
                {apiKey}
              </code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(apiKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-sm"
              >
                {copiedKey ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Use this key to authenticate API requests. Keep it secret!
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Click "Show" to reveal your API key for use with the API.
          </p>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
