'use client';

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useOptimizedAnimation } from '@/hooks/useOptimizedAnimation';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    delay?: number;
    color?: 'default' | 'green' | 'blue' | 'purple';
}

const colorStyles = {
    default: {
        card: 'border-border/50 hover:border-primary/20',
        icon: 'bg-primary/10 text-primary',
    },
    green: {
        card: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900',
        icon: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg',
    },
    blue: {
        card: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900',
        icon: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg',
    },
    purple: {
        card: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900',
        icon: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg',
    },
};

export function StatCard({ title, value, icon: Icon, trend, delay = 0, color = 'default' }: StatCardProps) {
    const styles = colorStyles[color];
    const anim = useOptimizedAnimation();

    return (
        <motion.div
            initial={anim.initial}
            animate={anim.animate}
            transition={{ ...anim.transition, delay: delay * anim.staggerDelay * 3 }}
        >
            <Card className={`${styles.card} transition-colors`}>
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
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}>
                            <Icon className="h-6 w-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

