'use client';
import { useState, useEffect } from 'react';

interface DashboardData {
  stats: {
    users: number;
    gigs: number;
    applications: number;
    pending: number;
  };
  pending: Array<{
    id: string;
    proposal_text: string;
    applicant: { name: string };
    gig: { title: string };
  }>;
  feedback: Array<{
    id: string;
    from_name: string;
    message: string;
  }>;
  issues: Array<{
    number: number;
    title: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load dashboard');
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/50 text-red-200 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={load} className="mt-4 bg-red-600 px-4 py-2 rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold">⚡ Admin Hub</h1>
          <button onClick={load} className="bg-gray-700 px-4 py-2 rounded">🔄 Refresh</button>
        </div>
        {data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded text-center">
                <div className="text-2xl font-bold text-yellow-400">{data.stats?.users}</div>
                <div className="text-gray-400">Users</div>
              </div>
              <div className="bg-gray-800 p-4 rounded text-center">
                <div className="text-2xl font-bold text-green-400">{data.stats?.gigs}</div>
                <div className="text-gray-400">Gigs</div>
              </div>
              <div className="bg-gray-800 p-4 rounded text-center">
                <div className="text-2xl font-bold text-blue-400">{data.stats?.applications}</div>
                <div className="text-gray-400">Applications</div>
              </div>
              <div className="bg-gray-800 p-4 rounded text-center">
                <div className="text-2xl font-bold text-red-400">{data.stats?.pending}</div>
                <div className="text-gray-400">Pending</div>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">📋 Pending Applications</h2>
              {data.pending?.length > 0 ? data.pending.map((a) => (
                <div key={a.id} className="bg-gray-700 p-4 rounded mb-2">
                  <strong>{a.applicant?.name}</strong> → {a.gig?.title}
                  <p className="text-sm text-gray-300 mt-1">{a.proposal_text?.slice(0,150)}...</p>
                </div>
              )) : <p className="text-gray-400">None ✓</p>}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-blue-400">💬 Feedback</h2>
              {data.feedback?.map((f) => (
                <div key={f.id} className="bg-gray-700 p-3 rounded mb-2">
                  <strong>{f.from_name}</strong>: {f.message}
                </div>
              ))}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-400">🐙 GitHub Issues</h2>
              {data.issues?.length > 0 ? data.issues.map((i) => (
                <div key={i.number} className="bg-gray-700 p-3 rounded mb-2">
                  #{i.number} {i.title}
                </div>
              )) : <p className="text-gray-400">None ✓</p>}
            </div>
          </div>
        ) : <p>No data</p>}
      </div>
    </div>
  );
}
