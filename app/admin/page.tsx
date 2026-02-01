import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">🔧 Admin Dashboard</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Link 
          href="/admin/moderation"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition"
        >
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-xl font-bold text-white mb-2">Moderation</h2>
          <p className="text-gray-400">Review pending and flagged gigs</p>
        </Link>
        
        <Link 
          href="/admin/reports"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition"
        >
          <div className="text-4xl mb-4">🚩</div>
          <h2 className="text-xl font-bold text-white mb-2">Reports</h2>
          <p className="text-gray-400">Handle user-submitted reports</p>
        </Link>
        
        <Link 
          href="/admin/stats"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition"
        >
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Statistics</h2>
          <p className="text-gray-400">Platform metrics and insights</p>
        </Link>
      </div>
      
      <div className="mt-12 bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-yellow-400 font-bold mb-2">⚠️ Admin Access</h3>
        <p className="text-gray-300">
          This area is for platform administrators only. Access is currently not authenticated - 
          implement proper admin auth before going to production.
        </p>
      </div>
    </div>
  );
}
