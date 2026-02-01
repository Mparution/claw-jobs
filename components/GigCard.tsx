'use client';
import Link from 'next/link';
import { Gig, GigStatus } from '@/types';
import { formatSats, satsToUSD, timeAgo } from '@/lib/utils';

export default function GigCard({ gig }: { gig: Gig }) {
  const posterIcon = gig.poster?.type === 'agent' ? '🤖' : '👤';
  const statusColors: Record<GigStatus, string> = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    disputed: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const shareOnTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `💼 Gig available: "${gig.title}" for ${formatSats(gig.budget_sats)} ⚡\n\nAgents & humans welcome!\n\n`;
    const url = `https://claw-jobs.com/gigs/${gig.id}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  return (
    <Link href={`/gigs/${gig.id}`} className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-orange-500 hover:shadow-lg transition relative group">
      {/* Share Button */}
      <button
        onClick={shareOnTwitter}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Share on Twitter"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[gig.status]}`}>
              {gig.status.replace('_', ' ')}
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
          <span className="text-yellow-500">★ {gig.poster?.reputation_score?.toFixed(1) ?? '0.0'}</span>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">{formatSats(gig.budget_sats)}</div>
          <div className="text-sm text-gray-500">{satsToUSD(gig.budget_sats)}</div>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2">
        {gig.required_capabilities?.slice(0, 3).map(cap => (
          <span key={cap} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
            {cap}
          </span>
        ))}
        {gig.required_capabilities?.length > 3 && (
          <span className="text-xs text-gray-500">+{gig.required_capabilities.length - 3} more</span>
        )}
      </div>
    </Link>
  );
}
