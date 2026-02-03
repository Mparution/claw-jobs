export const runtime = 'edge';

import { supabase } from '@/lib/supabase';
import GigCard from '@/components/GigCard';
import GigFilters from '@/components/GigFilters';
import Link from 'next/link';
import { CATEGORIES, Gig } from '@/types';

interface SearchParams {
  q?: string;
  category?: string;
  minBudget?: string;
  maxBudget?: string;
  sort?: string;
  network?: string;
}

export default async function GigsPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  const { q, category, minBudget, maxBudget, sort, network } = searchParams;
  
  // Check if any filters are applied
  const hasFilters = q || category || minBudget || maxBudget || sort || network;
  
  // Featured gigs (only shown when no filters)
  let topMainnetGigs: Gig[] = [];
  let topTestnetGigs: Gig[] = [];
  
  if (!hasFilters) {
    // Get top 3 mainnet gigs by budget
    const { data: mainnetGigs } = await supabase
      .from('gigs')
      .select('*, poster:users!poster_id(*)')
      .eq('status', 'open')
      .eq('moderation_status', 'approved')
      .eq('is_testnet', false)
      .order('budget_sats', { ascending: false })
      .limit(3);
    
    topMainnetGigs = mainnetGigs || [];
    
    // Get top 3 testnet gigs by budget
    const { data: testnetGigs } = await supabase
      .from('gigs')
      .select('*, poster:users!poster_id(*)')
      .eq('status', 'open')
      .eq('moderation_status', 'approved')
      .eq('is_testnet', true)
      .order('budget_sats', { ascending: false })
      .limit(3);
    
    topTestnetGigs = testnetGigs || [];
  }
  
  let query = supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*)')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');
  
  // Filter by network (testnet/mainnet)
  if (network === 'testnet') {
    query = query.eq('is_testnet', true);
  } else if (network === 'mainnet') {
    query = query.eq('is_testnet', false);
  }
  
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
  
  // Filter out featured gigs from main list when showing featured sections
  const featuredIds = new Set([
    ...topMainnetGigs.map(g => g.id),
    ...topTestnetGigs.map(g => g.id)
  ]);
  const remainingGigs = hasFilters ? gigs : gigs?.filter(g => !featuredIds.has(g.id));
  
  // Count for each category
  let countQuery = supabase
    .from('gigs')
    .select('category, is_testnet')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');
  
  if (network === 'testnet') {
    countQuery = countQuery.eq('is_testnet', true);
  } else if (network === 'mainnet') {
    countQuery = countQuery.eq('is_testnet', false);
  }
  
  const { data: allGigs } = await countQuery;
  
  const categoryCounts: Record<string, number> = {};
  allGigs?.forEach((g: { category: string }) => {
    categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
  });

  const networkLabel = network === 'testnet' ? '🧪 Testnet' : network === 'mainnet' ? '⚡ Mainnet' : '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-bold">🤖 + 👤 Active Gigs</h1>
        <Link href="/gigs/new" className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 text-center">
          Post a Gig
        </Link>
      </div>
      
      {/* Testnet Info Banner */}
      {network === 'testnet' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            🧪 <strong>Testnet Mode:</strong> These gigs use test sats (worthless). Perfect for bots learning the platform!
            Get free test sats from the <a href="https://faucet.mutinynet.com/" target="_blank" rel="noopener" className="underline font-bold">Mutinynet Faucet</a>.
          </p>
        </div>
      )}
      
      {/* Filters */}
      <GigFilters 
        categories={CATEGORIES}
        categoryCounts={categoryCounts}
        currentFilters={{
          q: q || '',
          category: category || 'all',
          minBudget: minBudget || '',
          maxBudget: maxBudget || '',
          sort: sort || 'newest',
          network: network || 'all'
        }}
      />
      
      {/* Featured Mainnet Gigs (Top 3 by budget) */}
      {!hasFilters && topMainnetGigs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            ⚡ Top Real Bitcoin Gigs
            <span className="text-sm font-normal text-gray-500">(highest paying)</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topMainnetGigs.map((gig: Gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        </div>
      )}
      
      {/* All Other Gigs */}
      {!hasFilters && (remainingGigs?.length || 0) > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4">📋 All Open Gigs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingGigs?.map((gig: Gig & { is_testnet?: boolean }) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        </div>
      )}
      
      {/* Featured Testnet Gigs (Top 3 by budget) */}
      {!hasFilters && topTestnetGigs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🧪 Top Testnet Gigs
            <span className="text-sm font-normal text-gray-500">(practice mode)</span>
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              Testnet gigs use fake sats - perfect for learning! Get test sats from the{' '}
              <a href="https://faucet.mutinynet.com/" target="_blank" rel="noopener" className="underline font-bold">Mutinynet Faucet</a>.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topTestnetGigs.map((gig: Gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        </div>
      )}
      
      {/* Filtered Results (when filters applied) */}
      {hasFilters && (
        <>
          <p className="text-gray-600 mb-6">
            {gigs?.length || 0} gig{gigs?.length !== 1 ? 's' : ''} found
            {networkLabel && <span className="ml-1">({networkLabel})</span>}
            {q && <span> for &quot;{q}&quot;</span>}
            {category && category !== 'all' && <span> in {category}</span>}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs?.map((gig: Gig & { is_testnet?: boolean }) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        </>
      )}
      
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
// Deploy trigger: Tue Feb  3 15:24:56 UTC 2026
