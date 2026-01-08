'use client';

import { Smartphone } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { CardContent } from '@/components/ui/card';
import { buildDashboardPath } from '@/lib/organizer-path';

interface DesktopQRRedirectProps {
    eventId: string;
    eventName: string;
    organizerId: string;
}

export function DesktopQRRedirect({ eventId, eventName, organizerId }: DesktopQRRedirectProps) {
    // Generate the full check-in URL for mobile
    const checkInUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${buildDashboardPath(organizerId)}/check-in?event=${encodeURIComponent(eventId)}&mode=scan`
        : '';

    return (
        <CardContent className="py-12">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mx-auto">
                    <Smartphone className="h-10 w-10 text-primary" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Use your phone to scan tickets</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        For the best check-in experience, open this page on your phone or tablet.
                        The camera will be used to scan QR codes.
                    </p>
                </div>

                {/* QR Code to scan on mobile */}
                {checkInUrl && (
                    <div className="space-y-4">
                        <div className="inline-block p-4 bg-white rounded-xl shadow-sm border">
                            <QRCodeCanvas
                                value={checkInUrl}
                                size={176}
                                includeMargin
                                bgColor="#ffffff"
                                fgColor="#0f172a"
                                className="block"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Scan this QR code with your phone to open the check-in scanner.
                            You&apos;ll be asked to log in and we&apos;ll check your access before letting you in.
                        </p>
                        <p className="text-xs text-muted-foreground break-all">
                            {checkInUrl}
                        </p>
                    </div>
                )}

                <div className="text-xs text-muted-foreground">
                    Currently viewing: <span className="font-medium">{eventName}</span>
                </div>
            </div>
        </CardContent>
    );
}
