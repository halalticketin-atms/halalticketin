import { DashboardSidebar } from '@/components/dashboard';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <DashboardSidebar />
            <main className="lg:pl-[260px] transition-all">
                {children}
            </main>
        </div>
    );
}
