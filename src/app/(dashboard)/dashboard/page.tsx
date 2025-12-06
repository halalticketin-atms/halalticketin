import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StatCardItem, RecentEventItem } from '@/types';

// Placeholder data
const stats: StatCardItem[] = [
    { label: 'Total Events', value: '12', change: '+2 this month' },
    { label: 'Tickets Sold', value: '1,234', change: '+156 this week' },
    { label: 'Total Revenue', value: '£8,450', change: '+£1,200 this month' },
    { label: 'Upcoming Events', value: '3', change: 'Next: Dec 15' },
];

const recentEvents: RecentEventItem[] = [
    { id: '1', name: 'Community Iftar 2024', date: 'Dec 15, 2024', tickets: 45, status: 'published' },
    { id: '2', name: 'Islamic Finance Workshop', date: 'Jan 10, 2025', tickets: 28, status: 'draft' },
    { id: '3', name: 'Youth Conference 2025', date: 'Feb 1, 2025', tickets: 0, status: 'draft' },
];

export default function DashboardPage() {
    return (
        <div className="container py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back! Here&apos;s your event overview.</p>
                </div>
                <Button asChild>
                    <Link href="/events/create">Create Event</Link>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardDescription>{stat.label}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Events */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                    <CardDescription>Your latest events and their status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between rounded-lg border p-4"
                            >
                                <div>
                                    <p className="font-medium">{event.name}</p>
                                    <p className="text-sm text-muted-foreground">{event.date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{event.tickets} tickets</p>
                                    </div>
                                    <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                                        {event.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-center">
                        <Button variant="outline" asChild>
                            <Link href="/events">View All Events</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
