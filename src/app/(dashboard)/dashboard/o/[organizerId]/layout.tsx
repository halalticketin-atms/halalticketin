import { DashboardSidebar } from '@/components/dashboard';

export default async function OrganizerDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ organizerId: string }>;
}) {
    const resolvedParams = await params;
    return (
        <div className="min-h-screen">
            <DashboardSidebar organizerId={resolvedParams.organizerId} />
            <main className="pl-0 lg:pl-[260px] transition-all">
                {children}
            </main>
        </div>
    );
}
