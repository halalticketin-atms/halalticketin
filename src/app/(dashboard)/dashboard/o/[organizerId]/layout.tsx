import { DashboardSidebar, MobileBottomNav } from '@/components/dashboard';

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
            <main className="pl-0 lg:pl-[260px] transition-all pt-[calc(var(--nav-safe-offset)+2rem)] pb-20 lg:pb-0">
                {children}
            </main>
            <MobileBottomNav organizerId={resolvedParams.organizerId} />
        </div>
    );
}

