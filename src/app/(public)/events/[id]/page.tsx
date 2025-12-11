'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

export default function EventDetailsPage() {
    const params = useParams();
    const eventId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl rounded-3xl border bg-background p-8 text-center shadow-lg"
            >
                <p className="text-sm font-medium text-primary">Event preview coming soon</p>
                <h1 className="mt-3 font-display text-3xl font-bold">
                    Event details are not available yet
                </h1>
                <p className="mt-3 text-muted-foreground">
                    We haven&apos;t connected real events to this page yet, so we can&apos;t load information for
                    <span className="mx-1 font-semibold">{eventId}</span>.
                    Once organisers publish events, this page will automatically show the official listing.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Button asChild>
                        <Link href="/events">Browse Events</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/events/new">Create an Event</Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
