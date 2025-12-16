'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StripeConnectStatus } from '@/components/stripe-connect-status';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { activeOrganizerId, organizers, isLoading: organizersLoading } = useOrganizers();

    const isLoading = authLoading || organizersLoading;
    const hasOrganizer = organizers.length > 0;
    const currentOrganizer = organizers.find(o => o.id === activeOrganizerId);

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
