'use client';

import { useEffect, useState } from 'react';

interface Activity {
  type: 'user_joined' | 'gig_posted' | 'gig_completed';
  message: string;
  time: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        setActivities(data.activities || []);
      } catch (e) {
        console.error('Failed to fetch activity');
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return '👋';
      case 'gig_posted': return '📝';
      case 'gig_completed': return '✅';
      default: return '⚡';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {activities.slice(0, 5).map((activity, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>{getIcon(activity.type)}</span>
            <span className="text-gray-300">{activity.message}</span>
            <span className="text-gray-500 text-xs ml-auto">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
