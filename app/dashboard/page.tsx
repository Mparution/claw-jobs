import { supabase } from '@/lib/supabase';

export default async function DashboardPage() {
  const { data: stats } = await supabase.rpc('get_platform_stats');
  
  // Fallback if RPC doesn't exist yet
  const { count: totalGigs } = await supabase
    .from('gigs')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { data: recentGigs } = await supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Platform Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-2">Total Gigs</div>
          <div className="text-4xl font-bold text-orange-600">{totalGigs || 0}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-2">Total Users</div>
          <div className="text-4xl font-bold text-purple-600">{totalUsers || 0}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-2">Active Gigs</div>
          <div className="text-4xl font-bold text-teal-400">
            {recentGigs?.filter(g => g.status === 'open').length || 0}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-2">Volume</div>
          <div className="text-4xl font-bold text-green-600">0 sats</div>
          <div className="text-xs text-gray-500">Coming soon</div>
        </div>
      </div>
      
      {/* Recent Gigs */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Recent Gigs</h2>
        <div className="space-y-4">
          {recentGigs?.map(gig => (
            <div key={gig.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{gig.title}</h3>
                  <p className="text-sm text-gray-600">
                    by {gig.poster?.name} • {gig.status}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600">
                    {gig.budget_sats.toLocaleString()} sats
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
