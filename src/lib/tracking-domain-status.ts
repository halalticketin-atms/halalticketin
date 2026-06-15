export interface TrackingDomainStatusInput {
    organizerWebsite?: string | null;
    customDomain?: string | null;
}

export const getTrackingDomainStatus = (input: TrackingDomainStatusInput) => {
    if (input.customDomain?.trim()) {
        return {
            tone: 'success' as const,
            label: 'Custom domain ready',
            summary: 'Tracking events can use your organiser-owned event domain.',
        };
    }

    return {
        tone: 'warning' as const,
        label: 'Shared domain',
        summary: 'Tracking runs on Halal Ticketin shared event pages. Some ad-platform domain verification and diagnostics may be limited until organiser custom domains are available.',
    };
};
