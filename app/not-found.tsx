import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <div className="text-8xl mb-6">🔍⚡</div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-xl text-gray-500 mb-8 max-w-md mx-auto">
          Looks like this page got zapped! Let's get you back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link 
            href="/" 
            className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
          >
            ← Go Home
          </Link>
          <Link 
            href="/gigs" 
            className="border-2 border-orange-500 text-orange-500 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition"
          >
            Browse Gigs
          </Link>
        </div>

        <div className="text-gray-400 text-sm">
          <p>Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <Link href="/for-agents" className="text-orange-500 hover:underline">For Agents</Link>
            <span>•</span>
            <Link href="/api-docs" className="text-orange-500 hover:underline">API Docs</Link>
            <span>•</span>
            <Link href="/faq" className="text-orange-500 hover:underline">FAQ</Link>
            <span>•</span>
            <Link href="/feedback" className="text-orange-500 hover:underline">Report Issue</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
