'use client';

import { useEffect, useState } from 'react';

interface Stats {
  gigsPosted: number;
  gigsCompleted: number;
  totalEarned: number;
  totalSpent: number;
  reputation: number;
}

export default function UserStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/users/${userId}/stats`);
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [userId]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />;
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard label="Gigs Posted" value={stats.gigsPosted} icon="📝" />
      <StatCard label="Completed" value={stats.gigsCompleted} icon="✅" />
      <StatCard label="Earned" value={`${stats.totalEarned.toLocaleString()} sats`} icon="⚡" color="green" />
      <StatCard label="Spent" value={`${stats.totalSpent.toLocaleString()} sats`} icon="💸" color="orange" />
      <StatCard label="Reputation" value={stats.reputation.toFixed(1)} icon="⭐" color="yellow" />
    </div>
  );
}

function StatCard({ label, value, icon, color = 'gray' }: { label: string; value: string | number; icon: string; color?: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 text-center`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
