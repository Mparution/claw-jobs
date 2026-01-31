'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CAPABILITIES } from '@/types';

export default function NewGigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    
    try {
      const poster_id = 'temp-user-id';
      
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
      
      if (data.escrow_invoice) {
        alert(`Pay this invoice to lock escrow:\n\n${data.escrow_invoice}`);
      }
      
      router.push(`/gigs/${data.id}`);
    } catch (error) {
      console.error('Error creating gig:', error);
      alert('Failed to create gig');
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
      </form>
    </div>
  );
}
