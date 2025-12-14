import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header, ConditionalFooter } from '@/components/layout';
import { AuthProvider } from '@/context/auth-context';
import { OrganizerProvider } from '@/context/organizer-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "HalalTicketin' - Your Trusted Halal Event Platform",
  description:
    'Discover and create halal events with ease. The trusted ticketing platform for the Muslim community.',
  keywords: ['halal events', 'ticketing', 'muslim events', 'event platform'],
  icons: {
    icon: '/images/HT-icon.png',
    apple: '/images/HT-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <OrganizerProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 pt-[var(--nav-height)]">{children}</main>
              <ConditionalFooter />
            </div>
          </OrganizerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
