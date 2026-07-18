export type TicketBreakdownEventOption = {
    id: string;
    name: string;
};

type EventNameSource = {
    id: string;
    name: string | null | undefined;
};

type BreakdownEventNameSource = {
    eventId: string;
    eventName: string | null | undefined;
};

/**
 * Organiser events are the canonical source: ticket breakdowns intentionally
 * include only events with completed orders.
 */
export const buildTicketBreakdownEventOptions = ({
    orders,
    attendeeEvents,
    breakdownEvents,
    organizerEvents,
}: {
    orders: EventNameSource[];
    attendeeEvents: EventNameSource[];
    breakdownEvents: BreakdownEventNameSource[];
    organizerEvents: Array<{ id: string; title: string | null | undefined }>;
}): TicketBreakdownEventOption[] => {
    const eventNames = new Map<string, string>();

    for (const event of orders) {
        eventNames.set(event.id, event.name || 'Unnamed Event');
    }
    for (const event of attendeeEvents) {
        eventNames.set(event.id, event.name || 'Unnamed Event');
    }
    for (const event of breakdownEvents) {
        eventNames.set(event.eventId, event.eventName || 'Unnamed Event');
    }
    for (const event of organizerEvents) {
        eventNames.set(event.id, event.title || 'Unnamed Event');
    }

    return [...eventNames.entries()].map(([id, name]) => ({ id, name }));
};

export const isCurrentRequestVersion = (
    requestVersion: number,
    currentRequestVersion: number,
) => requestVersion === currentRequestVersion;
