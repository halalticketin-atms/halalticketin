'use client';

import type { PropsWithChildren } from 'react';
import { OrganizerProvider } from '@/context/organizer-context';

export default function DashboardLayout({ children }: PropsWithChildren) {
    return <OrganizerProvider>{children}</OrganizerProvider>;
}
