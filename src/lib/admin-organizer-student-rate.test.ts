import { describe, expect, it } from 'vitest';

import { reduceStudentRateListState } from './admin-organizer-student-rate';

type Organizer = {
    id: string;
    isStudentRateEnabled: boolean;
};

const disabledOrganizer: Organizer = {
    id: 'org-1',
    isStudentRateEnabled: false,
};

describe('reduceStudentRateListState', () => {
    it('keeps a confirmed update when an older list request finishes afterwards', () => {
        const afterMutation = reduceStudentRateListState(
            { organizers: [disabledOrganizer], overrides: new Map() },
            {
                type: 'student-rate-confirmed',
                organizerId: 'org-1',
                enabled: true,
                latestListRequestId: 1,
            },
        );

        const afterStaleList = reduceStudentRateListState(afterMutation, {
            type: 'list-resolved',
            requestId: 1,
            organizers: [disabledOrganizer],
        });

        expect(afterStaleList.organizers[0].isStudentRateEnabled).toBe(true);
        expect(afterStaleList.overrides.has('org-1')).toBe(true);
    });

    it('applies a confirmed update when the list request finishes first', () => {
        const afterList = reduceStudentRateListState(
            { organizers: [], overrides: new Map() },
            {
                type: 'list-resolved',
                requestId: 1,
                organizers: [disabledOrganizer],
            },
        );

        const afterMutation = reduceStudentRateListState(afterList, {
            type: 'student-rate-confirmed',
            organizerId: 'org-1',
            enabled: true,
            latestListRequestId: 1,
        });

        expect(afterMutation.organizers[0].isStudentRateEnabled).toBe(true);
    });

    it('trusts a list request started after the confirmed update', () => {
        const afterMutation = reduceStudentRateListState(
            { organizers: [disabledOrganizer], overrides: new Map() },
            {
                type: 'student-rate-confirmed',
                organizerId: 'org-1',
                enabled: true,
                latestListRequestId: 1,
            },
        );

        const afterFreshList = reduceStudentRateListState(afterMutation, {
            type: 'list-resolved',
            requestId: 2,
            organizers: [disabledOrganizer],
        });

        expect(afterFreshList.organizers[0].isStudentRateEnabled).toBe(false);
        expect(afterFreshList.overrides.has('org-1')).toBe(false);
    });

    it('tracks confirmed updates for organisers independently', () => {
        const secondOrganizer = {
            id: 'org-2',
            isStudentRateEnabled: false,
        };
        const afterFirstMutation = reduceStudentRateListState(
            { organizers: [disabledOrganizer, secondOrganizer], overrides: new Map() },
            {
                type: 'student-rate-confirmed',
                organizerId: 'org-1',
                enabled: true,
                latestListRequestId: 1,
            },
        );
        const afterSecondMutation = reduceStudentRateListState(afterFirstMutation, {
            type: 'student-rate-confirmed',
            organizerId: 'org-2',
            enabled: true,
            latestListRequestId: 2,
        });

        const afterFirstFreshList = reduceStudentRateListState(afterSecondMutation, {
            type: 'list-resolved',
            requestId: 2,
            organizers: [disabledOrganizer, secondOrganizer],
        });

        expect(afterFirstFreshList.organizers.map((organizer) => organizer.isStudentRateEnabled)).toEqual([
            false,
            true,
        ]);
        expect(afterFirstFreshList.overrides.has('org-1')).toBe(false);
        expect(afterFirstFreshList.overrides.has('org-2')).toBe(true);
    });
});
