type StudentRateOrganizer = {
    id: string;
    isStudentRateEnabled: boolean;
};

type StudentRateOverride = {
    enabled: boolean;
    throughRequestId: number;
};

export type StudentRateListState<T extends StudentRateOrganizer> = {
    organizers: T[];
    overrides: Map<string, StudentRateOverride>;
};

type StudentRateListEvent<T extends StudentRateOrganizer> =
    | {
        type: 'student-rate-confirmed';
        organizerId: string;
        enabled: boolean;
        latestListRequestId: number;
    }
    | {
        type: 'list-resolved';
        requestId: number;
        organizers: T[];
    };

export function reduceStudentRateListState<T extends StudentRateOrganizer>(
    state: StudentRateListState<T>,
    event: StudentRateListEvent<T>,
): StudentRateListState<T> {
    const overrides = new Map(state.overrides);

    if (event.type === 'student-rate-confirmed') {
        overrides.set(event.organizerId, {
            enabled: event.enabled,
            throughRequestId: event.latestListRequestId,
        });

        return {
            overrides,
            organizers: state.organizers.map((organizer) =>
                organizer.id === event.organizerId
                    ? { ...organizer, isStudentRateEnabled: event.enabled }
                    : organizer,
            ),
        };
    }

    const organizers = event.organizers.map((organizer) => {
        const override = overrides.get(organizer.id);
        if (!override) return organizer;

        if (
            event.requestId > override.throughRequestId ||
            organizer.isStudentRateEnabled === override.enabled
        ) {
            overrides.delete(organizer.id);
            return organizer;
        }

        return { ...organizer, isStudentRateEnabled: override.enabled };
    });

    return { organizers, overrides };
}
