'use client';

import { useState, useEffect } from 'react';
import { formatSats, timeAgo } from '@/lib/utils';

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  moderation_status: string;
  moderation_notes: string | null;
  flagged_keywords: string[] | null;
  created_at: string;
  poster: {
    name: string;
    type: string;
    gigs_completed: number;
    reputation_score: number;
  };
  report_count: number;
}

export default function ModerationDashboard() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [adminSecret, setAdminSecret] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load saved admin secret from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      setAdminSecret(saved);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGigs();
    }
  }, [filter, isAuthenticated]);

  const handleAuth = async () => {
    if (!adminSecret) {
      setAuthError('Please enter admin secret');
      return;
    }
    
    // Test the secret by making a request
    try {
      const res = await fetch(`/api/admin/moderation?status=pending`, {
        headers: { 'x-admin-secret': adminSecret }
      });
      
      if (res.ok) {
        localStorage.setItem('admin_secret', adminSecret);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_secret');
    setAdminSecret('');
    setIsAuthenticated(false);
    setGigs([]);
  };

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?status=${filter}`, {
        headers: { 'x-admin-secret': adminSecret }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setIsAuthenticated(false);
          setAuthError('Session expired. Please re-authenticate.');
          return;
        }
      }
      
      const data = await res.json();
      setGigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch gigs:', err);
    }
    setLoading(false);
  };

  const handleAction = async (gigId: string, action: 'approve' | 'reject') => {
    setActionLoading(gigId);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({
          gig_id: gigId,
          action,
          notes: notes[gigId] || null
        })
      });
      
      if (res.ok) {
        setGigs(gigs.filter(g => g.id !== gigId));
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
    setActionLoading(null);
  };

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6">🔐 Admin Authentication</h1>
          
          {authError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Admin Secret</label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="Enter ADMIN_SECRET"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          
          <button
            onClick={handleAuth}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
          >
            Authenticate
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            Use the ADMIN_SECRET environment variable value
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">🛡️ Moderation Queue</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['pending', 'approved', 'rejected', 'flagged'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded ${
                    filter === status 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No {filter} gigs found
          </div>
        ) : (
          <div className="space-y-4">
            {gigs.map(gig => (
              <div key={gig.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{gig.title}</h2>
                    <p className="text-gray-400 text-sm">
                      by {gig.poster?.name} ({gig.poster?.type}) • 
                      {gig.poster?.gigs_completed || 0} gigs completed •
                      ⭐ {gig.poster?.reputation_score?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-500 font-bold">{formatSats(gig.budget_sats)}</div>
                    <div className="text-gray-500 text-sm">{timeAgo(gig.created_at)}</div>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-4">{gig.description}</p>
                
                {gig.flagged_keywords && gig.flagged_keywords.length > 0 && (
                  <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3 mb-4">
                    <span className="text-yellow-500 font-semibold">⚠️ Flagged keywords:</span>
                    <span className="ml-2 text-yellow-300">{gig.flagged_keywords.join(', ')}</span>
                  </div>
                )}
                
                {gig.report_count > 0 && (
                  <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-4">
                    <span className="text-red-500 font-semibold">🚨 Reports:</span>
                    <span className="ml-2 text-red-300">{gig.report_count} user reports</span>
                  </div>
                )}
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Moderation notes (optional)"
                      value={notes[gig.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [gig.id]: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleAction(gig.id, 'approve')}
                    disabled={actionLoading === gig.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleAction(gig.id, 'reject')}
                    disabled={actionLoading === gig.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold disabled:opacity-50"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
