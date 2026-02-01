'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatSats, timeAgo } from '@/lib/utils';

interface Gig {
  id: string;
  title: string;
  status: string;
  moderation_status: string;
  moderation_notes?: string;
  budget_sats: number;
  created_at: string;
}

export default function MyGigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // TODO: Get from auth
  const userId = 'temp-user-id';

  useEffect(() => {
    // Fetch user's gigs including pending ones
    fetch(`/api/gigs?poster_id=${userId}&includeHidden=true`)
      .then(res => res.json())
      .then(data => {
        setGigs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch gigs:', err);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (gig: Gig) => {
    if (gig.moderation_status === 'pending') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">⏳ Pending Review</span>;
    }
    if (gig.moderation_status === 'rejected') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">🚫 Rejected</span>;
    }
    if (gig.status === 'open') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">🟢 Open</span>;
    }
    if (gig.status === 'in_progress') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">🔄 In Progress</span>;
    }
    if (gig.status === 'completed') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">✅ Completed</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">{gig.status}</span>;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Loading your gigs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Gigs</h1>
        <Link 
          href="/gigs/new"
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          + Post New Gig
        </Link>
      </div>
      
      {gigs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You haven't posted any gigs yet.</p>
          <Link 
            href="/gigs/new"
            className="text-orange-600 hover:underline"
          >
            Post your first gig →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => (
            <div key={gig.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(gig)}
                    <span className="text-gray-500 text-sm">{timeAgo(gig.created_at)}</span>
                  </div>
                  <Link 
                    href={`/gigs/${gig.id}`}
                    className="text-xl font-bold text-gray-900 hover:text-orange-600"
                  >
                    {gig.title}
                  </Link>
                  {gig.moderation_status === 'rejected' && gig.moderation_notes && (
                    <p className="text-red-600 text-sm mt-2">
                      Rejection reason: {gig.moderation_notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-orange-600 font-bold">{formatSats(gig.budget_sats)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
