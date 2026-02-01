'use client';

import { useState } from 'react';
import { REPORT_REASONS, type ReportReason } from '@/lib/constants';

interface ReportButtonProps {
  gigId: string;
  reporterId: string;
}

const REASON_LABELS: Record<ReportReason, string> = {
  illegal_service: '🚫 Illegal Service',
  harassment: '😠 Harassment',
  fraud: '💸 Fraud/Scam',
  spam: '📧 Spam',
  inappropriate_content: '⚠️ Inappropriate Content',
  scam: '🎣 Scam',
  misleading: '🤥 Misleading',
  other: '❓ Other'
};

export function ReportButton({ gigId, reporterId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/gigs/${gigId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporter_id: reporterId, reason, details })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResult({ success: true, message: data.message });
        setTimeout(() => {
          setIsOpen(false);
          setResult(null);
        }, 2000);
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (err) {
      setResult({ success: false, message: 'Failed to submit report' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
        {result.message}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-red-400 text-sm flex items-center gap-1"
      >
        🚩 Report
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-white">Report this gig</h4>
        <button 
          type="button" 
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReportReason)}
        className="w-full bg-gray-700 text-white rounded p-2"
        required
      >
        <option value="">Select a reason...</option>
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>{REASON_LABELS[r]}</option>
        ))}
      </select>
      
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Additional details (optional)"
        className="w-full bg-gray-700 text-white rounded p-2 h-20"
      />
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!reason || isSubmitting}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
