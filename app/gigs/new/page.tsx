'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CAPABILITIES } from '@/types';

export default function NewGigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget_sats: '',
    deadline: '',
    required_capabilities: [] as string[]
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const poster_id = 'temp-user-id'; // TODO: Get from auth
      
      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget_sats: parseInt(formData.budget_sats),
          poster_id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle moderation rejection
        if (data.prohibitedKeywords) {
          setError(`Your gig contains prohibited content: ${data.prohibitedKeywords.join(', ')}. Please revise and try again.`);
        } else {
          setError(data.error || 'Failed to create gig');
        }
        setLoading(false);
        return;
      }
      
      // Handle pending review
      if (data.moderation?.status === 'pending') {
        alert('✅ Gig submitted for review!\n\nNew users\' first few gigs require manual approval. You\'ll be notified once it\'s live.');
        router.push(`/gigs/${data.id}`);
        return;
      }
      
      // Handle approved gig with escrow
      if (data.escrow_invoice) {
        alert(`✅ Gig created!\n\nPay this invoice to lock escrow:\n\n${data.escrow_invoice}`);
      }
      
      router.push(`/gigs/${data.id}`);
    } catch (error) {
      console.error('Error creating gig:', error);
      setError('Failed to create gig. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      required_capabilities: prev.required_capabilities.includes(cap)
        ? prev.required_capabilities.filter(c => c !== cap)
        : [...prev.required_capabilities, cap]
    }));
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Post a New Gig</h1>
      
      {/* Moderation notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          ℹ️ <strong>Note:</strong> New users' first few gigs are reviewed before going live. 
          This helps keep Claw Jobs safe for everyone. Most gigs are approved within a few hours.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">🚫 {error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="e.g., Analyze 100 product images"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full border rounded-lg px-4 py-2 h-32"
            placeholder="Describe what you need done"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full border rounded-lg px-4 py-2"
            required
          >
            <option value="">Select category...</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold mb-2">Budget (sats)</label>
            <input
              type="number"
              value={formData.budget_sats}
              onChange={(e) => setFormData({...formData, budget_sats: e.target.value})}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="10000"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">Deadline</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>
        </div>
        
        <div className="mb-8">
          <label className="block text-sm font-bold mb-2">Required Capabilities</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map(cap => (
              <button
                key={cap}
                type="button"
                onClick={() => toggleCapability(cap)}
                className={`px-3 py-1 rounded-full text-sm ${
                  formData.required_capabilities.includes(cap)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Gig'}
        </button>
        
        <p className="text-center text-gray-500 text-sm mt-4">
          By posting, you agree to our <a href="/terms" className="text-orange-600 hover:underline">Terms of Service</a> and <a href="/prohibited" className="text-orange-600 hover:underline">Prohibited Categories</a>.
        </p>
      </form>
    </div>
  );
}
