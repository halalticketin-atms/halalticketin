'use client';

import { toast } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ToastTestPage() {
    // Simulate async operation
    const simulateAsync = () => new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate error
    const simulateError = () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Simulated error message')), 2000)
    );

    return (
        <div className="min-h-screen bg-muted/30 py-12">
            <div className="container max-w-4xl">
                <div className="mb-8">
                    <h1 className="font-display text-3xl font-bold mb-2">Toast Notification Test Page</h1>
                    <p className="text-muted-foreground">Test all toast variants and features</p>
                </div>

                {/* Basic Toasts */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Basic Toasts</CardTitle>
                        <CardDescription>Standard notification types</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Button
                            onClick={() => toast.success('Success!', { description: 'Operation completed successfully' })}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            Success
                        </Button>

                        <Button
                            onClick={() => toast.error(new Error('Something went wrong'), 'Error occurred')}
                            variant="destructive"
                        >
                            Error
                        </Button>

                        <Button
                            onClick={() => toast.warning('Warning!', { description: 'Please review your changes' })}
                            className="bg-amber-500 hover:bg-amber-600"
                        >
                            Warning
                        </Button>

                        <Button
                            onClick={() => toast.info('Info', { description: 'Here is some helpful information' })}
                            className="bg-sky-500 hover:bg-sky-600"
                        >
                            Info
                        </Button>
                    </CardContent>
                </Card>

                {/* Promise Toasts */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Promise-Based Toasts</CardTitle>
                        <CardDescription>Automatic loading → success/error states</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            onClick={() => {
                                toast.promise(
                                    simulateAsync(),
                                    {
                                        loading: 'Processing...',
                                        success: 'Completed successfully! 🎉',
                                        error: 'Operation failed',
                                    }
                                );
                            }}
                        >
                            Promise Success
                        </Button>

                        <Button
                            onClick={() => {
                                toast.promise(
                                    simulateError(),
                                    {
                                        loading: 'Attempting operation...',
                                        success: 'Done!',
                                        error: 'Something went wrong',
                                    }
                                );
                            }}
                            variant="outline"
                        >
                            Promise Error
                        </Button>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>With Action Buttons</CardTitle>
                        <CardDescription>Toasts with interactive actions</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3">
                        <Button
                            onClick={() => {
                                toast.success('Profile updated!', {
                                    description: 'Your changes have been saved',
                                    action: {
                                        label: 'View Profile',
                                        onClick: () => console.log('View profile clicked'),
                                    },
                                });
                            }}
                        >
                            Success with Action
                        </Button>

                        <Button
                            onClick={() => {
                                toast.error(new Error('Payment failed'), 'Payment could not be processed', {
                                    action: {
                                        label: 'Try Again',
                                        onClick: () => console.log('Retry clicked'),
                                    },
                                    duration: 10000,
                                });
                            }}
                            variant="destructive"
                        >
                            Error with Retry Action
                        </Button>
                    </CardContent>
                </Card>

                {/* Duration Examples */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Custom Durations</CardTitle>
                        <CardDescription>Different display times</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                            onClick={() => toast.success('Quick toast', { duration: 2000 })}
                            variant="outline"
                        >
                            2 seconds (brief)
                        </Button>

                        <Button
                            onClick={() => toast.info('Standard', { duration: 4000 })}
                            variant="outline"
                        >
                            4 seconds (default)
                        </Button>

                        <Button
                            onClick={() => toast.warning('Extended', { duration: 8000 })}
                            variant="outline"
                        >
                            8 seconds (long)
                        </Button>
                    </CardContent>
                </Card>

                {/* Real-World Examples */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Real-World Scenarios</CardTitle>
                        <CardDescription>Common use cases from the app</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                                onClick={() => {
                                    toast.success('Welcome back! 👋', {
                                        description: 'Logged in as user@example.com',
                                        duration: 3000,
                                    });
                                }}
                                variant="outline"
                            >
                                Login Success
                            </Button>

                            <Button
                                onClick={() => {
                                    toast.success('Event created successfully! 🎉', {
                                        description: 'Your event is now live',
                                        action: {
                                            label: 'View Event',
                                            onClick: () => console.log('Navigate to event'),
                                        },
                                    });
                                }}
                                variant="outline"
                            >
                                Event Created
                            </Button>

                            <Button
                                onClick={() => {
                                    toast.success('Tickets purchased! 🎫', {
                                        description: 'Check your email for confirmation',
                                    });
                                }}
                                variant="outline"
                            >
                                Ticket Purchase
                            </Button>

                            <Button
                                onClick={() => {
                                    toast.warning('Please wait', {
                                        description: 'You can resend in 45 seconds',
                                        duration: 3000,
                                    });
                                }}
                                variant="outline"
                            >
                                Rate Limit Warning
                            </Button>

                            <Button
                                onClick={() => {
                                    toast.success('Guest checked in ✓', { duration: 2000 });
                                }}
                                variant="outline"
                            >
                                Check-in Success
                            </Button>

                            <Button
                                onClick={() => {
                                    toast.error(new Error('QR code not recognized'), 'Invalid ticket');
                                }}
                                variant="outline"
                            >
                                Invalid QR Code
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Separator className="my-6" />

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-3">
                        <Button
                            onClick={() => toast.dismissAll()}
                            variant="outline"
                            size="sm"
                        >
                            Dismiss All Toasts
                        </Button>

                        <Button
                            onClick={() => {
                                // Trigger multiple toasts to test stacking
                                toast.success('First toast');
                                setTimeout(() => toast.info('Second toast'), 200);
                                setTimeout(() => toast.warning('Third toast'), 400);
                                setTimeout(() => toast.error(new Error('Test error'), 'Fourth toast'), 600);
                            }}
                            variant="outline"
                            size="sm"
                        >
                            Test Stacking (4 toasts)
                        </Button>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card className="mt-6 bg-muted/50">
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                            <strong>Tip:</strong> Open your browser&apos;s console to see action button click logs.
                            Toasts appear in the <strong>bottom-right corner</strong> with automatic dismiss after their duration.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
