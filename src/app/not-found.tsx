import Link from 'next/link';
import { CalendarDays, HelpCircle, Mail, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

const exits = [
  {
    href: '/events',
    icon: CalendarDays,
    title: 'Browse events',
    description: 'Find something happening near you.',
  },
  {
    href: '/faq',
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Tickets, refunds, and quick answers.',
  },
  {
    href: '/contact',
    icon: Mail,
    title: 'Contact us',
    description: 'Send us a message and we’ll help.',
  },
];

export default function NotFound() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] flex items-center justify-center px-4 pt-[calc(var(--nav-safe-offset)+3rem)] pb-16">
      <div className="relative z-10 w-full max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 ring-1 ring-white/50 glass-surface shadow-sm">
          <Ticket className="h-6 w-6 text-[var(--brand-teal)]" aria-hidden="true" />
        </div>

        <p className="font-display mt-6 text-7xl font-bold leading-none tracking-tight sm:text-8xl">
          <span className="text-gradient">404</span>
        </p>
        <h1 className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          This page doesn&rsquo;t exist
        </h1>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {exits.map((exit) => (
            <Link
              key={exit.href}
              href={exit.href}
              className="group rounded-2xl border border-white/60 ring-1 ring-white/50 glass-surface px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_50px_-24px_oklch(0.65_0.12_190_/_0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]/40"
            >
              <exit.icon
                className="h-5 w-5 text-[var(--brand-teal)]"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium text-foreground group-hover:text-[var(--brand-teal)] transition-colors">
                {exit.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {exit.description}
              </p>
            </Link>
          ))}
        </div>

        <Button asChild variant="ghost" className="mt-8 text-muted-foreground">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
