'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewModeSelector, type ViewMode } from '@/components/events/ViewModeSelector';
import { cn } from '@/lib/utils';

export default function EventPreviewPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [viewMode, setViewMode] = useState<ViewMode>('desktop');
    const [isFrameLoading, setIsFrameLoading] = useState(true);

    const handleBack = () => {
        // Try to focus the opener (wizard window) and close this popup
        if (window.opener && !window.opener.closed) {
            window.opener.focus();
            window.close();
            return;
        }

        // If we can close ourselves (popup or about:blank origin), do so
        // and let the user return to their original tab manually
        try {
            window.close();
            // If close succeeded, we won't reach here
        } catch {
            // Can't close - fall through to navigation
        }

        // If window didn't close, we opened as a regular tab - navigate to dashboard
        // Use replace to avoid adding to history
        router.replace('/dashboard');
    };

    if (!eventId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-2">Preview Unavailable</h2>
                    <p className="text-muted-foreground mb-4">No event ID provided.</p>
                    <Button onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const viewportDimensions = {
        desktop: { width: '100%' },
        tablet: { width: '768px' },
        mobile: { width: '375px' },
    };

    const currentDimensions = viewportDimensions[viewMode];
    const previewSrc = `/events/preview/${eventId}`;

    return (
        <div className="min-h-screen bg-background -mt-[var(--nav-safe-offset)]">
            {/* Simple Preview Banner - Eventbrite Style */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-14">
                        {/* Left: Back button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Back to Editing</span>
                            <span className="sm:hidden">Back</span>
                        </Button>

                        {/* Center: Event Preview label */}
                        <div className="absolute left-1/2 -translate-x-1/2">
                            <span className="text-sm font-medium text-muted-foreground">
                                Event Preview
                            </span>
                        </div>

                        {/* Right: View mode selector */}
                        <ViewModeSelector
                            value={viewMode}
                            onChange={setViewMode}
                        />
                    </div>
                </div>
            </div>

            {/* Event Content with Viewport Constraint */}
            <div className="flex justify-center py-0 bg-muted/30">
                <div
                    style={{
                        width: currentDimensions.width,
                        maxWidth: '100%',
                        height: 'calc(100vh - 3.5rem)',
                    }}
                    className={cn(
                        'relative transition-all duration-300 ease-in-out bg-background',
                        viewMode !== 'desktop' && 'my-6 shadow-2xl border border-border/60 rounded-2xl overflow-hidden'
                    )}
                >
                    {isFrameLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">Loading preview...</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        key={eventId}
                        src={previewSrc}
                        title="Event preview"
                        className="w-full h-full border-0"
                        onLoad={() => setIsFrameLoading(false)}
                    />
                </div>
            </div>

            {/* Mobile Device Frame Indicator */}
            {viewMode === 'mobile' && (
                <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/95 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm">
                    Mobile View (375px)
                </div>
            )}
        </div>
    );
}
