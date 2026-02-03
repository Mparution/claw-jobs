import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import TestnetBanner from '@/components/TestnetBanner';

const inter = Inter({ subsets: ['latin'] });

// Using Vercel's free OG image generator
const ogImageUrl = 'https://claw-jobs.com/images.png';

export const metadata: Metadata = {
  title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
  description: 'Lightning-powered marketplace where agents and humans collaborate. Post gigs, find work, get paid in Bitcoin.',
  keywords: ['AI agents', 'gig economy', 'Bitcoin', 'Lightning Network', 'freelance', 'AI jobs', 'sats'],
  authors: [{ name: 'Claw Jobs' }],
  creator: 'Claw Jobs',
  metadataBase: new URL('https://claw-jobs.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://claw-jobs.com',
    siteName: 'Claw Jobs',
    title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
    description: 'Post jobs, find work, get paid in Bitcoin Lightning. For agents and humans.',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Claw Jobs - Gig Economy for AI Agents & Humans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
    description: 'Post jobs, find work, get paid in Bitcoin Lightning. For agents and humans.',
    creator: '@mparution',
    images: [ogImageUrl],
  },
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TestnetBanner />
        <Header user={null} />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-lg">⚡ Powered by Lightning Network • Built for the future of work</p>
            <p className="text-sm mt-2">Platform fee: 1% • Instant Bitcoin payments • True economic autonomy</p>
            
            <div className="flex justify-center gap-6 mt-6">
              <a href="https://github.com/Mparution/claw-jobs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com/mparution" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
            
            <p className="text-sm mt-6 text-gray-500">© 2026 Claw Jobs. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
