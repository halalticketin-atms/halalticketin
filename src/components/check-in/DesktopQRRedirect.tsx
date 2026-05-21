'use client';

import { ScanLine, Smartphone } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { CardContent } from '@/components/ui/card';
import { AppStoreBadge } from '@/components/layout/AppStoreBadge';
import { buildDashboardPath } from '@/lib/organizer-path';

const APP_STORE_URL = 'https://apps.apple.com/ie/app/halal-ticketin-organiser/id6764363253';

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
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">
                {/* Left: Web Scanner */}
                <div className="relative flex flex-col items-center justify-center gap-6 p-8 lg:p-10 text-center">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
                            <ScanLine className="h-3.5 w-3.5" />
                            Web Scanner
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                            Scan from<br />
                            any phone
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            Open this page on your phone or tablet to use the camera as a
                            live QR scanner. No install needed.
                        </p>
                    </div>

                    {checkInUrl && (
                        <div className="inline-block p-5 bg-white rounded-2xl shadow-sm border border-border/40">
                            <QRCodeCanvas
                                value={checkInUrl}
                                size={160}
                                includeMargin={false}
                                bgColor="#ffffff"
                                fgColor="#0f172a"
                                className="block"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Scan to open check-in scanner
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 font-medium">
                            {eventName || 'Select an event'}
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex items-center justify-center"
                    aria-hidden="true"
                />

                {/* Right: Organiser App */}
                <div className="relative flex flex-col items-center justify-center gap-6 p-8 lg:p-10 text-center bg-muted/30 border-t lg:border-t-0 lg:border-l border-border/40">
                    {/* Subtle decorative dots */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    />

                    <div className="relative space-y-3">
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
                            <Smartphone className="h-3.5 w-3.5" />
                            Organiser App
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                            Or get the<br />
                            iOS app
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            Install the organiser app on iPhone or iPad to scan tickets and
                            manage your events on the go.
                        </p>
                    </div>

                    <div className="relative inline-block p-5 bg-white rounded-2xl shadow-sm border border-border/40">
                        <QRCodeCanvas
                            value={APP_STORE_URL}
                            size={160}
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            className="block"
                        />
                    </div>

                    <div className="relative flex flex-wrap items-center justify-center gap-2.5">
                        <AppStoreBadge />

                        {/* Google Play coming soon ghost badge */}
                        <div
                            className="inline-flex items-center gap-2.5 rounded-xl border border-dashed border-border/70 bg-background/60 px-3.5 py-2 text-foreground/70"
                            aria-label="Google Play coming soon"
                        >
                            <svg
                                viewBox="0 0 512 512"
                                className="h-5 w-5 shrink-0 opacity-60"
                                aria-hidden="true"
                            >
                                <path
                                    fill="currentColor"
                                    d="M99.6 13.4C92.8 17.2 88 24.2 88 32v448c0 7.8 4.8 14.8 11.6 18.6L335 256 99.6 13.4zM360 230.7 130.7 9.4c-2.5-1.9-5.5-3-8.7-3.3L335 234.7l25-4zm0 50.6-25-4-213 228.6c3.2-.3 6.2-1.4 8.7-3.3L360 281.3zm88-37.7-65-37.6-30 30.6L389 256l-31 27.4 30 30.6 64-37.6c14.7-8.5 14.7-30 0-38.7z"
                                />
                            </svg>
                            <div className="flex flex-col leading-none text-left">
                                <span className="text-[9px] font-medium tracking-wide opacity-80">
                                    Coming soon to
                                </span>
                                <span className="mt-0.5 text-[15px] font-semibold tracking-tight">
                                    Google&nbsp;Play
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </CardContent>
    );
}
