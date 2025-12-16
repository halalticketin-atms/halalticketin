'use client';

import type { PropsWithChildren } from 'react';
import { OrganizerProvider } from '@/context/organizer-context';

export default function InvitationsLayout({ children }: PropsWithChildren) {
    return <OrganizerProvider>{children}</OrganizerProvider>;
}
