'use client';

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    delay?: number;
}

export function StatCard({ title, value, icon: Icon, trend, delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Card className="border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{title}</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
                            {trend && (
                                <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
                                </p>
                            )}
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-6 w-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
