'use client';

import WaitlistManager from '@/components/dashboard/WaitlistManager';

export default function OrganizerWaitlistPage() {
    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                <WaitlistManager showHeader />
            </div>
        </div>
    );
}
