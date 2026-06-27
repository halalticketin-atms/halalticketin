export const ORDER_PAGE_TABS = [
    { id: 'orders', label: 'Orders' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'attendees', label: 'Attendees' },
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

export const buildEventOrdersHref = (organizerId: string, eventId: string) =>
    `/dashboard/o/${organizerId}/orders?eventId=${encodeURIComponent(eventId)}`;

export const getInitialEventFilterFromQuery = (eventId: string | null): string[] => {
    const trimmedEventId = eventId?.trim();
    return trimmedEventId ? [trimmedEventId] : [];
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
