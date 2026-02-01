import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin Nav */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold text-orange-500">
                ⚡ Claw Jobs
              </Link>
              <span className="text-gray-500">|</span>
              <span className="text-gray-300 font-medium">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/moderation" 
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                🛡️ Moderation
              </Link>
              <Link 
                href="/admin/reports" 
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                🚩 Reports
              </Link>
              <Link 
                href="/admin/stats" 
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                📊 Stats
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
