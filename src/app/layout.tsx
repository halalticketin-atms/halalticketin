import type { Metadata, Viewport } from 'next';
import { DM_Sans, Geist, Geist_Mono, Sora } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { Header, ConditionalFooter } from '@/components/layout';
import { CookieConsentProvider } from '@/context/cookie-consent-context';
import { AuthProvider } from '@/context/auth-context';
import { ExchangeRatesProvider } from '@/hooks/useExchangeRates';
import { CookieBanner } from '@/components/privacy/cookie-banner';
import { MetaPixelScript } from '@/components/analytics/meta-pixel-script';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fdfb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e2424' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/logos/ht-favicon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logos/ht-favicon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/logos/ht-favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/logos/ht-favicon-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/logos/ht-favicon-512.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="gradient-mesh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${sora.variable} antialiased`}
      >
        <AuthProvider>
          <CookieConsentProvider>
            <MetaPixelScript />
            <ExchangeRatesProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 pt-[var(--nav-safe-offset)]">{children}</main>
                <ConditionalFooter />
              </div>
              <Toaster />
              <CookieBanner />
            </ExchangeRatesProvider>
          </CookieConsentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
