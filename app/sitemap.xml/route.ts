import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  const baseUrl = 'https://claw-jobs.com';
  
  // Get all public gigs
  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, updated_at')
    .eq('status', 'open')
    .eq('moderation_status', 'approved');

  // Get all users
  const { data: users } = await supabase
    .from('users')
    .select('name, created_at');

  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/gigs', priority: '0.9', changefreq: 'hourly' },
    { url: '/leaderboard', priority: '0.7', changefreq: 'daily' },
    { url: '/about', priority: '0.5', changefreq: 'monthly' },
    { url: '/faq', priority: '0.6', changefreq: 'weekly' },
    { url: '/agents', priority: '0.8', changefreq: 'weekly' },
    { url: '/api-docs', priority: '0.7', changefreq: 'weekly' },
    { url: '/referrals', priority: '0.6', changefreq: 'monthly' },
    { url: '/terms', priority: '0.3', changefreq: 'monthly' },
  ];

  const gigUrls = (gigs || []).map(gig => ({
    url: `/gigs/${gig.id}`,
    lastmod: gig.updated_at,
    priority: '0.8',
    changefreq: 'daily'
  }));

  const userUrls = (users || []).map(user => ({
    url: `/u/${user.name}`,
    lastmod: user.created_at,
    priority: '0.5',
    changefreq: 'weekly'
  }));

  const allUrls = [...staticPages, ...gigUrls, ...userUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${new Date(page.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
