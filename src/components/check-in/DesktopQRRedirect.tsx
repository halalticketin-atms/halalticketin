'use client';

import { Smartphone, ArrowRight, ScanLine } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { CardContent } from '@/components/ui/card';
import { buildDashboardPath } from '@/lib/organizer-path';

interface DesktopQRRedirectProps {
    eventId: string;
    eventName: string;
    organizerId: string;
}

export function DesktopQRRedirect({ eventId, eventName, organizerId }: DesktopQRRedirectProps) {
    const checkInUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${buildDashboardPath(organizerId)}/check-in?event=${encodeURIComponent(eventId)}&mode=scan`
        : '';

    return (
        <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px]">
                {/* Left — Messaging */}
                <div className="flex flex-col justify-center p-8 lg:p-10 space-y-6">
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
                        <ScanLine className="h-3.5 w-3.5" />
                        Mobile Scanner
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                            Scan tickets from<br />
                            your phone
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                            Open this page on your phone or tablet to use the camera as a
                            live QR scanner. Fast, hands-free check-ins.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Smartphone className="h-3 w-3" />
                            </div>
                            Open on mobile
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
                                <ScanLine className="h-3 w-3" />
                            </div>
                            Start scanning
                        </div>
                    </div>
                </div>

                {/* Right — QR Code */}
                <div className="relative flex items-center justify-center p-8 lg:p-10 bg-muted/30 border-t lg:border-t-0 lg:border-l border-border/40">
                    {/* Subtle decorative dots */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }} />

                    <div className="relative text-center space-y-5">
                        {checkInUrl && (
                            <div className="inline-block p-5 bg-white rounded-2xl shadow-sm border border-border/40">
                                <QRCodeCanvas
                                    value={checkInUrl}
                                    size={180}
                                    includeMargin={false}
                                    bgColor="#ffffff"
                                    fgColor="#0f172a"
                                    className="block"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                                Scan to open check-in scanner
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 font-medium">
                                {eventName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    );
}
