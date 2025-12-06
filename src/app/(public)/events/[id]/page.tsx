import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventDetails } from '@/types';

// Placeholder - In real app, this would fetch from API
async function getEvent(id: string): Promise<EventDetails | null> {
    const events: Record<string, EventDetails> = {
        '1': {
            id: '1',
            title: 'Community Iftar 2024',
            description:
                'Join us for a beautiful community iftar gathering. We will be hosting a special evening of breaking fast together, featuring traditional dishes and a wonderful atmosphere of brotherhood and sisterhood.',
            date: 'December 15, 2024',
            time: '4:30 PM - 8:00 PM',
            location: 'London Central Mosque',
            address: '146 Park Road, London NW8 7RG',
            organizer: 'London Muslim Community',
            tickets: [
                { name: 'General Admission', price: 10, available: 55 },
                { name: 'Family Pass (4)', price: 30, available: 20 },
            ],
            imageUrl: '/placeholder-event.jpg',
        },
    };
    return events[id] || null;
}

export default async function EventDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const event = await getEvent(id);

    if (!event) {
        notFound();
    }

    return (
        <div className="container py-8">
            {/* Hero */}
            <div className="mb-8 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 p-8">
                <Badge className="mb-4">Upcoming Event</Badge>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{event.title}</h1>
                <p className="mt-4 max-w-2xl text-muted-foreground">{event.description}</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                                <p className="font-medium">
                                    {event.date} • {event.time}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Location</p>
                                <p className="font-medium">{event.location}</p>
                                <p className="text-sm text-muted-foreground">{event.address}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Organizer</p>
                                <p className="font-medium">{event.organizer}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Ticket Selection */}
                <div>
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Get Tickets</CardTitle>
                            <CardDescription>Select your tickets below</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {event.tickets.map((ticket) => (
                                <div key={ticket.name} className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <p className="font-medium">{ticket.name}</p>
                                        <p className="text-sm text-muted-foreground">{ticket.available} available</p>
                                    </div>
                                    <p className="font-semibold">£{ticket.price}</p>
                                </div>
                            ))}
                            <Button className="w-full" size="lg">
                                Get Tickets
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
