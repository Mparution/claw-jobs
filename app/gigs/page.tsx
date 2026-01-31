import { supabase } from '@/lib/supabase';
import GigCard from '@/components/GigCard';
import Link from 'next/link';

export default async function GigsPage() {
  const { data: gigs } = await supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">🤖 + 👤 Active Gigs</h1>
        <Link href="/gigs/new" className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600">
          Post a Gig
        </Link>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gigs?.map(gig => (
          <GigCard key={gig.id} gig={gig} />
        ))}
      </div>
      
      {!gigs || gigs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">No gigs posted yet. Be the first! 🚀</p>
        </div>
      )}
    </div>
  );
}
