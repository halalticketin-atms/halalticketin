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
            'rounded-xl border-border/60 shadow-sm transition-all duration-200',
            isCheckedIn && 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-800/40'
        )}>
            <CardContent className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                            isCheckedIn
                                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                : 'bg-muted/60'
                        )}>
                            {isCheckedIn ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <User className="h-4 w-4 text-muted-foreground/60" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{ticket.attendeeName}</p>
                            <p className="text-xs text-muted-foreground/60 truncate">{ticket.attendeeEmail}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0 h-5 rounded-md">
                                    {ticket.ticketType}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground/40 font-medium">
                                    #{ticket.orderNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isCheckedIn ? (
                            <>
                                <div className="text-right hidden sm:block">
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Checked in</p>
                                    {ticket.checkedInAt && (
                                        <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 justify-end mt-0.5">
                                            <Clock className="h-3 w-3" />
                                            {new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                                {onUndo && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-foreground"
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
                                    className="h-9 rounded-xl text-xs font-bold gap-1.5 px-3.5"
                                    onClick={() => onCheckIn(ticket.id)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="h-3.5 w-3.5" />
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
