'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { LucideIcon, Plus, BarChart3, Ticket, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickAction {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
}

const defaultActions = (organizerId?: string): QuickAction[] => [
    {
        title: 'Create Event',
        description: 'Start a new event',
        icon: Plus,
        href: organizerId ? `/events/new?organizerId=${organizerId}` : '/events/new',
        color: 'bg-primary/10 text-primary',
    },
    {
        title: 'View Analytics',
        description: 'Check performance',
        icon: BarChart3,
        href: organizerId ? `/dashboard/o/${organizerId}/analytics` : '/dashboard/analytics',
        color: 'bg-blue-100 text-blue-600',
    },
    {
        title: 'Manage Orders',
        description: 'View ticket sales',
        icon: Ticket,
        href: organizerId ? `/dashboard/o/${organizerId}/orders` : '/dashboard/orders',
        color: 'bg-green-100 text-green-600',
    },
    {
        title: 'Settings',
        description: 'Account & preferences',
        icon: Settings,
        href: '/settings',
        color: 'bg-gray-100 text-gray-600',
    },
];

interface QuickActionsProps {
    actions?: QuickAction[];
    organizerId?: string;
}

export function QuickActions({ actions, organizerId }: QuickActionsProps) {
    const resolvedActions = actions ?? defaultActions(organizerId);
    return (
        <Card className="border-border/50 overflow-hidden">
            <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                    {resolvedActions.map((action, index) => (
                        <motion.div
                            key={action.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            <Link
                                href={action.href}
                                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all group"
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                                    <action.icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{action.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
