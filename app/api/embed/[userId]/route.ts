import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  const format = request.nextUrl.searchParams.get('format') || 'json';
  const theme = request.nextUrl.searchParams.get('theme') || 'dark';

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, type, bio, reputation_score, total_earned_sats, total_gigs_completed, total_gigs_posted, capabilities')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let badge = null;
  if (user.total_gigs_completed >= 10 && user.reputation_score >= 4.5) {
    badge = { level: 'trusted', icon: '⭐', label: 'Trusted' };
  } else if (user.total_gigs_completed >= 3 && user.reputation_score >= 4.0) {
    badge = { level: 'verified', icon: '✓', label: 'Verified' };
  } else if (user.total_gigs_completed >= 1) {
    badge = { level: 'rising', icon: '↗', label: 'Rising' };
  }

  const embedData = {
    name: user.name,
    type: user.type,
    bio: user.bio,
    stats: {
      reputation: user.reputation_score,
      earned_sats: user.total_earned_sats,
      gigs_completed: user.total_gigs_completed,
      gigs_posted: user.total_gigs_posted
    },
    capabilities: user.capabilities || [],
    badge,
    profile_url: 'https://claw-jobs.com/u/' + user.name
  };

  if (format === 'html') {
    const isDark = theme === 'dark';
    const bg = isDark ? '#1a1a2e' : '#ffffff';
    const text = isDark ? '#ffffff' : '#1a1a2e';
    const accent = '#f97316';
    const subtext = isDark ? '#9ca3af' : '#6b7280';
    const border = isDark ? '#333' : '#e5e7eb';
    
    const html = '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.w{background:' + bg + ';color:' + text + ';border-radius:12px;padding:20px;max-width:320px;border:1px solid ' + border + '}.h{display:flex;align-items:center;gap:12px;margin-bottom:16px}.a{width:48px;height:48px;background:' + accent + ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px}.n{font-size:18px;font-weight:600}.t{font-size:12px;color:' + subtext + ';text-transform:uppercase}.s{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}.sv{font-size:20px;font-weight:700;color:' + accent + ';text-align:center}.sl{font-size:11px;color:' + subtext + ';text-transform:uppercase;text-align:center}.c{display:block;text-align:center;background:' + accent + ';color:white;text-decoration:none;padding:10px;border-radius:8px;font-weight:600}.p{text-align:center;margin-top:12px;font-size:10px;color:' + subtext + '}.p a{color:' + accent + ';text-decoration:none}</style></head><body><div class="w"><div class="h"><div class="a">' + (embedData.type === 'agent' ? '🤖' : '👤') + '</div><div><div class="n">' + embedData.name + '</div><div class="t">' + embedData.type + '</div></div></div><div class="s"><div><div class="sv">' + embedData.stats.gigs_completed + '</div><div class="sl">Gigs Done</div></div><div><div class="sv">' + Math.floor(embedData.stats.earned_sats / 1000) + 'k</div><div class="sl">Sats</div></div></div><a href="' + embedData.profile_url + '" target="_blank" class="c">View Profile</a><div class="p">⚡ <a href="https://claw-jobs.com">Claw Jobs</a></div></div></body></html>';
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return NextResponse.json(embedData, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}
