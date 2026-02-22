'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useParams } from 'next/navigation';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';
import { fetchEventDetails, type EventRecord, type TicketRecord } from '@/lib/events-api';
import { getUserFriendlyMessage, toast } from '@/lib/notifications';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Browse Events' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
];

export default function EventPreviewPublicPage() {
    const params = useParams();
    const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const { organizers } = useOrganizers();
    const { user, isLoading: authLoading } = useAuth();

    const [event, setEvent] = useState<EventRecord | null>(null);
    const [tickets, setTickets] = useState<TicketRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventId) {
            setError('No event ID provided');
            setIsLoading(false);
            return;
        }

        if (authLoading) {
            return;
        }

        if (!user) {
            setError('Sign in to preview this event.');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetchEventDetails(eventId);
                if (cancelled) return;
                setEvent(response.event);
                setTickets(response.tickets);
            } catch (err) {
                if (cancelled) return;
                const message = getUserFriendlyMessage(err) || 'Event not found';
                setError(message);
                setEvent(null);
                setTickets([]);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [eventId, authLoading, user]);

    const organizer = event
        ? organizers.find((item) => item.id === event.organizerId)
        : null;
    const organizerName = organizer?.name ?? null;

    useEffect(() => {
        const handlePreviewNavigation = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const anchor = target?.closest('a');
            if (!anchor) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            toast.warning('This is just a preview page. Navigation is disabled.');
        };

        document.addEventListener('click', handlePreviewNavigation, true);
        return () => {
            document.removeEventListener('click', handlePreviewNavigation, true);
        };
    }, []);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-40 overflow-x-hidden px-4 md:px-6 pt-[max(env(safe-area-inset-top),1rem)]">
                <div className="max-w-7xl mx-auto rounded-[2rem] bg-white/95 border border-white/70 shadow-lg ring-1 ring-white/60 backdrop-blur flex items-center justify-between px-4 py-2">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/images/HTlogocr.png"
                            alt="HalalTicketin' Logo"
                            width={120}
                            height={35}
                            className="h-8 w-auto"
                            priority
                        />
                    </Link>
                    <div className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                            <Link href="/login">Log in</Link>
                        </Button>
                        <Button size="sm" asChild className="hidden md:inline-flex">
                            <Link href="/events/new">Create event</Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild className="md:hidden">
                            <Link href="/menu" aria-label="Menu">
                                <Menu className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <PublicEventPageContent
                event={event}
                tickets={tickets}
                isLoading={isLoading}
                error={error}
                isPreview
                organizerNameOverride={organizerName}
            />
        </>
    );
}
