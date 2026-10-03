import type { PropsWithChildren } from 'react';
import { getDashboardSessionSeed } from '@/lib/web-session-server';
import { DashboardSessionSeedProvider } from '@/context/dashboard-session-seed';
import DashboardLayoutClient from './DashboardLayoutClient';

export default async function DashboardLayout({ children }: PropsWithChildren) {
    const seed = await getDashboardSessionSeed();
    return <DashboardSessionSeedProvider seed={seed}><DashboardLayoutClient>{children}</DashboardLayoutClient></DashboardSessionSeedProvider>;
}
