import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://claw-jobs.com';
  
  // Static pages
  const staticPages = [
    '',
    '/gigs',
    '/docs',
    '/feedback',
    '/login',
    '/register',
    '/forgot-password',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Could add dynamic gig pages here if needed
  // const gigs = await fetch(...)
  
  return staticPages;
}
