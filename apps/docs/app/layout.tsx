import './global.css';

import type { Metadata } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { absoluteUrl, site } from '@/lib/site';
import { cn } from "@/lib/utils";

const interHeading = Inter({subsets:['latin'],variable:'--font-heading'});


/*
 * The `variable` names must be exactly --font-sans and --font-mono: Coss
 * components read those, and Next starters default to --font-geist-sans, which
 * silently falls back to system UI. --font-heading is aliased to --font-sans
 * in global.css.
 */
const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'react native ui library',
    'expo ui components',
    'react native tailwind',
    'expo component library',
    'react native design system',
    'uniwind',
    'nativewind alternative',
    'react native bottom sheet',
    'react native dialog',
    'react native dark mode',
    'reanimated',
    'typescript',
  ],
  authors: [{ name: 'Khalid Abdi', url: site.repo }],
  creator: 'Khalid Abdi',
  alternates: { canonical: absoluteUrl('/') },
  /*
   * app/icon.png and app/apple-icon.png are picked up by Next's file
   * convention on their own; this adds the larger mark that search results and
   * install prompts prefer. Google wants a square favicon that is a multiple
   * of 48px to show one beside a result at all — icon.png is 192.
   */
  icons: {
    icon: [
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    url: absoluteUrl('/'),
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'technology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, interHeading.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      {/* `isolate` keeps Base UI portals layering against this root. */}
      <body className="isolate flex min-h-screen flex-col font-sans antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
