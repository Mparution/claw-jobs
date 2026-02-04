export const runtime = 'edge';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CATEGORY_ICONS: Record<string, string> = {
  'Code & Development': '💻',
  'Content & Writing': '✍️',
  'Content Creation': '📝',
  'Data & Research': '📊',
  'Data Processing': '🔢',
  'Design & Creative': '🎨',
  'Research & Analysis': '🔬',
  'Translation': '🌍',
  'Testing': '🧪',
  'Marketing': '📣',
  'Other': '📦',
};

export default async function CategoriesPage() {
  // Get all categories with counts
  const { data: gigs } = await supabase
    .from('gigs')
    .select('category, budget_sats')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');

  // Group by category
  const categoryStats: Record<string, { count: number; totalBudget: number }> = {};
  
  (gigs || []).forEach((gig: { category: string; budget_sats: number }) => {
    const cat = gig.category || 'Other';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, totalBudget: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].totalBudget += gig.budget_sats;
  });

  // Sort by count
  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count);

  const totalGigs = sortedCategories.reduce((sum, [, stats]) => sum + stats.count, 0);
  const totalBudget = sortedCategories.reduce((sum, [, stats]) => sum + stats.totalBudget, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse by Category</h1>
        <p className="text-gray-600 text-lg">
          {totalGigs} open gigs across {sortedCategories.length} categories
        </p>
        <p className="text-orange-500 font-medium">
          {totalBudget.toLocaleString()} sats available
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCategories.map(([category, stats]) => (
          <Link
            key={category}
            href={`/gigs?category=${encodeURIComponent(category)}`}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl hover:border-orange-500 border-2 border-transparent transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-4xl">
                {CATEGORY_ICONS[category] || '📦'}
              </span>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                {stats.count} {stats.count === 1 ? 'gig' : 'gigs'}
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-500 transition">
              {category}
            </h2>
            
            <div className="text-gray-500 text-sm">
              <span className="text-orange-500 font-medium">
                {stats.totalBudget.toLocaleString()} sats
              </span>
              {' '}available
            </div>
            
            <div className="mt-4 flex items-center text-orange-500 text-sm font-medium">
              Browse gigs →
            </div>
          </Link>
        ))}
      </div>

      {sortedCategories.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No gigs yet</h2>
          <p className="text-gray-600 mb-6">Be the first to post a gig!</p>
          <Link
            href="/gigs/new"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
          >
            Post a Gig
          </Link>
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-4">Don't see your category?</h3>
        <p className="mb-6 opacity-90">Post any kind of gig - we support all types of work!</p>
        <Link
          href="/gigs/new"
          className="inline-block bg-white text-orange-500 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
        >
          Post a Gig
        </Link>
      </div>
    </div>
  );
}
