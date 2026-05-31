import { describe, expect, it } from 'vitest';

import {
  buildTicketAttendeesWithBuyerAsFirst,
  normalizeCheckoutTicketAttendee,
  serializeCheckoutTicketAttendee,
  validateCheckoutTicketAttendee,
} from './checkout-ticket-attendees';

describe('validateCheckoutTicketAttendee', () => {
  it('requires standard attendee fields for non-gift tickets', () => {
    const error = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        name: '',
        gender: '',
        age: '',
      }),
      ticketIndex: 0,
      questions: [{ id: 'q1', label: 'Dietary notes', required: true, type: 'text' }],
    });

    expect(error).toBe('Ticket 1: attendee name, gender, and age are required.');
  });

  it('allows gifted tickets to skip attendee fields and required questions when using a share link', () => {
    const error = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        giftDeliveryMode: 'link',
      }),
      ticketIndex: 1,
      questions: [{ id: 'q1', label: 'Dietary notes', required: true, type: 'text' }],
    });

    expect(error).toBeNull();
  });

  it('requires a valid recipient email for gift email delivery', () => {
    const missingEmail = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        giftDeliveryMode: 'email',
      }),
      ticketIndex: 2,
    });
    const invalidEmail = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        giftDeliveryMode: 'email',
        email: 'not-an-email',
      }),
      ticketIndex: 2,
    });

    expect(missingEmail).toBe('Ticket 3: recipient email is required for email delivery.');
    expect(invalidEmail).toBe('Ticket 3: please enter a valid recipient email.');
  });

  it('rejects one-character recipient names for gifted tickets', () => {
    const error = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        name: 'A',
        giftDeliveryMode: 'link',
      }),
      ticketIndex: 0,
    });

    expect(error).toBe('Ticket 1: recipient name must be at least 2 characters.');
  });

  it('rejects gifting for originally free ticket types', () => {
    const error = validateCheckoutTicketAttendee({
      attendee: normalizeCheckoutTicketAttendee({
        giftDeliveryMode: 'link',
      }),
      ticketIndex: 0,
      allowGifting: false,
    });

    expect(error).toBe('Ticket 1: gifting is not available for free ticket types.');
  });
});

describe('serializeCheckoutTicketAttendee', () => {
  it('serializes gift delivery mode and recipient email for gift email delivery', () => {
    expect(
      serializeCheckoutTicketAttendee(
        normalizeCheckoutTicketAttendee({
          name: 'Gift Recipient',
          email: 'recipient@example.com',
          giftDeliveryMode: 'email',
          gender: 'female',
          age: '22',
          customAnswers: { q1: 'No nuts' },
        }),
      ),
    ).toEqual({
      name: 'Gift Recipient',
      email: 'recipient@example.com',
      giftDeliveryMode: 'email',
    });
  });

  it('keeps attendee demographics and answers for standard tickets', () => {
    expect(
      serializeCheckoutTicketAttendee(
        normalizeCheckoutTicketAttendee({
          name: 'Attendee Name',
          gender: 'male',
          age: '34',
          customAnswers: { q1: 'Halal meal' },
        }),
      ),
    ).toEqual({
      name: 'Attendee Name',
      gender: 'male',
      age: 34,
      customAnswers: { q1: 'Halal meal' },
    });
  });
});

describe('buildTicketAttendeesWithBuyerAsFirst', () => {
  it('prefills the first ticket with buyer core details and leaves later tickets blank', () => {
    const attendees = buildTicketAttendeesWithBuyerAsFirst({
      attendees: [],
      totalTickets: 2,
      buyer: {
        name: 'Buyer Name',
        gender: 'female',
        age: '29',
      },
    });

    expect(attendees).toEqual([
      normalizeCheckoutTicketAttendee({
        name: 'Buyer Name',
        gender: 'female',
        age: '29',
      }),
      normalizeCheckoutTicketAttendee(),
    ]);
  });

  it('preserves first ticket custom answers when prefilling core details', () => {
    const attendees = buildTicketAttendeesWithBuyerAsFirst({
      attendees: [
        normalizeCheckoutTicketAttendee({
          customAnswers: { diet: 'Vegetarian' },
        }),
      ],
      totalTickets: 1,
      buyer: {
        name: 'Buyer Name',
        gender: 'male',
        age: '41',
      },
    });

    expect(attendees[0]).toEqual(
      normalizeCheckoutTicketAttendee({
        name: 'Buyer Name',
        gender: 'male',
        age: '41',
        customAnswers: { diet: 'Vegetarian' },
      }),
    );
  });

  it('updates a previous silent prefill but does not overwrite manual attendee edits', () => {
    const attendees = buildTicketAttendeesWithBuyerAsFirst({
      attendees: [
        normalizeCheckoutTicketAttendee({
          name: 'Manual Attendee',
          gender: 'female',
          age: '30',
        }),
      ],
      totalTickets: 1,
      buyer: {
        name: 'Updated Buyer',
        gender: 'male',
        age: '31',
      },
      previousBuyer: {
        name: 'Original Buyer',
        gender: 'female',
        age: '30',
      },
    });

    expect(attendees[0]).toEqual(
      normalizeCheckoutTicketAttendee({
        name: 'Manual Attendee',
        gender: 'male',
        age: '31',
      }),
    );
  });
});
