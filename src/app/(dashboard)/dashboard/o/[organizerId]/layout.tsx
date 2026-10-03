import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { SuspendedAccessGuard } from '@/components/dashboard/SuspendedAccessGuard';
import { ScrollToTopWrapper } from '@/components/layout/ScrollToTopWrapper';

export default async function OrganizerDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ organizerId: string }>;
}) {
    const resolvedParams = await params;
    return (
        <div className="min-h-screen -mt-[var(--nav-safe-offset)]">
            <DashboardSidebar organizerId={resolvedParams.organizerId} />
            <main className="pl-0 lg:pl-[280px] transition-all">
                <DashboardTopbar />
                {/* Mobile clears the fixed marketing header; desktop sits below the slim top bar */}
                <div className="pt-[calc(var(--nav-safe-offset)+2rem)] lg:pt-0 pb-20 lg:pb-0">
                    <SuspendedAccessGuard>
                        <ScrollToTopWrapper>
                            {children}
                        </ScrollToTopWrapper>
                    </SuspendedAccessGuard>
                </div>
            </main>
            <MobileBottomNav organizerId={resolvedParams.organizerId} />
        </div>
    );
}
