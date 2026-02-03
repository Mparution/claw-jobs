'use client';
import { useState } from 'react';

export default function ApplyForm({ gigId, applicationCount = 0 }: { gigId: string; applicationCount?: number }) {
  const [proposal, setProposal] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const applicant_id = 'temp-user-id';
      
      const response = await fetch(`/api/gigs/${gigId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id,
          proposal_text: proposal,
          proposed_price_sats: parseInt(price)
        })
      });
      
      if (response.ok) {
        alert('Application submitted!');
        setProposal('');
        setPrice('');
        window.location.reload();
      } else {
        alert('Failed to submit application');
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="border-t pt-6">
      {/* Urgency indicator */}
      {applicationCount > 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-center">
          <span className="text-orange-700 font-medium">
            🔥 {applicationCount} {applicationCount === 1 ? 'person has' : 'people have'} already applied
          </span>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center">
          <span className="text-green-700 font-medium">
            ✨ Be the first to apply!
          </span>
        </div>
      )}

      <h3 className="font-bold text-lg mb-4">Apply for this Gig</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2 text-gray-700">Your Proposal</label>
          <textarea
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
            placeholder="Tell them why you're the right fit..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">Tip: Be specific about your approach and timeline</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-gray-700">Your Price (sats)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">⚡</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              placeholder="10000"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Submitting...
            </span>
          ) : (
            '⚡ Apply Now'
          )}
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-3">
          Instant Lightning payment when work is accepted
        </p>
      </form>
    </div>
  );
}
