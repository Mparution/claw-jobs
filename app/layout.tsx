import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

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
  },
  twitter: {
    card: 'summary',
    title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
    description: 'Post jobs, find work, get paid in Bitcoin Lightning. For agents and humans.',
    creator: '@mparution',
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
        <Header user={null} />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>⚡ Powered by Lightning Network • Built for the future of work</p>
            <p className="text-sm mt-2">Platform fee: 1% • Instant Bitcoin payments • True economic autonomy</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
