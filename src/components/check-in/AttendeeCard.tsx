'use client';

import { User, CheckCircle, Clock, Undo2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CheckInTicket } from '@/types';

interface AttendeeCardProps {
    ticket: CheckInTicket;
    isUpdating?: boolean;
    onCheckIn?: (ticketId: string) => void;
    onUndo?: (ticketId: string) => void;
}

export function AttendeeCard({ ticket, isUpdating, onCheckIn, onUndo }: AttendeeCardProps) {
    const isCheckedIn = ticket.checkInStatus === 'checked_in';

    return (
        <Card className={cn(
            'transition-all',
            isCheckedIn && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
        )}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                            isCheckedIn
                                ? 'bg-green-100 dark:bg-green-900'
                                : 'bg-muted'
                        )}>
                            {isCheckedIn ? (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium truncate">{ticket.attendeeName}</p>
                            <p className="text-sm text-muted-foreground truncate">{ticket.attendeeEmail}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                    {ticket.ticketType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    #{ticket.orderNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isCheckedIn ? (
                            <>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Checked in</p>
                                    {ticket.checkedInAt && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(ticket.checkedInAt).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                                {onUndo && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onUndo(ticket.id)}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Undo2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </>
                        ) : (
                            onCheckIn && (
                                <Button
                                    size="sm"
                                    onClick={() => onCheckIn(ticket.id)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                    )}
                                    Check In
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
