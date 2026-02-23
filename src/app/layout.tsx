import type { Metadata } from 'next';
import { DM_Sans, Geist, Geist_Mono, Sora } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { Header, ConditionalFooter } from '@/components/layout';
import { CookieConsentProvider } from '@/context/cookie-consent-context';
import { AuthProvider } from '@/context/auth-context';
import { ExchangeRatesProvider } from '@/hooks/useExchangeRates';
import { CookieBanner } from '@/components/privacy/cookie-banner';
import { MetaPixelScript } from '@/components/analytics/meta-pixel-script';

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

const metadataBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://halalticketin.com';

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: "HalalTicketin' - Your Trusted Halal Event Platform",
  description:
    'Discover and create halal events with ease. The trusted ticketing platform for the Muslim community.',
  keywords: ['halal events', 'ticketing', 'muslim events', 'event platform'],
  icons: {
    icon: [
      { url: '/images/ht-icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/ht-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    apple: [{ url: '/images/ht-icon-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/images/ht-icon-512.png',
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
        <CookieConsentProvider>
          <MetaPixelScript />
          <AuthProvider>
            <ExchangeRatesProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 pt-[var(--nav-safe-offset)]">{children}</main>
                <ConditionalFooter />
              </div>
              <Toaster />
              <CookieBanner />
            </ExchangeRatesProvider>
          </AuthProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
