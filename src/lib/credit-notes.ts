export function formatCreditSplitNote(
    creditsApplied: number,
    paidTicketCount: number
): string | null {
    if (creditsApplied <= 0 || paidTicketCount <= 0) {
        return null;
    }

    const nonCreditTicketCount = Math.max(0, paidTicketCount - creditsApplied);
    if (nonCreditTicketCount === 0) {
        return null;
    }

    const creditsLabel = creditsApplied === 1 ? 'ticket' : 'tickets';
    const nonCreditsLabel = nonCreditTicketCount === 1 ? 'ticket' : 'tickets';

    return `${creditsApplied} ${creditsLabel} use the organizer fee and ${nonCreditTicketCount} ${nonCreditsLabel} use the platform fee because the organizer ran out of credits.`;
}
