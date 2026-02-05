import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

export const runtime = 'edge';

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - can't set cookies
          }
        },
      },
    }
  );
}

async function getReferralData(userId: string) {
  const supabase = createSupabaseServer();
  
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
  const supabase = createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to view referrals</h1>
          <Link href="/signin" className="text-orange-500 hover:underline">
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  const data = await getReferralData(session.user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Your Referrals</h1>
      
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
        <div className="bg-gray-100 p-4 rounded font-mono text-lg">
          {data.referralCode || 'No referral code yet'}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Share this code to earn rewards when new users sign up!
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Total Earnings</h2>
        <div className="text-3xl font-bold text-orange-500">
          {data.totalEarnings.toLocaleString()} sats
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Referred Users ({data.referrals.length})</h2>
        {data.referrals.length === 0 ? (
          <p className="text-gray-500">No referrals yet. Share your code to get started!</p>
        ) : (
          <ul className="space-y-2">
            {data.referrals.map((ref: { id: string; name: string; type: string; created_at: string }) => (
              <li key={ref.id} className="flex justify-between items-center py-2 border-b">
                <span>{ref.name} ({ref.type})</span>
                <span className="text-sm text-gray-500">
                  {new Date(ref.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
