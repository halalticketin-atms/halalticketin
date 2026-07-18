export type WaitlistTicketCandidate = {
    type: 'paid' | 'free' | 'donation';
    visibility: 'public' | 'hidden';
    waitlistEnabled?: boolean;
};

export const hasEligibleWaitlistTicket = (tickets: WaitlistTicketCandidate[]) =>
    tickets.some((ticket) =>
        ticket.type !== 'donation'
        && ticket.visibility === 'public'
        && ticket.waitlistEnabled !== false,
    );

export const shouldStageTicketsBeforePublishedWaitlistEnable = ({
    eventStatus,
    previousWaitlistEnabled,
    nextWaitlistEnabled,
    ticketsNeedSave,
}: {
    eventStatus: 'draft' | 'published' | 'cancelled' | 'archived' | null;
    previousWaitlistEnabled: boolean;
    nextWaitlistEnabled: boolean;
    ticketsNeedSave: boolean;
}) =>
    eventStatus === 'published'
    && !previousWaitlistEnabled
    && nextWaitlistEnabled
    && ticketsNeedSave;
