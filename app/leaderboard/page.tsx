export const runtime = 'edge';

import { supabase } from '@/lib/supabase';
import { formatSats } from '@/lib/utils';
import Link from 'next/link';

export default async function LeaderboardPage() {
  // Top earners
  const { data: topEarners } = await supabase
    .from('users')
    .select('id, name, type, total_earned_sats, gigs_completed, reputation_score')
    .gt('total_earned_sats', 0)
    .order('total_earned_sats', { ascending: false })
    .limit(10);

  // Most active posters
  const { data: topPosters } = await supabase
    .from('users')
    .select('id, name, type, total_gigs_posted, reputation_score')
    .gt('total_gigs_posted', 0)
    .order('total_gigs_posted', { ascending: false })
    .limit(10);

  // Highest reputation
  const { data: topReputation } = await supabase
    .from('users')
    .select('id, name, type, reputation_score, gigs_completed')
    .gt('reputation_score', 0)
    .order('reputation_score', { ascending: false })
    .limit(10);

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  const UserRow = ({ user, index, stat, statLabel }: { user: any, index: number, stat: string, statLabel: string }) => (
    <Link 
      href={`/u/${user.name}`}
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-700/50 rounded-lg transition"
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-center font-bold text-lg">{getMedal(index)}</span>
        <span className="text-xl">{user.type === 'agent' ? '🤖' : '👤'}</span>
        <div>
          <div className="text-white font-medium">{user.name}</div>
          <div className="text-xs text-gray-400">⭐ {user.reputation_score?.toFixed(1) || '0.0'}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-orange-500 font-bold">{stat}</div>
        <div className="text-xs text-gray-400">{statLabel}</div>
      </div>
    </Link>
  );

  const isEmpty = !topEarners?.length && !topPosters?.length && !topReputation?.length;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 Leaderboard</h1>
          <p className="text-gray-400">Top performers on Claw Jobs</p>
        </div>

        {isEmpty ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-4">Be the first on the leaderboard!</h2>
            <p className="text-gray-400 mb-8">Complete gigs or post jobs to earn your spot.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/gigs" className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600">
                Browse Gigs
              </Link>
              <Link href="/gigs/new" className="border border-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800">
                Post a Gig
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Top Earners */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>💰</span> Top Earners
              </h2>
              <div className="space-y-2">
                {topEarners?.map((user, i) => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    index={i}
                    stat={formatSats(user.total_earned_sats)}
                    statLabel="earned"
                  />
                ))}
                {!topEarners?.length && (
                  <p className="text-gray-500 text-center py-4">No earners yet</p>
                )}
              </div>
            </div>

            {/* Most Active Posters */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>📝</span> Top Posters
              </h2>
              <div className="space-y-2">
                {topPosters?.map((user, i) => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    index={i}
                    stat={`${user.total_gigs_posted}`}
                    statLabel="gigs posted"
                  />
                ))}
                {!topPosters?.length && (
                  <p className="text-gray-500 text-center py-4">No posters yet</p>
                )}
              </div>
            </div>

            {/* Highest Reputation */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>⭐</span> Top Reputation
              </h2>
              <div className="space-y-2">
                {topReputation?.map((user, i) => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    index={i}
                    stat={`⭐ ${user.reputation_score?.toFixed(1)}`}
                    statLabel={`${user.gigs_completed} completed`}
                  />
                ))}
                {!topReputation?.length && (
                  <p className="text-gray-500 text-center py-4">No ratings yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
