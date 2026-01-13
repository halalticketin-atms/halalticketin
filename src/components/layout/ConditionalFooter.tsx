'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/layout';

export function ConditionalFooter() {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith('/dashboard');
    const isPreviewShell = /^\/events\/[^/]+\/preview$/.test(pathname);
    const isEmbedRoute = pathname.startsWith('/embed');

    if (isDashboard || isPreviewShell || isEmbedRoute) {
        return null;
    }

    return <Footer />;
}
