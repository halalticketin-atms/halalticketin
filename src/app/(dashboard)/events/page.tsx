import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EventListItem } from '@/types';

// Placeholder data
const events: EventListItem[] = [
    {
        id: '1',
        name: 'Community Iftar 2024',
        date: 'Dec 15, 2024',
        location: 'London Central Mosque',
        tickets: { sold: 45, total: 100 },
        revenue: '£450',
        status: 'published',
    },
    {
        id: '2',
        name: 'Islamic Finance Workshop',
        date: 'Jan 10, 2025',
        location: 'Online',
        tickets: { sold: 28, total: 50 },
        revenue: '£1,400',
        status: 'published',
    },
    {
        id: '3',
        name: 'Youth Conference 2025',
        date: 'Feb 1, 2025',
        location: 'Birmingham ICC',
        tickets: { sold: 0, total: 500 },
        revenue: '£0',
        status: 'draft',
    },
];

function EventCard({ event }: { event: EventListItem }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <CardDescription>
                            {event.date} • {event.location}
                        </CardDescription>
                    </div>
                    <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                        {event.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {event.tickets.sold} / {event.tickets.total} tickets sold
                        </p>
                        <p className="text-lg font-semibold">{event.revenue} revenue</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${event.id}`}>Manage</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EventsPage() {
    const publishedEvents = events.filter((e) => e.status === 'published');
    const draftEvents = events.filter((e) => e.status === 'draft');

    return (
        <div className="container py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Events</h1>
                    <p className="text-muted-foreground">Manage your events and track performance</p>
                </div>
                <Button asChild>
                    <Link href="/events/create">Create Event</Link>
                </Button>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="all">All Events ({events.length})</TabsTrigger>
                    <TabsTrigger value="published">Published ({publishedEvents.length})</TabsTrigger>
                    <TabsTrigger value="draft">Drafts ({draftEvents.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </TabsContent>

                <TabsContent value="published" className="space-y-4">
                    {publishedEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </TabsContent>

                <TabsContent value="draft" className="space-y-4">
                    {draftEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}
