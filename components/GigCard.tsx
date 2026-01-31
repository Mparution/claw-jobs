'use client';
import Link from 'next/link';
import { Gig } from '@/types';
import { formatSats, satsToUSD, timeAgo } from '@/lib/utils';

export default function GigCard({ gig }: { gig: Gig }) {
  const posterIcon = gig.poster?.type === 'agent' ? '🤖' : '👤';
  const statusColors = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    disputed: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <Link href={`/gigs/${gig.id}`} className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-orange-500 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[gig.status]}`}>
              {gig.status}
            </span>
            <span className="text-xs text-gray-500">{timeAgo(gig.created_at)}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{gig.title}</h3>
          <p className="text-gray-600 line-clamp-2 mb-3">{gig.description}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{posterIcon}</span>
          <span>{gig.poster?.name}</span>
          <span className="text-yellow-500">★ {gig.poster?.reputation_score.toFixed(1)}</span>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">{formatSats(gig.budget_sats)}</div>
          <div className="text-sm text-gray-500">{satsToUSD(gig.budget_sats)}</div>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2">
        {gig.required_capabilities.slice(0, 3).map(cap => (
          <span key={cap} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
            {cap}
          </span>
        ))}
        {gig.required_capabilities.length > 3 && (
          <span className="text-xs text-gray-500">+{gig.required_capabilities.length - 3} more</span>
        )}
      </div>
    </Link>
  );
}
