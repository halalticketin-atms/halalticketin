export const ORDER_PAGE_TABS = [
    { id: 'orders', label: 'Orders' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'attendees', label: 'Attendees' },
    { id: 'waitlist', label: 'Waitlist' },
] as const;

export const ORDER_DETAIL_TABS = [
    { id: 'details', label: 'Details' },
    { id: 'answers', label: 'Answers' },
    { id: 'refund', label: 'Refund' },
] as const;

export type OrderPageTab = (typeof ORDER_PAGE_TABS)[number]['id'];
export type OrderDetailTab = (typeof ORDER_DETAIL_TABS)[number]['id'];
export type AttendeeAnswerDisplayMode = 'visible' | 'details';
export type AttendeeAnswerFilters = Record<string, string[]>;
export type AnswerQuestionLabel = { questionId: string; label: string };
export type OrderStatusFilter = 'all' | 'completed' | 'refunded' | 'partially_refunded';
export type WaitlistStatusFilter = 'all' | 'waiting' | 'notified' | 'converted' | 'removed';

export interface OrdersPageUrlState {
    pageTab: OrderPageTab;
    eventFilter: string[];
    searchQuery: string;
    statusFilter: OrderStatusFilter;
    waitlistStatus: WaitlistStatusFilter;
    answerFilters: AttendeeAnswerFilters;
    showAllBreakdown: boolean;
}

const orderPageTabIds = new Set<OrderPageTab>(ORDER_PAGE_TABS.map((tab) => tab.id));
const orderStatusFilters = new Set<OrderStatusFilter>(['all', 'completed', 'refunded', 'partially_refunded']);
const waitlistStatusFilters = new Set<WaitlistStatusFilter>(['all', 'waiting', 'notified', 'converted', 'removed']);

export const buildEventOrdersHref = (organizerId: string, eventId: string) =>
    `/dashboard/o/${organizerId}/orders?eventId=${encodeURIComponent(eventId)}`;

export const buildEventWaitlistHref = (organizerId: string, eventId: string) =>
    `/dashboard/o/${organizerId}/orders?eventId=${encodeURIComponent(eventId)}&tab=waitlist`;

export const getInitialEventFilterFromQuery = (eventId: string | null): string[] => {
    const trimmedEventId = eventId?.trim();
    return trimmedEventId ? [trimmedEventId] : [];
};

const readEventFilterFromQuery = (searchParams: URLSearchParams): string[] => {
    const eventIds = searchParams.get('eventIds');
    if (eventIds) {
        return eventIds.split(',').map((id) => id.trim()).filter(Boolean);
    }
    return getInitialEventFilterFromQuery(searchParams.get('eventId'));
};

const readAnswerFiltersFromQuery = (
    value: string | null,
    eventFilter: string[],
): AttendeeAnswerFilters => {
    if (!value || eventFilter.length !== 1) {
        return {};
    }
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return Object.fromEntries(
            Object.entries(parsed)
                .map(([key, choices]) => [
                    key,
                    Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === 'string') : [],
                ])
                .filter(([, choices]) => choices.length > 0),
        );
    } catch {
        return {};
    }
};

export const getOrdersPageUrlState = (searchParams: URLSearchParams): OrdersPageUrlState => {
    const queryTab = searchParams.get('tab') as OrderPageTab | null;
    const pageTab = queryTab && orderPageTabIds.has(queryTab) ? queryTab : 'orders';
    const queryStatus = searchParams.get('status') as OrderStatusFilter | null;
    const queryWaitlistStatus = searchParams.get('waitlistStatus') as WaitlistStatusFilter | null;
    const eventFilter = pageTab === 'tickets' ? [] : readEventFilterFromQuery(searchParams);

    return {
        pageTab,
        eventFilter,
        searchQuery: pageTab === 'tickets' ? '' : searchParams.get('search') ?? '',
        statusFilter: queryStatus && orderStatusFilters.has(queryStatus) ? queryStatus : 'all',
        waitlistStatus: queryWaitlistStatus && waitlistStatusFilters.has(queryWaitlistStatus)
            ? queryWaitlistStatus
            : 'all',
        answerFilters: pageTab === 'attendees'
            ? readAnswerFiltersFromQuery(searchParams.get('answerFilters'), eventFilter)
            : {},
        showAllBreakdown: searchParams.get('showAll') === '1',
    };
};

export const buildOrdersPageSearchParams = ({
    pageTab,
    eventFilter,
    searchQuery,
    statusFilter,
    waitlistStatus,
    answerFilters,
    showAllBreakdown,
}: OrdersPageUrlState): URLSearchParams => {
    const params = new URLSearchParams();
    if (pageTab !== 'orders') {
        params.set('tab', pageTab);
    }
    if (pageTab === 'tickets') {
        if (showAllBreakdown) params.set('showAll', '1');
        return params;
    }

    const normalizedEventFilter = pageTab === 'waitlist' ? eventFilter.slice(0, 1) : eventFilter;
    if (normalizedEventFilter.length === 1) {
        params.set('eventId', normalizedEventFilter[0]);
    } else if (normalizedEventFilter.length > 1) {
        params.set('eventIds', normalizedEventFilter.join(','));
    }

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
        params.set('search', trimmedSearch);
    }
    if ((pageTab === 'orders' || pageTab === 'attendees') && statusFilter !== 'all') {
        params.set('status', statusFilter);
    }
    if (pageTab === 'waitlist' && waitlistStatus !== 'all') {
        params.set('waitlistStatus', waitlistStatus);
    }
    if (
        pageTab === 'attendees' &&
        normalizedEventFilter.length === 1 &&
        Object.values(answerFilters).some((choices) => choices.length > 0)
    ) {
        params.set('answerFilters', JSON.stringify(answerFilters));
    }
    return params;
};

export const getAttendeeAnswerDisplayMode = (selectedEventIds: string[]): AttendeeAnswerDisplayMode =>
    selectedEventIds.length === 1 ? 'visible' : 'details';

export const clearAnswerFiltersForEventSelection = (
    selectedEventIds: string[],
    answerFilters: AttendeeAnswerFilters,
): AttendeeAnswerFilters => selectedEventIds.length === 1 ? answerFilters : {};

export const formatQuestionNumberLabel = (label: string, index: number) => `${index + 1}. ${label}`;

export const formatAnswerQuestionLabel = (
    label: string,
    questionId: string,
    questions: Array<{ questionId: string }>,
) => {
    const questionIndex = questions.findIndex((question) => question.questionId === questionId);
    return questionIndex === -1 ? label : formatQuestionNumberLabel(label, questionIndex);
};

export const buildAnswerQuestionLabelList = (
    eventQuestions: AnswerQuestionLabel[],
    attendees: Array<{ registrationAnswers: AnswerQuestionLabel[] }>,
): AnswerQuestionLabel[] => {
    const labels = new Map<string, string>();
    for (const question of eventQuestions) {
        labels.set(question.questionId, question.label);
    }
    for (const attendee of attendees) {
        for (const answer of attendee.registrationAnswers) {
            if (!labels.has(answer.questionId)) {
                labels.set(answer.questionId, answer.label);
            }
        }
    }
    return [...labels.entries()].map(([questionId, label]) => ({ questionId, label }));
};

export const buildAttendeesQueryParams = ({
    organizerId,
    eventIds,
    status,
    search,
    answerFilters = {},
    limit = 500,
    offset = 0,
}: {
    organizerId: string;
    eventIds: string[];
    status: string;
    search: string;
    answerFilters?: AttendeeAnswerFilters;
    limit?: number;
    offset?: number;
}): Record<string, string> => {
    const params: Record<string, string> = {
        organizerId,
        limit: String(limit),
        offset: String(offset),
    };

    if (status !== 'all') {
        params.status = status;
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
        params.search = trimmedSearch;
    }

    if (eventIds.length === 1) {
        params.eventId = eventIds[0];
        if (Object.values(answerFilters).some((choices) => choices.length > 0)) {
            params.answerFilters = JSON.stringify(answerFilters);
        }
    } else if (eventIds.length > 1) {
        params.eventIds = eventIds.join(',');
    }

    return params;
};
