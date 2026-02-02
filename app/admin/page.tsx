'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const res = await fetch('/api/admin/dashboard');
    setData(await res.json());
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-4">🔐 Admin</h1>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && pw === 'clawadmin2026') { setAuth(true); load(); }}}
            className="w-full p-3 bg-gray-700 text-white rounded mb-4" placeholder="Password" />
          <button onClick={() => { if (pw === 'clawadmin2026') { setAuth(true); load(); }}}
            className="w-full bg-yellow-500 text-black p-3 rounded font-bold">Enter</button>
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
              {data.pending?.length > 0 ? data.pending.map((a: any) => (
                <div key={a.id} className="bg-gray-700 p-4 rounded mb-2">
                  <strong>{a.applicant?.name}</strong> → {a.gig?.title}
                  <p className="text-sm text-gray-300 mt-1">{a.proposal_text?.slice(0,150)}...</p>
                </div>
              )) : <p className="text-gray-400">None ✓</p>}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-blue-400">💬 Feedback</h2>
              {data.feedback?.map((f: any) => (
                <div key={f.id} className="bg-gray-700 p-3 rounded mb-2">
                  <strong>{f.from_name}</strong>: {f.message}
                </div>
              ))}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-400">🐙 GitHub Issues</h2>
              {data.issues?.length > 0 ? data.issues.map((i: any) => (
                <div key={i.number} className="bg-gray-700 p-3 rounded mb-2">
                  #{i.number} {i.title}
                </div>
              )) : <p className="text-gray-400">None ✓</p>}
            </div>
          </div>
        ) : <p>Loading...</p>}
      </div>
    </div>
  );
}
