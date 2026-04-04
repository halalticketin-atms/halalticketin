'use client';

import { useState } from 'react';
import { UserPlus, Clock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { TEMP_CHECK_IN_ACCESS_ENABLED } from '@/lib/check-in-flags';

interface TempStaffDialogProps {
    eventId: string;
    eventName: string;
}

interface TempAccessResponse {
    temporaryAccess: {
        id: string;
        email: string;
        accessType: string;
        status: string;
        expiresAt: string;
    };
    acceptUrl: string;
    emailSent: boolean;
}

export function TempStaffDialog({ eventId, eventName }: TempStaffDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState<{ url: string; emailSent: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await api.post<TempAccessResponse>(
                `/api/v1/events/${eventId}/temporary-access`,
                { email: email.trim() }
            );
            setSuccess({
                url: response.acceptUrl,
                emailSent: response.emailSent
            });
            setEmail('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invite');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        // Reset state after close animation
        setTimeout(() => {
            setSuccess(null);
            setError(null);
            setEmail('');
        }, 200);
    };

    if (!TEMP_CHECK_IN_ACCESS_ENABLED) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled
                title="Temporary check-in access is currently disabled"
            >
                <UserPlus className="h-4 w-4" />
                Temporary Staff Disabled
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Temporary Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Temporary Check-in Staff</DialogTitle>
                    <DialogDescription>
                        Invite someone to help with check-in for <strong>{eventName}</strong>.
                        Access expires automatically after 24 hours.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="space-y-4 py-4">
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                            <Mail className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                {success.emailSent
                                    ? 'Invitation sent! They will receive an email shortly.'
                                    : 'Invitation created. Share the link below:'}
                            </AlertDescription>
                        </Alert>

                        {!success.emailSent && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Share this link:</Label>
                                <Input
                                    readOnly
                                    value={success.url}
                                    className="text-xs font-mono"
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Access expires in 24 hours</span>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="staff@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    They&apos;ll receive a link to access check-in for this event only.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading || !email.trim()}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Invite'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
