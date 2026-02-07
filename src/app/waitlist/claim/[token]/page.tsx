'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { claimWaitlistOffer } from '@/lib/checkout-api';

export default function WaitlistClaimPage() {
    const params = useParams<{ token: string }>();
    const token = useMemo(() => (Array.isArray(params?.token) ? params.token[0] : params?.token) ?? '', [params?.token]);

    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeGender, setAttendeeGender] = useState<'male' | 'female' | ''>('');
    const [attendeeAge, setAttendeeAge] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token) {
            setErrorMessage('This waitlist link is invalid.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const ageNumber = attendeeAge.trim() ? Number(attendeeAge) : undefined;
            const response = await claimWaitlistOffer(token, {
                attendeeName: attendeeName.trim(),
                attendeeEmail: attendeeEmail.trim(),
                attendeeGender: attendeeGender as 'male' | 'female',
                attendeeAge: typeof ageNumber === 'number' && Number.isFinite(ageNumber)
                    ? Math.max(13, Math.min(120, Math.floor(ageNumber)))
                    : undefined,
                useSharedInfo: true
            });

            if (!response.success) {
                setErrorMessage(response.message || 'Unable to claim this waitlist offer.');
                return;
            }

            if (response.checkoutUrl) {
                window.location.href = response.checkoutUrl;
                return;
            }

            if (response.orderId) {
                window.location.href = `/checkout/success?order_id=${response.orderId}`;
                return;
            }

            setErrorMessage('This waitlist offer could not be completed.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to claim this waitlist offer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Claim Your Waitlist Offer</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Complete your details to claim your reserved ticket before the link expires.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="attendeeName">Full name</Label>
                            <Input
                                id="attendeeName"
                                value={attendeeName}
                                onChange={(e) => setAttendeeName(e.target.value)}
                                minLength={2}
                                maxLength={80}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="attendeeEmail">Email</Label>
                            <Input
                                id="attendeeEmail"
                                type="email"
                                value={attendeeEmail}
                                onChange={(e) => setAttendeeEmail(e.target.value)}
                                maxLength={254}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="attendeeAge">Age</Label>
                                <Input
                                    id="attendeeAge"
                                    type="number"
                                    min={13}
                                    max={120}
                                    value={attendeeAge}
                                    onChange={(e) => setAttendeeAge(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select
                                    value={attendeeGender}
                                    onValueChange={(value) => setAttendeeGender(value as 'male' | 'female')}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {errorMessage ? (
                            <p className="text-sm text-destructive">{errorMessage}</p>
                        ) : null}
                        <Button type="submit" className="w-full" disabled={isSubmitting || !attendeeGender}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Claiming...
                                </>
                            ) : (
                                'Claim Ticket'
                            )}
                        </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                        Link expired? <Link href="/events" className="underline">Browse events</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
