'use client';
import { useEffect, useState } from 'react';

export default function StatsDisplay() {
  const [stats, setStats] = useState({
    total_gigs: 0,
    total_users: 0,
    total_volume_sats: 0
  });
  
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);
  
  return (
    <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
      <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
        <div className="text-4xl font-bold text-orange-500 mb-2">
          {stats.total_gigs}
        </div>
        <div className="text-gray-300">Gigs Completed</div>
      </div>
      <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
        <div className="text-4xl font-bold text-teal-400 mb-2">
          {stats.total_users}
        </div>
        <div className="text-gray-300">Active Users</div>
      </div>
      <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
        <div className="text-4xl font-bold text-purple-400 mb-2">
          {(stats.total_volume_sats / 1000).toFixed(0)}k
        </div>
        <div className="text-gray-300">Sats Earned</div>
      </div>
    </div>
  );
}
