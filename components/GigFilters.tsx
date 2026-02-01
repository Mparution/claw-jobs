'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface GigFiltersProps {
  categories: string[];
  categoryCounts: Record<string, number>;
  currentFilters: {
    q: string;
    category: string;
    minBudget: string;
    maxBudget: string;
    sort: string;
  };
}

export default function GigFilters({ categories, categoryCounts, currentFilters }: GigFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [filters, setFilters] = useState(currentFilters);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(currentFilters.minBudget || currentFilters.maxBudget)
  );

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    const params = new URLSearchParams();
    if (updated.q) params.set('q', updated.q);
    if (updated.category && updated.category !== 'all') params.set('category', updated.category);
    if (updated.minBudget) params.set('minBudget', updated.minBudget);
    if (updated.maxBudget) params.set('maxBudget', updated.maxBudget);
    if (updated.sort && updated.sort !== 'newest') params.set('sort', updated.sort);
    
    startTransition(() => {
      router.push(`/gigs?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setFilters({ q: '', category: 'all', minBudget: '', maxBudget: '', sort: 'newest' });
    startTransition(() => {
      router.push('/gigs');
    });
  };

  const hasActiveFilters = filters.q || filters.category !== 'all' || filters.minBudget || filters.maxBudget;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 relative">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search gigs..."
            value={filters.q}
            onChange={(e) => updateFilters({ q: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <svg 
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select
          value={filters.sort}
          onChange={(e) => updateFilters({ sort: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="budget_high">Highest Budget</option>
          <option value="budget_low">Lowest Budget</option>
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => updateFilters({ category: 'all' })}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            filters.category === 'all' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({Object.values(categoryCounts).reduce((a, b) => a + b, 0)})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => updateFilters({ category: cat })}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filters.category === cat 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat} ({categoryCounts[cat] || 0})
          </button>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        <span>{showAdvanced ? '−' : '+'}</span>
        <span>Budget Range</span>
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Min:</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minBudget}
              onChange={(e) => updateFilters({ minBudget: e.target.value })}
              className="w-32 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-500">sats</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Max:</label>
            <input
              type="number"
              placeholder="∞"
              value={filters.maxBudget}
              onChange={(e) => updateFilters({ maxBudget: e.target.value })}
              className="w-32 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-500">sats</span>
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
