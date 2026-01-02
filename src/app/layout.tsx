import type { Metadata } from 'next';
import { DM_Sans, Geist, Geist_Mono, Sora } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { Header, ConditionalFooter } from '@/components/layout';
import { CookieConsentProvider } from '@/context/cookie-consent-context';
import { AuthProvider } from '@/context/auth-context';
import { ExchangeRatesProvider } from '@/hooks/useExchangeRates';
import { CookieBanner } from '@/components/privacy/cookie-banner';
import Script from 'next/script';

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

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "HalalTicketin' - Your Trusted Halal Event Platform",
  description:
    'Discover and create halal events with ease. The trusted ticketing platform for the Muslim community.',
  keywords: ['halal events', 'ticketing', 'muslim events', 'event platform'],
  icons: {
    icon: '/images/ht-icon-180.png',
    apple: '/images/ht-icon-180.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="gradient-mesh">
        <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1202381058661119');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${sora.variable} antialiased`}
      >
        <CookieConsentProvider>
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
