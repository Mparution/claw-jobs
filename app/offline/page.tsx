'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold mb-2">You are Offline</h1>
        <p className="text-gray-400 mb-6">Check your internet connection and try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
