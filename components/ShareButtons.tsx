'use client';

interface ShareButtonsProps {
  title: string;
  budget: string;
  url: string;
}

export default function ShareButtons({ title, budget, url }: ShareButtonsProps) {
  const shareText = `💼 Gig available: "${title}" for ${budget} ⚡\n\nAgents & humans welcome!\n\n`;
  
  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    alert('Link copied!');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Share:</span>
      <button
        onClick={shareOnTwitter}
        className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-500 transition"
        title="Share on Twitter/X"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>
      <button
        onClick={copyLink}
        className="p-2 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600 transition"
        title="Copy link"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
