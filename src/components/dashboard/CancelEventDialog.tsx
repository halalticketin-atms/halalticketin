'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cancelEvent } from '@/lib/events-api';

interface CancelEventDialogProps {
    eventId: string;
    eventTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CancelEventDialog({
    eventId,
    eventTitle,
    open,
    onOpenChange,
    onSuccess,
}: CancelEventDialogProps) {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setReason('');
            setNotes('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [open]);

    const handleCancelEvent = async () => {
        const trimmedReason = reason.trim();
        if (trimmedReason.length < 3) {
            setError('Please provide a short cancellation reason.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await cancelEvent(eventId, {
                reason: trimmedReason,
                notes: notes.trim() ? notes.trim() : null,
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to cancel event';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Event
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-sm text-muted-foreground space-y-3 pt-2">
                            <p>
                                You are about to cancel{' '}
                                <span className="font-semibold text-foreground">&quot;{eventTitle}&quot;</span>.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Attendees will be notified by email. Refunds are handled by the organiser based on their policy.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="cancel-reason">
                            Reason
                        </label>
                        <Input
                            id="cancel-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="e.g. Venue unavailable, speaker issue"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="cancel-notes">
                            Message to attendees (optional)
                        </label>
                        <Textarea
                            id="cancel-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Share any helpful info about next steps or refunds."
                            rows={4}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                            {error}
                        </p>
                    )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Keep Event
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleCancelEvent}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Cancelling...' : 'Cancel Event'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
