'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StripeConnectStatus } from '@/components/stripe-connect-status';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';
import api from '@/lib/api';

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { activeOrganizerId, organizers, isLoading: organizersLoading, refresh } = useOrganizers();

    const isLoading = authLoading || organizersLoading;
    const hasOrganizer = organizers.length > 0;
    const currentOrganizer = organizers.find(o => o.id === activeOrganizerId);

    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        currentOrganizer?.defaultCurrency || 'GBP'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [metaPixelInput, setMetaPixelInput] = useState<string>(currentOrganizer?.metaPixelId || '');
    const [isSavingMetaPixel, setIsSavingMetaPixel] = useState(false);
    const [metaPixelStatus, setMetaPixelStatus] = useState<'success' | 'error' | null>(null);
    const [metaPixelError, setMetaPixelError] = useState<string | null>(null);

    useEffect(() => {
        if (currentOrganizer?.defaultCurrency) {
            setSelectedCurrency(currentOrganizer.defaultCurrency);
        }
    }, [currentOrganizer?.defaultCurrency]);

    useEffect(() => {
        setMetaPixelInput(currentOrganizer?.metaPixelId || '');
    }, [currentOrganizer?.metaPixelId]);

    const handleSaveCurrency = async () => {
        if (!activeOrganizerId) return;

        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, {
                defaultCurrency: selectedCurrency
            });
            setSaveSuccess(true);
            await refresh();
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch {
            // Error handled by API layer
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMetaPixel = async () => {
        if (!activeOrganizerId) return;

        setIsSavingMetaPixel(true);
        setMetaPixelStatus(null);
        setMetaPixelError(null);

        const payloadValue = metaPixelInput.trim();

        try {
            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, {
                metaPixelId: payloadValue === '' ? null : payloadValue
            });
            setMetaPixelStatus('success');
            await refresh();
            setTimeout(() => setMetaPixelStatus(null), 2000);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to update Meta Pixel ID. Please try again.';
            setMetaPixelStatus('error');
            setMetaPixelError(message);
        } finally {
            setIsSavingMetaPixel(false);
        }
    };

    const normalizedPixelInput = metaPixelInput.trim();
    const normalizedCurrentPixel = currentOrganizer?.metaPixelId || '';
    const metaPixelChanged = normalizedPixelInput !== normalizedCurrentPixel;

    const currencyOptions = Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => ({
        value: code,
        label: `${info.symbol} ${code} - ${info.name}`
    }));

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <div className="mx-auto max-w-2xl space-y-6">
                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Update your profile information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                placeholder="Your display name"
                                defaultValue={user?.name || ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                defaultValue={user?.email || ''}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Input id="bio" placeholder="Tell us about yourself" />
                        </div>
                        <Button>Save Changes</Button>
                    </CardContent>
                </Card>

                {/* Currency & Marketing Settings - Only for Organizers */}
                {hasOrganizer && activeOrganizerId && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Default Currency</CardTitle>
                                <CardDescription>
                                    Set the default currency for new events created by {currentOrganizer?.name || 'your organization'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <select
                                        id="currency"
                                        value={selectedCurrency}
                                        onChange={(e) => setSelectedCurrency(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {currencyOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button
                                    onClick={handleSaveCurrency}
                                    disabled={isSaving || selectedCurrency === currentOrganizer?.defaultCurrency}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : saveSuccess ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Saved
                                        </>
                                    ) : (
                                        'Save Currency'
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Meta Pixel Tracking</CardTitle>
                                <CardDescription>
                                    Allow your Meta ads to measure views, checkouts, and purchases on your event + checkout pages (after attendees consent to marketing cookies).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="metaPixelId">Meta Pixel ID</Label>
                                    <Input
                                        id="metaPixelId"
                                        value={metaPixelInput}
                                        onChange={(event) => setMetaPixelInput(event.target.value.replace(/\D/g, ''))}
                                        placeholder="e.g. 123456789012345"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        We only load this pixel for your public event and checkout pages after attendees opt into marketing cookies.
                                    </p>
                                    {metaPixelStatus === 'success' && (
                                        <p className="text-sm text-green-600">Pixel ID saved.</p>
                                    )}
                                    {metaPixelStatus === 'error' && (
                                        <p className="text-sm text-destructive">{metaPixelError || 'Unable to save Pixel ID.'}</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={() => setMetaPixelInput('')} disabled={isSavingMetaPixel || (!metaPixelInput && !currentOrganizer?.metaPixelId)}>
                                        Clear
                                    </Button>
                                    <Button onClick={handleSaveMetaPixel} disabled={isSavingMetaPixel || !metaPixelChanged}>
                                        {isSavingMetaPixel ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Pixel'
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Payment Settings - Stripe Connect */}
                {isLoading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                ) : hasOrganizer && activeOrganizerId ? (
                    <>
                        {currentOrganizer && (
                            <div className="text-sm text-muted-foreground mb-2">
                                Managing payments for: <span className="font-medium text-foreground">{currentOrganizer.name}</span>
                            </div>
                        )}
                        <StripeConnectStatus organizerId={activeOrganizerId} />
                    </>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Settings</CardTitle>
                            <CardDescription>Connect your Stripe account for payouts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-3 text-muted-foreground">
                                <AlertCircle className="h-5 w-5 mt-0.5" />
                                <div>
                                    <p className="text-sm">
                                        Create an organizer profile first to set up payments.
                                    </p>
                                    <Button variant="outline" className="mt-3" asChild>
                                        <a href="/dashboard">Create Organizer Profile</a>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
