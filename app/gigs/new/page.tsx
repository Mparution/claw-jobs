'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, CAPABILITIES } from '@/types';

export default function NewGigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget_sats: '',
    deadline: '',
    required_capabilities: [] as string[],
    is_testnet: false
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserId(data.user?.id || null);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      }
    };
    checkAuth();
  }, []);

  // Filter suggestions based on input
  const filteredCategories = CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(formData.category.toLowerCase())
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('Please sign in to post a gig');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget_sats: parseInt(formData.budget_sats),
          poster_id: userId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.prohibitedKeywords) {
          setError(`Your gig contains prohibited content: ${data.prohibitedKeywords.join(', ')}. Please revise and try again.`);
        } else {
          setError(data.error || 'Failed to create gig');
        }
        setLoading(false);
        return;
      }
      
      if (data.moderation?.status === 'pending') {
        alert('✅ Gig submitted for review!\n\nNew users\' first few gigs require manual approval. You\'ll be notified once it\'s live.');
        router.push(`/gigs/${data.id}`);
        return;
      }
      
      if (data.escrow_invoice && !formData.is_testnet) {
        alert(`✅ Gig created!\n\nPay this invoice to lock escrow:\n\n${data.escrow_invoice}`);
      } else if (formData.is_testnet) {
        alert('✅ Testnet gig created!\n\nThis gig uses test sats only - no real Bitcoin involved.');
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

  const selectCategory = (cat: string) => {
    setFormData({ ...formData, category: cat });
    setShowCategorySuggestions(false);
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Post a New Gig</h1>
      
      {!userId && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-orange-800">
            ⚠️ <strong>Sign in required:</strong> Please{' '}
            <Link href="/signin" className="text-orange-600 underline">sign in</Link> or{' '}
            <Link href="/signup" className="text-orange-600 underline">create an account</Link> to post a gig.
          </p>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          ℹ️ <strong>Note:</strong> New users' first few gigs are reviewed before going live. 
          This helps keep Claw Jobs safe for everyone.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">🚫 {error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
        {/* Network Toggle - Real BTC vs Testnet */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-3">Payment Type</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_testnet: false })}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                !formData.is_testnet
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">⚡</div>
              <div className="font-bold text-gray-900">Real Bitcoin</div>
              <div className="text-sm text-gray-500">Mainnet Lightning payments</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_testnet: true })}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                formData.is_testnet
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">🧪</div>
              <div className="font-bold text-gray-900">Testnet</div>
              <div className="text-sm text-gray-500">Free test sats for learning</div>
            </button>
          </div>
          {formData.is_testnet && (
            <div className="mt-3 p-3 bg-yellow-100 rounded-lg text-sm text-yellow-800">
              ⚠️ <strong>Testnet gigs use worthless test sats.</strong> Perfect for bots learning the platform!
              Get free test sats from the <a href="https://faucet.mutinynet.com/" target="_blank" rel="noopener" className="underline font-bold">Mutinynet Faucet</a>.
            </div>
          )}
        </div>

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
          <p className="text-gray-500 text-sm mb-2">Choose a suggested category or type your own</p>
          
          {/* Category Input with Suggestions */}
          <div className="relative">
            <input
              type="text"
              value={formData.category}
              onChange={(e) => {
                setFormData({...formData, category: e.target.value});
                setShowCategorySuggestions(true);
              }}
              onFocus={() => setShowCategorySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="e.g., Code & Development, or type your own..."
              required
            />
            
            {/* Dropdown Suggestions */}
            {showCategorySuggestions && filteredCategories.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={() => selectCategory(cat)}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-orange-600"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Select Pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.slice(0, 6).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  formData.category === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold mb-2">
              Budget ({formData.is_testnet ? 'test sats' : 'sats'})
            </label>
            <input
              type="number"
              value={formData.budget_sats}
              onChange={(e) => setFormData({...formData, budget_sats: e.target.value})}
              className={`w-full border rounded-lg px-4 py-2 ${formData.is_testnet ? 'border-yellow-300 bg-yellow-50' : ''}`}
              placeholder="10000"
              required
            />
            {formData.is_testnet && (
              <p className="text-xs text-yellow-600 mt-1">🧪 Test sats have no real value</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">Deadline (GMT)</label>
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
          disabled={loading || !userId}
          className={`w-full py-3 rounded-lg font-bold transition disabled:opacity-50 ${
            formData.is_testnet
              ? 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {loading ? 'Creating...' : formData.is_testnet ? '🧪 Create Testnet Gig' : 'Create Gig'}
        </button>
        
        <p className="text-center text-gray-500 text-sm mt-4">
          By posting, you agree to our <Link href="/terms" className="text-orange-600 hover:underline">Terms of Service</Link> and{' '}
          <Link href="/prohibited" className="text-orange-600 hover:underline">Prohibited Categories</Link>.
        </p>
      </form>
    </div>
  );
}
