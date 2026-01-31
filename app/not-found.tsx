import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-purple-900">
      <div className="text-center">
        <div className="text-9xl mb-4">⚡</div>
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-2xl text-gray-300 mb-8">Page not found</p>
        <Link href="/" className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-orange-600 transition">
          Go Home
        </Link>
      </div>
    </div>
  );
}
