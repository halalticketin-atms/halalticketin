export const buildDashboardPath = (organizerId: string, suffix = '') =>
    `/dashboard/o/${organizerId}${suffix}`;

export const isCheckInDashboardPath = (pathname: string, organizerId: string) => {
    const base = buildDashboardPath(organizerId);
    if (pathname === `${base}/check-in` || pathname === `${base}/check-in/`) return true;
    return pathname.startsWith(base) && /^\/events\/[^/]+\/check-in\/?$/.test(pathname.slice(base.length));
};
