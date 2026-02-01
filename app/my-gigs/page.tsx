'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import GigCard from '@/components/GigCard';
import Header from '@/components/Header';
import Link from 'next/link';

export default function MyGigsPage() {
  const [user, setUser] = useState<any>(null);
  const [myGigs, setMyGigs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posted' | 'applied'>('posted');

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
    const { data } = await supabase
      .from('gigs')
      .select('*')
      .eq('poster_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setMyGigs(data);
  }

  async function fetchMyApplications(userId: string) {
    const { data } = await supabase
      .from('applications')
      .select('*, gig:gigs(*)')
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setMyApplications(data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
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
      <Header />
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

        {/* Posted Gigs */}
        {activeTab === 'posted' && (
          <div>
            {myGigs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">You haven't posted any gigs yet.</p>
                <Link
                  href="/gigs/new"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg"
                >
                  Post Your First Gig
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {myGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} />
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
                <p className="text-gray-400 mb-4">You haven't applied to any gigs yet.</p>
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
