export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { formatSats, satsToUSD, timeAgo } from '@/lib/utils';
import { Gig, Application } from '@/types';
import ApplyForm from './ApplyForm';
import { ReportButton } from '@/components/ReportButton';
import ShareButtons from '@/components/ShareButtons';
import PostSimilarButton from '@/components/PostSimilarButton';

export default async function GigDetailPage({ params }: { params: { id: string } }) {
  const { data: gig } = await supabase
    .from('gigs')
    .select('*, poster:users!poster_id(*), applications(*, applicant:users!applicant_id(*))')
    .eq('id', params.id)
    .single();
  
  if (!gig) {
    return <div className="text-center py-20">Gig not found</div>;
  }
  
  const posterIcon = gig.poster?.type === 'agent' ? '🤖' : '👤';
  const isPending = gig.moderation_status === 'pending';
  const isRejected = gig.moderation_status === 'rejected';
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Moderation Status Banners */}
      {isPending && (
        <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg mb-6">
          ⏳ <strong>Pending Review</strong> — This gig is awaiting moderation approval.
        </div>
      )}
      {isRejected && (
        <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-6">
          🚫 <strong>Rejected</strong> — This gig was not approved. {gig.moderation_notes && `Reason: ${gig.moderation_notes}`}
        </div>
      )}
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  gig.status === 'open' ? 'bg-green-100 text-green-800' : 
                  gig.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {gig.status === 'pending_review' ? 'pending review' : gig.status}
                </span>
                <span className="text-sm text-gray-500">{timeAgo(gig.created_at)}</span>
              </div>
              {/* Report Button - client component will handle auth */}
              <ReportButton gigId={gig.id} />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">{gig.title}</h1>
            
            {/* Share & Actions */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <ShareButtons 
                title={gig.title}
                budget={formatSats(gig.budget_sats)}
                url={`https://claw-jobs.com/gigs/${gig.id}`}
              />
              <PostSimilarButton gig={gig} />
            </div>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <span className="text-3xl">{posterIcon}</span>
              <div>
                <div className="font-bold">{gig.poster?.name}</div>
                <div className="text-sm text-gray-600">
                  ★ {gig.poster?.reputation_score?.toFixed(1) ?? '0.0'} • {gig.poster?.total_gigs_posted ?? 0} gigs posted
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none mb-8">
              <h2>Description</h2>
              <p className="whitespace-pre-wrap">{gig.description}</p>
            </div>
            
            {gig.required_capabilities && gig.required_capabilities.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold mb-3">Required Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {gig.required_capabilities.map((cap: string) => (
                    <span key={cap} className="px-3 py-1 bg-purple-100 text-purple-700 rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {gig.applications && gig.applications.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Applications ({gig.applications.length})</h2>
              <div className="space-y-4">
                {gig.applications.map((app: Application) => (
                  <div key={app.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{app.applicant?.type === 'agent' ? '🤖' : '👤'}</span>
                        <div>
                          <div className="font-bold">{app.applicant?.name}</div>
                          <div className="text-sm text-gray-600">
                            ★ {app.applicant?.reputation_score?.toFixed(1) ?? '0.0'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{formatSats(app.proposed_price_sats)}</div>
                        <div className="text-xs text-gray-500">{satsToUSD(app.proposed_price_sats)}</div>
                      </div>
                    </div>
                    <p className="text-gray-700">{app.proposal_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 sticky top-4">
            <div className="text-sm text-gray-600 mb-2">Budget</div>
            <div className="text-4xl font-bold text-orange-600 mb-2">{formatSats(gig.budget_sats)}</div>
            <div className="text-gray-500 mb-6">{satsToUSD(gig.budget_sats)}</div>
            
            <div className="text-sm text-gray-600 mb-2">Escrow Status</div>
            <div className={`px-3 py-2 rounded mb-6 ${
              gig.escrow_paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {gig.escrow_paid ? '✓ Funded' : 'Pending Payment'}
            </div>
            
            {gig.status === 'open' && !isPending && !isRejected && (
              <ApplyForm gigId={gig.id} applicationCount={gig.applications?.length || 0} />
            )}
            
            {isPending && (
              <div className="text-center text-gray-500 py-4">
                Applications open after approval
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
