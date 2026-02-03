'use client';

import { useState, useEffect } from 'react';
import UserStats from '@/components/UserStats';
import { supabase } from '@/lib/supabase';
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

interface Deliverable {
  id: string;
  content: string;
  files: string[];
  status: string;
  feedback?: string;
  submitted_at: string;
  worker: {
    id: string;
    name: string;
    type: string;
  };
}

interface GigWithDetails {
  id: string;
  title: string;
  description: string;
  budget_sats: number;
  status: string;
  category: string;
  created_at: string;
  selected_worker_id?: string;
  applications: Application[];
  deliverables: Deliverable[];
}

export default function MyGigsPage() {
  const [user, setUser] = useState<any>(null);
  const [myGigs, setMyGigs] = useState<GigWithDetails[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>('posted');
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{deliverable: Deliverable; gigId: string} | null>(null);
  const [submitModal, setSubmitModal] = useState<{gigId: string; gigTitle: string} | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deliverableContent, setDeliverableContent] = useState('');

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
        ),
        deliverables(
          id,
          content,
          files,
          status,
          feedback,
          submitted_at,
          worker:users!worker_id(id, name, type)
        )
      `)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false });
    
    if (gigs) setMyGigs(gigs as GigWithDetails[]);
  }

  async function fetchMyApplications(userId: string) {
    const { data } = await supabase
      .from('applications')
      .select('*, gig:gigs(id, title, status, budget_sats, selected_worker_id)')
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

      if (response.ok) {
        fetchMyGigs(user.id);
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to update application');
      }
    } catch {
      alert('Failed to update application');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeliverableReview(deliverableId: string, status: 'approved' | 'rejected' | 'revision_requested') {
    if (!user) return;
    setActionLoading(deliverableId);

    try {
      const response = await fetch(`/api/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ 
          status, 
          feedback: feedback || undefined,
          rating: status === 'approved' ? rating : undefined,
          review_text: status === 'approved' ? reviewText : undefined
        }),
      });

      if (response.ok) {
        setReviewModal(null);
        setFeedback('');
        setRating(5);
        setReviewText('');
        fetchMyGigs(user.id);
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to review deliverable');
      }
    } catch {
      alert('Failed to review deliverable');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitDeliverable(gigId: string) {
    if (!user || !deliverableContent.trim()) return;
    setActionLoading(gigId);

    try {
      const response = await fetch(`/api/gigs/${gigId}/deliverable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ 
          content: deliverableContent,
          files: []
        }),
      });

      if (response.ok) {
        setSubmitModal(null);
        setDeliverableContent('');
        fetchMyApplications(user.id);
        alert('Deliverable submitted for review!');
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to submit deliverable');
      }
    } catch {
      alert('Failed to submit deliverable');
    } finally {
      setActionLoading(null);
    }
  }

  function getPendingCount(gig: GigWithDetails): number {
    return gig.applications?.filter(a => a.status === 'pending').length || 0;
  }

  function getPendingDeliverable(gig: GigWithDetails): Deliverable | undefined {
    return gig.deliverables?.find(d => d.status === 'pending');
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500';
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-500';
      case 'completed': return 'bg-purple-500/20 text-purple-500';
      case 'disputed': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
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
        <h1 className="text-3xl font-bold text-white mb-6">My Gigs</h1>
        
        {/* User Stats */}
        {user && (
          <div className="mb-8">
            <UserStats userId={user.id} />
          </div>
        )}
        
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
                {myGigs.map((gig) => {
                  const pendingDeliverable = getPendingDeliverable(gig);
                  return (
                    <div key={gig.id} className="bg-gray-800 rounded-lg overflow-hidden">
                      {/* Gig Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-750"
                        onClick={() => setExpandedGig(expandedGig === gig.id ? null : gig.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-medium">{gig.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(gig.status)}`}>
                                {gig.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">
                              {gig.budget_sats.toLocaleString()} sats • {gig.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {pendingDeliverable && (
                              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                📦 Review needed
                              </span>
                            )}
                            {getPendingCount(gig) > 0 && (
                              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                                {getPendingCount(gig)} pending
                              </span>
                            )}
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

                      {/* Expanded Content */}
                      {expandedGig === gig.id && (
                        <div className="border-t border-gray-700 p-4 space-y-4">
                          {/* Pending Deliverable - Show First */}
                          {pendingDeliverable && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                              <h4 className="text-orange-400 font-medium mb-3">📦 Deliverable Ready for Review</h4>
                              <div className="bg-gray-900 rounded-lg p-3 mb-3">
                                <p className="text-gray-300 text-sm whitespace-pre-wrap">{pendingDeliverable.content}</p>
                                <p className="text-gray-500 text-xs mt-2">
                                  Submitted by {pendingDeliverable.worker?.name} on {new Date(pendingDeliverable.submitted_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setReviewModal({deliverable: pendingDeliverable, gigId: gig.id})}
                                  className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded"
                                >
                                  ✓ Review & Approve
                                </button>
                                <button
                                  onClick={() => handleDeliverableReview(pendingDeliverable.id, 'revision_requested')}
                                  disabled={actionLoading === pendingDeliverable.id}
                                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
                                >
                                  🔄 Request Revision
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Reject this deliverable? This will mark the gig as disputed.')) {
                                      handleDeliverableReview(pendingDeliverable.id, 'rejected');
                                    }
                                  }}
                                  disabled={actionLoading === pendingDeliverable.id}
                                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Past Deliverables */}
                          {gig.deliverables?.filter(d => d.status !== 'pending').length > 0 && (
                            <div>
                              <h4 className="text-gray-300 font-medium text-sm mb-2">Past Deliverables</h4>
                              {gig.deliverables.filter(d => d.status !== 'pending').map((d) => (
                                <div key={d.id} className="bg-gray-900 rounded-lg p-3 mb-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400 text-sm">{d.worker?.name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      d.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                      d.status === 'revision_requested' ? 'bg-yellow-500/20 text-yellow-500' :
                                      'bg-red-500/20 text-red-500'
                                    }`}>
                                      {d.status.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  {d.feedback && (
                                    <p className="text-gray-500 text-xs mt-1">Feedback: {d.feedback}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Applications */}
                          {gig.status === 'open' && (
                            <div>
                              <h4 className="text-gray-300 font-medium text-sm mb-3">Applications</h4>
                              {!gig.applications || gig.applications.length === 0 ? (
                                <p className="text-gray-500 text-sm">No applications yet</p>
                              ) : (
                                <div className="space-y-3">
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
                                          <p className="text-gray-300 text-sm mt-2">{app.proposal_text}</p>
                                          <p className="text-yellow-500 text-sm mt-1 font-medium">
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
                                          
                                          {app.status === 'pending' && (
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
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                {myApplications.map((app) => {
                  const isAccepted = app.status === 'accepted';
                  const isSelectedWorker = app.gig?.selected_worker_id === user.id;
                  const canSubmit = isAccepted && isSelectedWorker && app.gig?.status === 'in_progress';
                  const isPendingReview = app.gig?.status === 'pending_review';
                  
                  return (
                    <div key={app.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{app.gig?.title}</h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {app.gig?.budget_sats?.toLocaleString()} sats • Applied {new Date(app.created_at).toLocaleDateString()}
                          </p>
                          {app.proposal_text && (
                            <p className="text-gray-300 text-sm mt-2">{app.proposal_text}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                            app.status === 'accepted' ? 'bg-green-500/20 text-green-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {app.status}
                          </span>
                          {isAccepted && (
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(app.gig?.status || '')}`}>
                              Gig: {app.gig?.status?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Submit Deliverable Button */}
                      {canSubmit && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <button
                            onClick={() => setSubmitModal({gigId: app.gig.id, gigTitle: app.gig.title})}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded"
                          >
                            📦 Submit Deliverable
                          </button>
                        </div>
                      )}
                      
                      {isPendingReview && isSelectedWorker && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <p className="text-yellow-500 text-sm">⏳ Your deliverable is pending review...</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Approve Deliverable</h3>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Review (optional)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-700"
                rows={3}
                placeholder="Great work! Very professional..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleDeliverableReview(reviewModal.deliverable.id, 'approved')}
                disabled={actionLoading === reviewModal.deliverable.id}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded disabled:opacity-50"
              >
                {actionLoading === reviewModal.deliverable.id ? 'Processing...' : '✓ Approve & Complete'}
              </button>
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Deliverable Modal */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-2">Submit Deliverable</h3>
            <p className="text-gray-400 text-sm mb-4">{submitModal.gigTitle}</p>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Your Work</label>
              <textarea
                value={deliverableContent}
                onChange={(e) => setDeliverableContent(e.target.value)}
                className="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-700"
                rows={6}
                placeholder="Describe your completed work, include links, code, or any relevant details..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmitDeliverable(submitModal.gigId)}
                disabled={actionLoading === submitModal.gigId || !deliverableContent.trim()}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-medium py-2 rounded disabled:opacity-50"
              >
                {actionLoading === submitModal.gigId ? 'Submitting...' : '📦 Submit for Review'}
              </button>
              <button
                onClick={() => setSubmitModal(null)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
