'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Ticket,
    DollarSign,
    Users,
    ArrowLeft,
    ChevronDown,
    Eye,
    Clock,
    MapPin,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock events for selection
const events = [
    { id: 'all', name: 'All Events', image: '' },
    { id: '1', name: 'Community Iftar 2024', image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=100&h=100&fit=crop' },
    { id: '2', name: 'Islamic Finance Workshop', image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=100&h=100&fit=crop' },
    { id: '3', name: 'Youth Conference 2025', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop' },
];

// Mock analytics data
const getAnalyticsData = (eventId: string) => {
    if (eventId === 'all') {
        return {
            stats: [
                { title: 'Total Revenue', value: '£24,500', change: 23, icon: DollarSign },
                { title: 'Tickets Sold', value: '1,145', change: 18, icon: Ticket },
                { title: 'Page Views', value: '15.2K', change: 45, icon: Eye },
                { title: 'Attendees', value: '892', change: 15, icon: Users },
            ],
            revenue: [2400, 3200, 2800, 4100, 3800, 5200],
            tickets: [120, 180, 150, 220, 195, 280],
        };
    }
    return {
        stats: [
            { title: 'Event Revenue', value: '£4,500', change: 12, icon: DollarSign },
            { title: 'Tickets Sold', value: '450', change: 8, icon: Ticket },
            { title: 'Page Views', value: '3.2K', change: 25, icon: Eye },
            { title: 'Check-ins', value: '312', change: -5, icon: Users },
        ],
        revenue: [800, 1200, 900, 1600],
        tickets: [45, 80, 65, 110],
    };
};

const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [mounted, setMounted] = useState(false);
    const data = getAnalyticsData(selectedEvent);
    const maxRevenue = Math.max(...data.revenue);
    const maxTickets = Math.max(...data.tickets);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <Button variant="ghost" size="sm" className="mb-2" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Dashboard
                            </Link>
                        </Button>
                        <h1 className="font-display text-3xl font-bold">Analytics</h1>
                        <p className="text-muted-foreground">Track performance and insights</p>
                    </div>

                    {/* Event Selector */}
                    <div className="flex items-center gap-3">
                        {mounted ? (
                            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                                <SelectTrigger className="w-[280px] h-12 bg-background">
                                    <div className="flex items-center gap-3">
                                        {selectedEvent !== 'all' && (
                                            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
                                                <Image
                                                    src={events.find(e => e.id === selectedEvent)?.image || ''}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <SelectValue placeholder="Select event" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {events.map(event => (
                                        <SelectItem key={event.id} value={event.id}>
                                            <div className="flex items-center gap-3">
                                                {event.image && (
                                                    <div className="relative h-6 w-6 rounded overflow-hidden">
                                                        <Image src={event.image} alt="" fill className="object-cover" />
                                                    </div>
                                                )}
                                                {event.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="w-[280px] h-12 bg-background rounded-md border border-input" />
                        )}
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {data.stats.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="border-border/50 hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                            <div className={`flex items-center gap-1 text-sm mt-2 ${stat.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {stat.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                {Math.abs(stat.change)}%
                                            </div>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <stat.icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Section */}
                <Tabs defaultValue="revenue" className="space-y-6">
                    <TabsList className="bg-muted/50">
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="tickets">Ticket Sales</TabsTrigger>
                        <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    </TabsList>

                    <TabsContent value="revenue">
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Main Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="lg:col-span-2"
                            >
                                <Card className="border-border/50">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle className="text-lg">Revenue Over Time</CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <div className="h-3 w-3 rounded-full bg-primary" />
                                                Revenue
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-72 flex items-end justify-between gap-3 pt-8">
                                            {data.revenue.map((value, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        £{(value / 1000).toFixed(1)}k
                                                    </span>
                                                    <motion.div
                                                        className="w-full bg-gradient-to-t from-primary to-[oklch(0.72_0.15_185)] rounded-lg"
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${(value / maxRevenue) * 200}px` }}
                                                        transition={{ duration: 0.6, delay: i * 0.1 }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">{months[i]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Side Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Average Ticket Price</p>
                                        <p className="text-3xl font-bold mt-1">£21.40</p>
                                        <p className="text-sm text-green-600 mt-2">↑ 8% vs last period</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                        <p className="text-3xl font-bold mt-1">7.5%</p>
                                        <p className="text-sm text-green-600 mt-2">↑ 2.1% vs last period</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Refund Rate</p>
                                        <p className="text-3xl font-bold mt-1">1.2%</p>
                                        <p className="text-sm text-green-600 mt-2">↓ 0.3% vs last period</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tickets">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Ticket Sales Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-72 flex items-end justify-between gap-3 pt-8">
                                        {data.tickets.map((value, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">{value}</span>
                                                <motion.div
                                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-lg"
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${(value / maxTickets) * 200}px` }}
                                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                                />
                                                <span className="text-xs text-muted-foreground">{months[i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="engagement">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Engagement Metrics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-6 sm:grid-cols-3">
                                        <div className="text-center p-6 rounded-xl bg-muted/50">
                                            <p className="text-4xl font-bold text-primary">2:45</p>
                                            <p className="text-sm text-muted-foreground mt-2">Avg. Time on Page</p>
                                        </div>
                                        <div className="text-center p-6 rounded-xl bg-muted/50">
                                            <p className="text-4xl font-bold text-primary">68%</p>
                                            <p className="text-sm text-muted-foreground mt-2">Bounce Rate</p>
                                        </div>
                                        <div className="text-center p-6 rounded-xl bg-muted/50">
                                            <p className="text-4xl font-bold text-primary">4.2</p>
                                            <p className="text-sm text-muted-foreground mt-2">Pages per Session</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs>

                {/* Event Performance Table */}
                {selectedEvent === 'all' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8"
                    >
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Event Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Event</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Views</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tickets</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Conv.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {events.slice(1).map(event => (
                                                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative h-10 w-14 rounded-lg overflow-hidden">
                                                                <Image src={event.image} alt="" fill className="object-cover" />
                                                            </div>
                                                            <span className="font-medium">{event.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-muted-foreground">3.2K</td>
                                                    <td className="py-4 px-4 text-right">450</td>
                                                    <td className="py-4 px-4 text-right font-medium">£4,500</td>
                                                    <td className="py-4 px-4 text-right text-green-600">14.1%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
