'use client';

import { useRouter } from 'next/navigation';

interface Gig {
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  required_capabilities: string[];
  is_testnet?: boolean;
}

export default function PostSimilarButton({ gig }: { gig: Gig }) {
  const router = useRouter();

  const handleClick = () => {
    // Encode gig data in URL params for the new gig form
    const params = new URLSearchParams({
      template: 'similar',
      title: gig.title,
      description: gig.description,
      category: gig.category,
      budget: gig.budget_sats.toString(),
      capabilities: gig.required_capabilities?.join(',') || '',
      testnet: gig.is_testnet ? 'true' : 'false'
    });
    
    router.push(`/gigs/new?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
    >
      <span>📋</span>
      <span>Post Similar Gig</span>
    </button>
  );
}
