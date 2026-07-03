import { describe, expect, it } from 'vitest';

import { getWizardErrorTarget } from './event-wizard-sections';

describe('getWizardErrorTarget', () => {
  it('maps fields to their main step and owning section', () => {
    expect(getWizardErrorTarget({ title: 'Required' })).toEqual({ step: 1, section: 'title' });
    expect(getWizardErrorTarget({ accessCode: 'Too short' })).toEqual({ step: 1, section: 'visibility' });
    expect(getWizardErrorTarget({ endTime: 'Must be after start' })).toEqual({ step: 2, section: 'time' });
    expect(getWizardErrorTarget({ venue: 'Required' })).toEqual({ step: 3, section: 'location' });
    expect(getWizardErrorTarget({ tickets: 'At least one required' })).toEqual({ step: 4, section: 'ticketTypes' });
    expect(getWizardErrorTarget({ refundPolicy: 'Select a policy' })).toEqual({ step: 4, section: 'refundPolicy' });
    expect(getWizardErrorTarget({ minimumAttendeeAge: 'Invalid' })).toEqual({ step: 4, section: 'attendeeInfo' });
    expect(getWizardErrorTarget({ customQuestions: 'Add options' })).toEqual({ step: 4, section: 'attendeeInfo' });
  });

  it('targets the earliest section in wizard order when several fields fail', () => {
    expect(getWizardErrorTarget({ refundPolicy: 'x', date: 'x', currency: 'x' })).toEqual({
      step: 2,
      section: 'date',
    });
    expect(getWizardErrorTarget({ attendeeInfoMode: 'x', title: 'x' })).toEqual({
      step: 1,
      section: 'title',
    });
  });

  it('returns null when no known field has an error', () => {
    expect(getWizardErrorTarget({})).toBeNull();
    expect(getWizardErrorTarget({ somethingUnknown: 'x' })).toBeNull();
  });
});
