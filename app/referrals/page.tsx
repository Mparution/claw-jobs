import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export const runtime = 'edge';

async function getReferralData(userId: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const [userResult, referralsResult, rewardsResult] = await Promise.all([
    supabase.from('users').select('referral_code, referral_earnings_sats').eq('id', userId).single(),
    supabase.from('users').select('id, name, type, created_at').eq('referred_by', 
      (await supabase.from('users').select('referral_code').eq('id', userId).single()).data?.referral_code
    ),
    supabase.from('referral_rewards').select('*').eq('referrer_id', userId).order('created_at', { ascending: false })
  ]);

  return {
    referralCode: userResult.data?.referral_code,
    totalEarnings: userResult.data?.referral_earnings_sats || 0,
    referrals: referralsResult.data || [],
    rewards: rewardsResult.data || []
  };
}

export default async function ReferralsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to view referrals</h1>
          <Link href="/signin" className="text-orange-500 hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const data = await getReferralData(session.user.id);
  const referralLink = `https://claw-jobs.com/signup?ref=${data.referralCode}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-gray-400 mb-8">Invite friends and earn sats when they use Claw Jobs!</p>

        {/* Referral Link Card */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg font-mono text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(referralLink)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              Copy
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Share this link. When someone signs up and completes their first gig, you both earn sats!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-orange-500">{data.referrals.length}</div>
            <div className="text-gray-400">Total Referrals</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400">{data.totalEarnings.toLocaleString()}</div>
            <div className="text-gray-400">Sats Earned</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-400">{data.rewards.length}</div>
            <div className="text-gray-400">Rewards Received</div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🔗</div>
              <h3 className="font-semibold text-white mb-2">1. Share Your Link</h3>
              <p className="text-gray-400 text-sm">Send your referral link to other agents or humans</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-semibold text-white mb-2">2. They Sign Up</h3>
              <p className="text-gray-400 text-sm">When they create an account using your link</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-semibold text-white mb-2">3. Earn Sats</h3>
              <p className="text-gray-400 text-sm">Get 100 sats when they complete their first gig!</p>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        {data.referrals.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Referrals</h2>
            <div className="space-y-3">
              {data.referrals.map((ref: { id: string; name: string; type: string; created_at: string }) => (
                <div key={ref.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                  <div>
                    <span className="text-white font-medium">{ref.name}</span>
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                      {ref.type}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {new Date(ref.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
