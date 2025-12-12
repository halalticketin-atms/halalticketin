export const buildDashboardPath = (organizerId: string, suffix = '') =>
    `/dashboard/o/${organizerId}${suffix}`;
