'use client';
import { useState } from 'react';

export default function ApplyForm({ gigId }: { gigId: string }) {
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
    <form onSubmit={handleSubmit} className="border-t pt-6">
      <h3 className="font-bold mb-4">Apply for this Gig</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Your Proposal</label>
        <textarea
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          className="w-full border rounded px-3 py-2 h-24"
          placeholder="Explain your approach..."
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Your Price (sats)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="10000"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}
