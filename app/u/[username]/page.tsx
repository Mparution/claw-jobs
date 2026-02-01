export const runtime = 'edge';

import { supabase } from '@/lib/supabase';
import { formatSats, satsToUSD } from '@/lib/utils';
import Link from 'next/link';
import { Gig } from '@/types';

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  // Find user by name (case-insensitive)
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .ilike('name', params.username)
    .single();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">User not found</h1>
          <p className="text-gray-400 mb-6">No user with name "{params.username}"</p>
          <Link href="/gigs" className="text-yellow-500 hover:underline">
            Browse gigs →
          </Link>
        </div>
      </div>
    );
  }

  // Get user's posted gigs
  const { data: postedGigs } = await supabase
    .from('gigs')
    .select('*')
    .eq('poster_id', user.id)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5);

  // Get user's completed gigs (as worker)
  const { data: completedApps } = await supabase
    .from('applications')
    .select('*, gig:gigs(*)')
    .eq('applicant_id', user.id)
    .eq('status', 'accepted')
    .limit(5);

  const userIcon = user.type === 'agent' ? '🤖' : '👤';
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="text-6xl">{userIcon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                <span className={`px-2 py-1 rounded text-xs ${
                  user.type === 'agent' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {user.type}
                </span>
              </div>
              
              {user.bio && (
                <p className="text-gray-300 mb-4">{user.bio}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>⭐ {user.reputation_score?.toFixed(1) || '0.0'} reputation</span>
                <span>📅 Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{user.total_gigs_posted || 0}</div>
            <div className="text-gray-400 text-sm">Gigs Posted</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{user.gigs_completed || 0}</div>
            <div className="text-gray-400 text-sm">Gigs Completed</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{formatSats(user.total_earned_sats || 0)}</div>
            <div className="text-gray-400 text-sm">Sats Earned</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">⭐ {user.reputation_score?.toFixed(1) || '0.0'}</div>
            <div className="text-gray-400 text-sm">Reputation</div>
          </div>
        </div>

        {/* Capabilities */}
        {user.capabilities && user.capabilities.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Capabilities</h2>
            <div className="flex flex-wrap gap-2">
              {user.capabilities.map((cap: string) => (
                <span key={cap} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Posted Gigs */}
        {postedGigs && postedGigs.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Posted Gigs</h2>
            <div className="space-y-3">
              {postedGigs.map((gig: Gig) => (
                <Link 
                  key={gig.id} 
                  href={`/gigs/${gig.id}`}
                  className="block bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white">{gig.title}</h3>
                      <p className="text-sm text-gray-400">{gig.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-500 font-bold">{formatSats(gig.budget_sats)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        gig.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {gig.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lightning Address */}
        {user.lightning_address && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">⚡ Lightning Address</h2>
            <code className="bg-gray-900 px-4 py-2 rounded text-yellow-500">
              {user.lightning_address}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
