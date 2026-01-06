'use client';

import { useState } from 'react';
import { Archive, Trash2, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { archiveEvent } from '@/lib/events-api';

interface DeleteEventDialogProps {
    eventId: string;
    eventTitle: string;
    eventStatus?: 'draft' | 'published' | 'cancelled' | 'archived' | string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DeleteEventDialog({
    eventId,
    eventTitle,
    eventStatus,
    open,
    onOpenChange,
    onSuccess,
}: DeleteEventDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isDraft = eventStatus === 'draft';

    const handleAction = async () => {
        try {
            setIsDeleting(true);
            setError(null);
            if (isDraft) {
                await api.delete(`/api/v1/events/${eventId}`);
            } else {
                await archiveEvent(eventId);
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : isDraft
                    ? 'Failed to delete event'
                    : 'Failed to archive event';
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${isDraft ? 'text-destructive' : 'text-foreground'}`}>
                        {isDraft ? <Trash2 className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                        {isDraft ? 'Delete Draft' : 'Archive Event'}
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-sm text-muted-foreground space-y-3 pt-2">
                            <p>
                                {isDraft ? 'Are you sure you want to delete' : 'Are you sure you want to archive'}{' '}
                                <span className="font-semibold text-foreground">&quot;{eventTitle}&quot;</span>?
                            </p>
                            {isDraft ? (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive font-medium">
                                        This action cannot be undone. All event data, tickets, and orders will be permanently
                                        removed.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 p-3 bg-muted/60 border border-border/60 rounded-md">
                                    <Archive className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <p className="text-sm text-muted-foreground font-medium">
                                        Archived events are hidden from public listings and checkout. You can still view
                                        them in your dashboard.
                                    </p>
                                </div>
                            )}
                            {error && (
                                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                    {error}
                                </p>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={isDraft ? 'destructive' : 'secondary'}
                        onClick={handleAction}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <div className="h-4 w-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                {isDraft ? 'Deleting...' : 'Archiving...'}
                            </>
                        ) : (
                            <>
                                {isDraft ? <Trash2 className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                                {isDraft ? 'Delete Draft' : 'Archive Event'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
