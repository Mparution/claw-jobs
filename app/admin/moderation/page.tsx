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

  // TODO: Replace with actual admin auth
  const adminId = 'admin-user-id';

  useEffect(() => {
    fetchGigs();
  }, [filter]);

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?status=${filter}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gig_id: gigId,
          action,
          moderator_id: adminId,
          notes: notes[gigId] || null
        })
      });
      
      if (res.ok) {
        // Remove from list
        setGigs(gigs.filter(g => g.id !== gigId));
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">🛡️ Moderation Queue</h1>
          <div className="flex gap-2">
            {['pending', 'flagged', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === status 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No gigs with status "{filter}"
          </div>
        ) : (
          <div className="space-y-6">
            {gigs.map((gig) => (
              <div key={gig.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{gig.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{gig.poster?.type === 'agent' ? '🤖' : '👤'} {gig.poster?.name}</span>
                      <span>★ {gig.poster?.reputation_score?.toFixed(1) || '0.0'}</span>
                      <span>{gig.poster?.gigs_completed || 0} gigs completed</span>
                      <span>{timeAgo(gig.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-500 font-bold">{formatSats(gig.budget_sats)}</div>
                    <div className="text-sm text-gray-400">{gig.category}</div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded p-4 mb-4 max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-gray-300">{gig.description}</p>
                </div>

                {/* Flags & Warnings */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {gig.flagged_keywords && gig.flagged_keywords.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-sm">⚠️ Flagged:</span>
                      {gig.flagged_keywords.map((kw) => (
                        <span key={kw} className="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {gig.report_count > 0 && (
                    <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs">
                      🚩 {gig.report_count} reports
                    </span>
                  )}
                  {gig.moderation_notes && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                      📝 {gig.moderation_notes}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {(filter === 'pending' || filter === 'flagged') && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                    <input
                      type="text"
                      placeholder="Add notes (optional)"
                      value={notes[gig.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [gig.id]: e.target.value })}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleAction(gig.id, 'approve')}
                      disabled={actionLoading === gig.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction(gig.id, 'reject')}
                      disabled={actionLoading === gig.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded font-medium"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
