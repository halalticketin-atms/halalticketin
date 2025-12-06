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

const defaultActions: QuickAction[] = [
    {
        title: 'Create Event',
        description: 'Start a new event',
        icon: Plus,
        href: '/events/create',
        color: 'bg-primary/10 text-primary',
    },
    {
        title: 'View Analytics',
        description: 'Check performance',
        icon: BarChart3,
        href: '/dashboard/analytics',
        color: 'bg-blue-100 text-blue-600',
    },
    {
        title: 'Manage Tickets',
        description: 'View all orders',
        icon: Ticket,
        href: '/dashboard/tickets',
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
}

export function QuickActions({ actions = defaultActions }: QuickActionsProps) {
    return (
        <Card className="border-border/50">
            <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {actions.map((action, index) => (
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
