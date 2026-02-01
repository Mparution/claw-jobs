'use client';

import { useState, useEffect } from 'react';
import { formatSats } from '@/lib/utils';

interface Stats {
  total_gigs: number;
  total_users: number;
  open_gigs: number;
  completed_gigs: number;
  total_volume_sats: number;
  moderation?: {
    pending_gigs: number;
    flagged_gigs: number;
    rejected_gigs: number;
    pending_reports: number;
    total_reports: number;
  };
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats?moderation=true')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Loading stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center text-red-400">Failed to load stats</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">📊 Platform Statistics</h1>
      
      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.total_users} icon="👥" />
        <StatCard label="Total Gigs" value={stats.total_gigs} icon="📋" />
        <StatCard label="Open Gigs" value={stats.open_gigs} icon="🟢" color="green" />
        <StatCard label="Completed" value={stats.completed_gigs} icon="✅" color="blue" />
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="text-gray-400 mb-2">Total Volume (Completed)</div>
        <div className="text-4xl font-bold text-orange-500">{formatSats(stats.total_volume_sats)}</div>
      </div>
      
      {/* Moderation Stats */}
      {stats.moderation && (
        <>
          <h2 className="text-2xl font-bold text-white mb-4">🛡️ Moderation</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard 
              label="Pending Review" 
              value={stats.moderation.pending_gigs} 
              icon="⏳" 
              color="yellow"
              urgent={stats.moderation.pending_gigs > 0}
            />
            <StatCard 
              label="Flagged" 
              value={stats.moderation.flagged_gigs} 
              icon="🚩" 
              color="orange"
              urgent={stats.moderation.flagged_gigs > 0}
            />
            <StatCard 
              label="Rejected" 
              value={stats.moderation.rejected_gigs} 
              icon="🚫" 
              color="red"
            />
            <StatCard 
              label="Pending Reports" 
              value={stats.moderation.pending_reports} 
              icon="📝" 
              color="yellow"
              urgent={stats.moderation.pending_reports > 0}
            />
            <StatCard 
              label="Total Reports" 
              value={stats.moderation.total_reports} 
              icon="📊" 
            />
          </div>
        </>
      )}
      
      {/* Quick Actions */}
      <h2 className="text-2xl font-bold text-white mb-4">⚡ Quick Actions</h2>
      <div className="flex gap-4">
        <a 
          href="/admin/moderation?status=pending"
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium"
        >
          Review Pending Gigs ({stats.moderation?.pending_gigs || 0})
        </a>
        <a 
          href="/admin/moderation?status=flagged"
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium"
        >
          Review Flagged ({stats.moderation?.flagged_gigs || 0})
        </a>
        <a 
          href="/admin/reports"
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium"
        >
          View Reports ({stats.moderation?.pending_reports || 0})
        </a>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'gray',
  urgent = false 
}: { 
  label: string; 
  value: number; 
  icon: string;
  color?: string;
  urgent?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-800',
    green: 'bg-green-900/50 border border-green-700',
    blue: 'bg-blue-900/50 border border-blue-700',
    yellow: 'bg-yellow-900/50 border border-yellow-700',
    orange: 'bg-orange-900/50 border border-orange-700',
    red: 'bg-red-900/50 border border-red-700'
  };
  
  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 ${urgent ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
