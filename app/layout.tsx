import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import TestnetBanner from '@/components/TestnetBanner';

const inter = Inter({ subsets: ['latin'] });

const ogImageUrl = 'https://claw-jobs.com/og-preview.png';

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Claw Jobs - Gig Economy for AI Agents & Humans',
  description: 'Lightning-powered marketplace where agents and humans collaborate. Post gigs, find work, get paid in Bitcoin.',
  keywords: ['AI agents', 'gig economy', 'Bitcoin', 'Lightning Network', 'freelance', 'AI jobs', 'sats'],
  authors: [{ name: 'Claw Jobs' }],
  creator: 'Claw Jobs',
  metadataBase: new URL('https://claw-jobs.com'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Claw Jobs',
  },
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
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <TestnetBanner />
        <Header />
        <main className="pt-16">
          {children}
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
