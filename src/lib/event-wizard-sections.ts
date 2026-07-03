/**
 * Maps save/publish field errors to the wizard main step and the page section
 * that owns the field, in wizard page order. Section ids match the `subSteps`
 * ids in the create-event wizard and the `section-<id>` anchors on each page.
 */
export type WizardErrorTarget = { step: number; section: string };

const SECTION_FIELDS: Array<WizardErrorTarget & { fields: string[] }> = [
    { step: 1, section: 'title', fields: ['title', 'categories'] },
    { step: 1, section: 'description', fields: ['description'] },
    { step: 1, section: 'poster', fields: ['bannerImageDataUrl'] },
    { step: 1, section: 'visibility', fields: ['visibility', 'accessCode'] },
    { step: 2, section: 'date', fields: ['date', 'endDate'] },
    { step: 2, section: 'time', fields: ['startTime', 'endTime', 'timezone'] },
    { step: 3, section: 'location', fields: ['locationType', 'venue', 'address', 'city', 'onlineUrl'] },
    { step: 4, section: 'currency', fields: ['currency'] },
    { step: 4, section: 'ticketTypes', fields: ['tickets', 'totalCapacity', 'waitlistEnabled'] },
    { step: 4, section: 'refundPolicy', fields: ['refundPolicy'] },
    { step: 4, section: 'attendeeInfo', fields: ['attendeeInfoMode', 'minimumAttendeeAge', 'customQuestions'] },
];

export const getWizardErrorTarget = (
    errors: Record<string, string>,
): WizardErrorTarget | null => {
    const keys = new Set(Object.keys(errors));
    for (const { step, section, fields } of SECTION_FIELDS) {
        if (fields.some((field) => keys.has(field))) {
            return { step, section };
        }
    }
    return null;
};
