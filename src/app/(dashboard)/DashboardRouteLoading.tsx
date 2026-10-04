export default function DashboardRouteLoading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading dashboard">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" aria-hidden="true" />
        </div>
    );
}
