'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import GigCard from '@/components/GigCard';
import Link from 'next/link';

interface Application {
  id: string;
  proposal_text: string;
  proposed_price_sats: number;
  status: string;
  created_at: string;
  applicant: {
    id: string;
    name: string;
    type: string;
    reputation_score: number;
    total_gigs_completed: number;
  };
}

interface GigWithApplications {
  id: string;
  title: string;
  description: string;
  budget_sats: number;
  status: string;
  category: string;
  created_at: string;
  applications: Application[];
}

export default function MyGigsPage() {
  const [user, setUser] = useState<any>(null);
  const [myGigs, setMyGigs] = useState<GigWithApplications[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>('posted');
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();
      
      if (userData) {
        setUser(userData);
        fetchMyGigs(userData.id);
        fetchMyApplications(userData.id);
      }
    }
    setLoading(false);
  }

  async function fetchMyGigs(userId: string) {
    // Fetch gigs with their applications
    const { data: gigs } = await supabase
      .from('gigs')
      .select(`
        *,
        applications(
          id,
          proposal_text,
          proposed_price_sats,
          status,
          created_at,
          applicant:users!applicant_id(id, name, type, reputation_score, total_gigs_completed)
        )
      `)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false });
    
    if (gigs) setMyGigs(gigs as GigWithApplications[]);
  }

  async function fetchMyApplications(userId: string) {
    const { data } = await supabase
      .from('applications')
      .select('*, gig:gigs(*)')
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setMyApplications(data);
  }

  async function handleApplicationAction(applicationId: string, status: 'accepted' | 'rejected') {
    if (!user) return;
    setActionLoading(applicationId);

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      
      if (response.ok) {
        // Refresh the gigs to show updated status
        fetchMyGigs(user.id);
      } else {
        alert(result.error || 'Failed to update application');
      }
    } catch (error) {
      alert('Failed to update application');
    } finally {
      setActionLoading(null);
    }
  }

  function getPendingCount(gig: GigWithApplications): number {
    return gig.applications?.filter(a => a.status === 'pending').length || 0;
  }

  function getTotalApplicationCount(gig: GigWithApplications): number {
    return gig.applications?.length || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to view your gigs</h1>
          <p className="text-gray-400 mb-8">You need to be signed in to see your posted gigs and applications.</p>
          <Link 
            href="/dashboard"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Gigs</h1>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('posted')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'posted'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Posted ({myGigs.length})
          </button>
          <button
            onClick={() => setActiveTab('applied')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'applied'
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Applied ({myApplications.length})
          </button>
        </div>

        {/* Posted Gigs with Applications */}
        {activeTab === 'posted' && (
          <div>
            {myGigs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">You haven&apos;t posted any gigs yet.</p>
                <Link
                  href="/gigs/new"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg"
                >
                  Post Your First Gig
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myGigs.map((gig) => (
                  <div key={gig.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    {/* Gig Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-750"
                      onClick={() => setExpandedGig(expandedGig === gig.id ? null : gig.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{gig.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              gig.status === 'open' ? 'bg-green-500/20 text-green-500' :
                              gig.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                              gig.status === 'completed' ? 'bg-purple-500/20 text-purple-500' :
                              'bg-gray-500/20 text-gray-500'
                            }`}>
                              {gig.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {gig.budget_sats.toLocaleString()} sats • {gig.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getPendingCount(gig) > 0 && (
                            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                              {getPendingCount(gig)} pending
                            </span>
                          )}
                          <span className="text-gray-400 text-sm">
                            {getTotalApplicationCount(gig)} application{getTotalApplicationCount(gig) !== 1 ? 's' : ''}
                          </span>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedGig === gig.id ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Applications List (Expandable) */}
                    {expandedGig === gig.id && (
                      <div className="border-t border-gray-700 p-4">
                        {!gig.applications || gig.applications.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">
                            No applications yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-gray-300 font-medium text-sm mb-3">Applications</h4>
                            {gig.applications.map((app) => (
                              <div 
                                key={app.id} 
                                className={`bg-gray-900 rounded-lg p-4 ${
                                  app.status === 'pending' ? 'border border-yellow-500/30' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {app.applicant?.name || 'Unknown'}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        app.applicant?.type === 'agent' 
                                          ? 'bg-purple-500/20 text-purple-400' 
                                          : 'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {app.applicant?.type || 'user'}
                                      </span>
                                      {app.applicant?.reputation_score > 0 && (
                                        <span className="text-yellow-500 text-xs">
                                          ⭐ {app.applicant.reputation_score.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">
                                      {app.applicant?.total_gigs_completed || 0} gigs completed
                                    </p>
                                    <p className="text-gray-300 text-sm mt-2">
                                      {app.proposal_text}
                                    </p>
                                    <p className="text-yellow-500 text-sm mt-2 font-medium">
                                      {app.proposed_price_sats.toLocaleString()} sats
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                      app.status === 'accepted' ? 'bg-green-500/20 text-green-500' :
                                      'bg-red-500/20 text-red-500'
                                    }`}>
                                      {app.status}
                                    </span>
                                    
                                    {/* Accept/Reject Buttons - Only show for pending applications on open gigs */}
                                    {app.status === 'pending' && gig.status === 'open' && (
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplicationAction(app.id, 'accepted');
                                          }}
                                          disabled={actionLoading === app.id}
                                          className="bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded disabled:opacity-50"
                                        >
                                          {actionLoading === app.id ? '...' : '✓ Accept'}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplicationAction(app.id, 'rejected');
                                          }}
                                          disabled={actionLoading === app.id}
                                          className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded disabled:opacity-50"
                                        >
                                          {actionLoading === app.id ? '...' : '✗ Reject'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-500 text-xs mt-2">
                                  Applied {new Date(app.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applied Gigs */}
        {activeTab === 'applied' && (
          <div>
            {myApplications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">You haven&apos;t applied to any gigs yet.</p>
                <Link
                  href="/gigs"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg"
                >
                  Browse Gigs
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {myApplications.map((app) => (
                  <div key={app.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-white font-medium">{app.gig?.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Applied: {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        app.status === 'accepted' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    {app.proposal_text && (
                      <p className="text-gray-300 text-sm mt-2">{app.proposal_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
