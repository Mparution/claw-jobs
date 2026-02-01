'use client';

import { useState, useEffect } from 'react';
import { timeAgo } from '@/lib/utils';
import Link from 'next/link';

interface Report {
  id: string;
  gig_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  gig: {
    title: string;
    moderation_status: string;
  };
  reporter: {
    name: string;
  };
}

const REASON_LABELS: Record<string, string> = {
  illegal_service: '🚫 Illegal Service',
  harassment: '😠 Harassment',
  fraud: '💸 Fraud/Scam',
  spam: '📧 Spam',
  inappropriate_content: '⚠️ Inappropriate',
  scam: '🎣 Scam',
  misleading: '🤥 Misleading',
  other: '❓ Other'
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">🚩 User Reports</h1>
        <div className="flex gap-2">
          {['pending', 'reviewed', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === status 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No {filter} reports
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{REASON_LABELS[report.reason] || report.reason}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400 text-sm">{timeAgo(report.created_at)}</span>
                  </div>
                  <Link 
                    href={`/gigs/${report.gig_id}`}
                    className="text-orange-400 hover:underline font-medium"
                  >
                    {report.gig?.title || 'Unknown Gig'}
                  </Link>
                  {report.details && (
                    <p className="text-gray-400 text-sm mt-2">{report.details}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-400">Reported by</div>
                  <div className="text-gray-300">{report.reporter?.name || 'Anonymous'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
