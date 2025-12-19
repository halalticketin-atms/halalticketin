'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StripeConnectStatus } from '@/components/stripe-connect-status';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import {
    Loader2,
    AlertCircle,
    Check,
    User,
    Coins,
    Target,
    CreditCard,
    ExternalLink
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'currency' | 'marketing' | 'payments';

interface TabItem {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    organizerOnly?: boolean;
}

const TABS: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'currency', label: 'Currency', icon: Coins, organizerOnly: true },
    { id: 'marketing', label: 'Marketing', icon: Target, organizerOnly: true },
    { id: 'payments', label: 'Payments', icon: CreditCard, organizerOnly: true },
];

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { activeOrganizerId, organizers, isLoading: organizersLoading, refresh } = useOrganizers();

    const isLoading = authLoading || organizersLoading;
    const hasOrganizer = organizers.length > 0;
    const currentOrganizer = organizers.find(o => o.id === activeOrganizerId);

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        currentOrganizer?.defaultCurrency || 'GBP'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [metaPixelInput, setMetaPixelInput] = useState<string>(currentOrganizer?.metaPixelId || '');
    const [isSavingMetaPixel, setIsSavingMetaPixel] = useState(false);
    const [metaPixelStatus, setMetaPixelStatus] = useState<'success' | 'error' | null>(null);
    const [metaPixelError, setMetaPixelError] = useState<string | null>(null);

    // Filter tabs based on organizer status
    const visibleTabs = TABS.filter(tab => !tab.organizerOnly || hasOrganizer);

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

    // Loading state
    if (isLoading) {
        return (
            <div className="container py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            {/* Main Content with Glass Surface */}
            <div className="glass-surface border border-white/50 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Side Navigation */}
                    <nav className="lg:w-56 flex-shrink-0">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap',
                                        activeTab === tab.id
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    )}
                                >
                                    <tab.icon className="h-5 w-5 shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Profile</h2>
                                    <p className="text-muted-foreground text-sm">Update your personal information</p>
                                </div>

                                <div className="space-y-4 max-w-lg">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-muted-foreground">Display Name</Label>
                                        <Input
                                            id="name"
                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                            placeholder="Your display name"
                                            defaultValue={user?.name || ''}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 opacity-60"
                                            placeholder="your@email.com"
                                            defaultValue={user?.email || ''}
                                            disabled
                                        />
                                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio" className="text-muted-foreground">Bio</Label>
                                        <Input
                                            id="bio"
                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                            placeholder="Tell us about yourself"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <Button className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl">
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Currency Tab */}
                        {activeTab === 'currency' && hasOrganizer && activeOrganizerId && (
                            <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Default Currency</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Set the default currency for new events created by {currentOrganizer?.name || 'your organization'}
                                    </p>
                                </div>

                                <div className="space-y-4 max-w-lg">
                                    <div className="space-y-2">
                                        <Label htmlFor="currency" className="text-muted-foreground">Currency</Label>
                                        <select
                                            id="currency"
                                            value={selectedCurrency}
                                            onChange={(e) => setSelectedCurrency(e.target.value)}
                                            className="flex h-11 w-full rounded-xl border border-input glass-surface backdrop-blur-sm px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                        >
                                            {currencyOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            onClick={handleSaveCurrency}
                                            disabled={isSaving || selectedCurrency === currentOrganizer?.defaultCurrency}
                                            className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
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
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Marketing Tab */}
                        {activeTab === 'marketing' && hasOrganizer && activeOrganizerId && (
                            <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Meta Pixel Tracking</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Track ad performance on your event pages
                                    </p>
                                </div>

                                <div className="space-y-4 max-w-lg">
                                    {/* Info Box */}
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                        <p className="text-sm text-muted-foreground">
                                            Allow your Meta ads to measure views, checkouts, and purchases on your event + checkout pages (after attendees accept optional cookies).
                                        </p>
                                        <a
                                            href="https://www.facebook.com/business/help/952192354843755"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                                        >
                                            Learn how to verify events in Meta Events Manager
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="metaPixelId" className="text-muted-foreground">Meta Pixel ID</Label>
                                        <Input
                                            id="metaPixelId"
                                            value={metaPixelInput}
                                            onChange={(event) => setMetaPixelInput(event.target.value.replace(/\D/g, ''))}
                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                            placeholder="e.g. 123456789012345"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            We only load this pixel for your public event and checkout pages after attendees opt into marketing cookies.
                                        </p>
                                        {metaPixelStatus === 'success' && (
                                            <p className="text-sm text-green-600 flex items-center gap-1">
                                                <Check className="h-4 w-4" />
                                                Pixel ID saved.
                                            </p>
                                        )}
                                        {metaPixelStatus === 'error' && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {metaPixelError || 'Unable to save Pixel ID.'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setMetaPixelInput('')}
                                            disabled={isSavingMetaPixel || (!metaPixelInput && !currentOrganizer?.metaPixelId)}
                                            className="rounded-xl"
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            onClick={handleSaveMetaPixel}
                                            disabled={isSavingMetaPixel || !metaPixelChanged}
                                            className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                        >
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
                                </div>
                            </div>
                        )}

                        {/* Payments Tab */}
                        {activeTab === 'payments' && (
                            <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Payment Settings</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Connect your Stripe account for payouts
                                    </p>
                                </div>

                                {hasOrganizer && activeOrganizerId ? (
                                    <div className="space-y-4">
                                        {currentOrganizer && (
                                            <div className="text-sm text-muted-foreground">
                                                Managing payments for: <span className="font-medium text-foreground">{currentOrganizer.name}</span>
                                            </div>
                                        )}
                                        <StripeConnectStatus organizerId={activeOrganizerId} />
                                    </div>
                                ) : (
                                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                                        <div className="flex items-start gap-3 text-muted-foreground">
                                            <AlertCircle className="h-5 w-5 mt-0.5 text-amber-500" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Organizer profile required</p>
                                                <p className="text-sm mt-1">
                                                    Create an organizer profile first to set up payments.
                                                </p>
                                                <Button variant="outline" className="mt-3 rounded-xl" asChild>
                                                    <a href="/dashboard">Create Organizer Profile</a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
