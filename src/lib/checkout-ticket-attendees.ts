import type { TicketAttendeePayload } from './checkout-api';

export interface CheckoutCustomQuestion {
  id: string;
  label: string;
  required: boolean;
  type?: 'text' | 'select' | 'checkbox';
  options?: string[];
}

export interface CheckoutTicketAttendeeForm {
  name: string;
  email: string;
  gender: 'male' | 'female' | '';
  age: string;
  customAnswers: Record<string, string>;
  giftDeliveryMode?: 'email' | 'link';
}

export type CheckoutBuyerAttendeeCoreDetails = Pick<
  CheckoutTicketAttendeeForm,
  'name' | 'gender' | 'age'
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeCheckoutTicketAttendee = (
  attendee?: Partial<CheckoutTicketAttendeeForm>,
): CheckoutTicketAttendeeForm => ({
  name: attendee?.name ?? '',
  email: attendee?.email ?? '',
  gender: attendee?.gender ?? '',
  age: attendee?.age ?? '',
  customAnswers: attendee?.customAnswers ?? {},
  giftDeliveryMode: attendee?.giftDeliveryMode,
});

export const isGiftCheckoutTicketAttendee = (attendee: CheckoutTicketAttendeeForm) =>
  attendee.giftDeliveryMode === 'email' || attendee.giftDeliveryMode === 'link';

export const isValidCheckoutAttendeeAge = (
  value: string | number,
  minimumAttendeeAge = 0,
) => {
  if (typeof value === 'string' && !value.trim()) {
    return false;
  }

  const age = Number(value);
  return Number.isInteger(age) && age >= minimumAttendeeAge && age <= 120;
};

const shouldReplaceWithBuyerValue = (
  currentValue: string,
  previousBuyerValue: string | undefined,
) => !currentValue.trim() || (previousBuyerValue !== undefined && currentValue === previousBuyerValue);

export const buildTicketAttendeesWithBuyerAsFirst = ({
  attendees,
  totalTickets,
  buyer,
  previousBuyer,
}: {
  attendees: Partial<CheckoutTicketAttendeeForm>[];
  totalTickets: number;
  buyer: CheckoutBuyerAttendeeCoreDetails;
  previousBuyer?: CheckoutBuyerAttendeeCoreDetails | null;
}): CheckoutTicketAttendeeForm[] => {
  const normalizedAttendees = Array.from({ length: totalTickets }, (_, index) =>
    normalizeCheckoutTicketAttendee(attendees[index]),
  );
  const firstAttendee = normalizedAttendees[0];

  if (!firstAttendee) {
    return normalizedAttendees;
  }

  normalizedAttendees[0] = {
    ...firstAttendee,
    name: shouldReplaceWithBuyerValue(firstAttendee.name, previousBuyer?.name)
      ? buyer.name
      : firstAttendee.name,
    gender: shouldReplaceWithBuyerValue(firstAttendee.gender, previousBuyer?.gender)
      ? buyer.gender
      : firstAttendee.gender,
    age: shouldReplaceWithBuyerValue(firstAttendee.age, previousBuyer?.age)
      ? buyer.age
      : firstAttendee.age,
  };

  return normalizedAttendees;
};

const hasRequiredAnswer = (question: CheckoutCustomQuestion, answer?: string) => {
  if (question.type === 'checkbox' && question.options && question.options.length > 0) {
    return Boolean(answer?.trim());
  }

  return answer !== undefined && answer !== null && answer !== '';
};

export const validateCheckoutTicketAttendee = ({
  attendee,
  ticketIndex,
  questions,
  allowGifting = true,
  minimumAttendeeAge = 0,
}: {
  attendee: CheckoutTicketAttendeeForm;
  ticketIndex: number;
  questions?: CheckoutCustomQuestion[];
  allowGifting?: boolean;
  minimumAttendeeAge?: number;
}) => {
  const ticketLabel = `Ticket ${ticketIndex + 1}`;
  const isGift = isGiftCheckoutTicketAttendee(attendee);
  const email = attendee.email.trim();

  if (isGift) {
    if (!allowGifting) {
      return `${ticketLabel}: gifting is not available for free ticket types.`;
    }

    if (attendee.name.trim() && attendee.name.trim().length < 2) {
      return `${ticketLabel}: recipient name must be at least 2 characters.`;
    }

    if (attendee.giftDeliveryMode === 'email' && !email) {
      return `${ticketLabel}: recipient email is required for email delivery.`;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      return `${ticketLabel}: please enter a valid recipient email.`;
    }

    return null;
  }

  if (!attendee.name.trim() || !attendee.gender || !attendee.age.trim()) {
    return `${ticketLabel}: attendee name, gender, and age are required.`;
  }

  if (attendee.name.trim().length < 2) {
    return `${ticketLabel}: name must be at least 2 characters.`;
  }

  if (!isValidCheckoutAttendeeAge(attendee.age, minimumAttendeeAge)) {
    return `${ticketLabel}: please enter a valid age (${minimumAttendeeAge}-120).`;
  }

  for (const question of questions ?? []) {
    if (!question.required) {
      continue;
    }

    if (!hasRequiredAnswer(question, attendee.customAnswers[question.id])) {
      return `${ticketLabel}: please answer "${question.label}".`;
    }
  }

  return null;
};

export const serializeCheckoutTicketAttendee = (
  attendee: CheckoutTicketAttendeeForm,
): TicketAttendeePayload => {
  const normalizedAnswers = Object.entries(attendee.customAnswers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
  const hasAnswers = Object.keys(normalizedAnswers).length > 0;

  if (isGiftCheckoutTicketAttendee(attendee)) {
    return {
      name: attendee.name.trim() || undefined,
      email:
        attendee.giftDeliveryMode === 'email' && attendee.email.trim()
          ? attendee.email.trim()
          : undefined,
      giftDeliveryMode: attendee.giftDeliveryMode,
    };
  }

  return {
    name: attendee.name.trim(),
    gender: attendee.gender || undefined,
    age: attendee.age ? Math.floor(Number(attendee.age)) : undefined,
    customAnswers: hasAnswers ? normalizedAnswers : undefined,
  };
};
