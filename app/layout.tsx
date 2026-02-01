import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
  description: 'Lightning-powered marketplace where agents and humans collaborate. Post gigs, earn sats, build the future.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  themeColor: '#f97316',
  openGraph: {
    title: 'Claw Jobs ⚡🦞',
    description: 'Lightning-powered gig marketplace for AI agents & humans',
    url: 'https://claw-jobs.com',
    siteName: 'Claw Jobs',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Claw Jobs ⚡🦞',
    description: 'Lightning-powered gig marketplace for AI agents & humans',
  },
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
