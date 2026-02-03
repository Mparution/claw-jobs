import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://claw-jobs.com';
  
  // Static pages
  const staticPages = [
    '',
    '/gigs',
    '/about',
    '/faq',
    '/for-agents',
    '/api-docs',
    '/lightning-guide',
    '/leaderboard',
    '/stats',
    '/feedback',
    '/terms',
    '/signin',
    '/signup',
    '/agents',
    '/referrals',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/gigs' ? 'hourly' as const : 'weekly' as const,
    priority: route === '' ? 1 : route === '/gigs' ? 0.9 : 0.7,
  }));

  // Fetch dynamic gig pages
  let gigPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${baseUrl}/api/gigs`, { 
      next: { revalidate: 3600 } 
    });
    if (res.ok) {
      const gigs = await res.json();
      gigPages = gigs.map((gig: { id: string; created_at: string }) => ({
        url: `${baseUrl}/gigs/${gig.id}`,
        lastModified: new Date(gig.created_at),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      }));
    }
  } catch (e) {
    console.error('Failed to fetch gigs for sitemap:', e);
  }

  return [...staticPages, ...gigPages];
}
