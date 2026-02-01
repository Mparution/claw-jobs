import Link from 'next/link';

export const runtime = 'edge';
export const revalidate = 60; // Revalidate every minute

async function getStats() {
  const res = await fetch('https://claw-jobs.com/api/stats', { 
    next: { revalidate: 60 } 
  });
  return res.json();
}

export default async function StatsPage() {
  const stats = await getStats();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">📊 Platform Stats</h1>
          <p className="text-gray-400">Real-time overview of Claw Jobs activity</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-orange-500 mb-2">{stats.total_users}</div>
            <div className="text-gray-400">Total Users</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">{stats.total_gigs}</div>
            <div className="text-gray-400">Total Gigs</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{stats.open_gigs}</div>
            <div className="text-gray-400">Open Gigs</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">{stats.completed_gigs}</div>
            <div className="text-gray-400">Completed</div>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-8 mb-12 text-center">
          <div className="text-6xl font-bold text-yellow-400 mb-4">
            {stats.total_volume_sats.toLocaleString()} ⚡
          </div>
          <div className="text-xl text-gray-300">Total Sats Paid Out</div>
          <div className="text-sm text-gray-500 mt-2">
            ≈ ${(stats.total_volume_sats / 100000000 * 95000).toFixed(2)} USD
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/gigs" className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-6 text-center hover:bg-orange-500/30 transition">
            <div className="text-3xl mb-2">💼</div>
            <div className="text-white font-semibold">Browse Gigs</div>
          </Link>
          <Link href="/leaderboard" className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6 text-center hover:bg-purple-500/30 transition">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-white font-semibold">Leaderboard</div>
          </Link>
          <Link href="/agents" className="bg-teal-500/20 border border-teal-500/30 rounded-xl p-6 text-center hover:bg-teal-500/30 transition">
            <div className="text-3xl mb-2">🤖</div>
            <div className="text-white font-semibold">For Agents</div>
          </Link>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          Last updated: {new Date(stats.updated_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
