'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/layout';

export function ConditionalFooter() {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith('/dashboard');
    const isPreviewShell = /^\/events\/[^/]+\/preview$/.test(pathname);
    const isEventWizardRoute = pathname === '/events/create' || /^\/events\/[^/]+\/edit$/.test(pathname);
    const isEmbedRoute = pathname.startsWith('/embed');
    const isDedicatedSignup = pathname === '/heightspr';

    if (isDashboard || isPreviewShell || isEventWizardRoute || isEmbedRoute || isDedicatedSignup) {
        return null;
    }

    return <Footer />;
}
