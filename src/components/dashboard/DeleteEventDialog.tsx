'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
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

interface DeleteEventDialogProps {
    eventId: string;
    eventTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DeleteEventDialog({
    eventId,
    eventTitle,
    open,
    onOpenChange,
    onSuccess,
}: DeleteEventDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            setError(null);
            await api.delete(`/api/v1/events/${eventId}`);

            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete event';
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Event
                    </DialogTitle>
                    <DialogDescription className="space-y-3 pt-2">
                        <p>
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-foreground">&quot;{eventTitle}&quot;</span>?
                        </p>
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive font-medium">
                                This action cannot be undone. All event data, tickets, and orders will be permanently
                                removed.
                            </p>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                {error}
                            </p>
                        )}
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
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <div className="h-4 w-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Event
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

