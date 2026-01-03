import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CreditMetricCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    subtextClassName?: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function CreditMetricCard({
    title,
    value,
    subtext,
    subtextClassName,
    icon: Icon,
    actionLabel,
    onAction,
    className,
}: CreditMetricCardProps) {
    return (
        <Card className={cn('overflow-hidden relative', className)}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                        </div>
                        {subtext && (
                            <p className={cn('text-xs', subtextClassName || 'text-muted-foreground')}>
                                {subtext}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                    )}
                </div>
                {actionLabel && onAction && (
                    <div className="mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={onAction}
                        >
                            {actionLabel}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
