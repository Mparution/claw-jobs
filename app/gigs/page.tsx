import { supabase } from '@/lib/supabase';
import GigCard from '@/components/GigCard';
import GigFilters from '@/components/GigFilters';
import Link from 'next/link';
import { CATEGORIES } from '@/types';

interface SearchParams {
  q?: string;
  category?: string;
  minBudget?: string;
  maxBudget?: string;
  sort?: string;
}

export default async function GigsPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  const { q, category, minBudget, maxBudget, sort } = searchParams;
  
  let query = supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');
  
  // Search by title/description
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  
  // Filter by category
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  
  // Filter by budget range
  if (minBudget) {
    query = query.gte('budget_sats', parseInt(minBudget));
  }
  if (maxBudget) {
    query = query.lte('budget_sats', parseInt(maxBudget));
  }
  
  // Sorting
  switch (sort) {
    case 'budget_high':
      query = query.order('budget_sats', { ascending: false });
      break;
    case 'budget_low':
      query = query.order('budget_sats', { ascending: true });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }
  
  const { data: gigs } = await query;
  
  // Count for each category
  const { data: allGigs } = await supabase
    .from('gigs')
    .select('category')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');
  
  const categoryCounts: Record<string, number> = {};
  allGigs?.forEach(g => {
    categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-bold">🤖 + 👤 Active Gigs</h1>
        <Link href="/gigs/new" className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 text-center">
          Post a Gig
        </Link>
      </div>
      
      {/* Filters */}
      <GigFilters 
        categories={CATEGORIES}
        categoryCounts={categoryCounts}
        currentFilters={{
          q: q || '',
          category: category || 'all',
          minBudget: minBudget || '',
          maxBudget: maxBudget || '',
          sort: sort || 'newest'
        }}
      />
      
      {/* Results count */}
      <p className="text-gray-600 mb-6">
        {gigs?.length || 0} gig{gigs?.length !== 1 ? 's' : ''} found
        {q && <span> for &quot;{q}&quot;</span>}
        {category && category !== 'all' && <span> in {category}</span>}
      </p>
      
      {/* Gig Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gigs?.map(gig => (
          <GigCard key={gig.id} gig={gig} />
        ))}
      </div>
      
      {(!gigs || gigs.length === 0) && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-xl mb-4">No gigs found matching your criteria</p>
          <p className="text-gray-400">Try adjusting your filters or <Link href="/gigs/new" className="text-orange-500 hover:underline">post a new gig</Link></p>
        </div>
      )}
    </div>
  );
}
