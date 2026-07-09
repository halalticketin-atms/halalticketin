/**
 * Single source of truth for FAQ content, shared by the FAQ page UI and the
 * FAQPage JSON-LD emitted from the server layout so the two cannot drift.
 *
 * Answers support a minimal markdown subset: [text](href) links and
 * **bold** emphasis. The UI renders them; `faqPlainAnswer` strips them
 * for structured data.
 */

export type FaqItemData = {
  id: string;
  question: string;
  /** Answer copy with minimal markdown: [text](href) and **bold**. */
  answer: string;
  /** Plain-text copy of the answer plus extra keywords, used only for search. */
  search: string;
};

export type FaqSectionData = {
  id: string;
  title: string;
  items: FaqItemData[];
};

export const FAQ_SECTIONS: FaqSectionData[] = [
  {
    id: 'tickets',
    title: 'Your tickets',
    items: [
      {
        id: 'where-are-my-tickets',
        question: 'Where are my tickets?',
        answer:
          'Your tickets are emailed to you straight after purchase, in a confirmation email with a QR code for each ticket. They also appear on the order confirmation screen right after checkout, where you can download the QR codes.',
        search:
          'tickets emailed confirmation email qr code download order confirmation find my tickets lost',
      },
      {
        id: 'no-confirmation-email',
        question: "I haven't received my confirmation email",
        answer:
          'First, check your spam or junk folder and make sure you’re looking in the inbox for the email address you entered at checkout. If it’s still missing, contact the event organiser using the **Contact organiser** button on the event page. They can look up your order and resend your confirmation.',
        search:
          'missing confirmation email spam junk folder resend tickets not received didnt arrive',
      },
      {
        id: 'phone-entry',
        question: 'Do I need to print my ticket?',
        answer:
          'No. Showing the QR code on your phone at the door is all you need. Each QR code is scanned once at check-in, so have your confirmation email or downloaded QR codes ready.',
        search: 'print ticket paper phone qr code entry door check in scan',
      },
      {
        id: 'tickets-for-others',
        question: 'I bought tickets for friends or family. How does entry work?',
        answer:
          'All the tickets from your order arrive in one confirmation email, each with its own QR code. You can forward the email or send each person their QR code, and everyone is scanned in individually.',
        search: 'multiple tickets group friends family forward share entry separate qr codes',
      },
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds & cancellations',
    items: [
      {
        id: 'request-refund',
        question: 'How do I request a refund?',
        answer:
          'Refunds are handled by the event organiser, in line with the refund policy they set for their event. The fastest route is the **Contact organiser** button on the event page; their contact details are also in your confirmation email. Include your order number so they can find your booking quickly.',
        search: 'refund request money back cancel my ticket order number contact organiser',
      },
      {
        id: 'what-is-refunded',
        question: 'What does a refund cover?',
        answer:
          'That depends on the organiser’s refund policy. Unless stated otherwise, refunds cover the ticket price only; platform and payment processing fees are non-refundable. See our [Terms & Conditions](/terms) for the full details.',
        search: 'refund amount fees non-refundable ticket price partial booking fee terms',
      },
      {
        id: 'event-cancelled',
        question: 'The event was cancelled or postponed. What happens now?',
        answer:
          'The organiser is responsible for letting ticket holders know and arranging refunds or transfers to a new date. If you haven’t heard anything, reach out to them first, and if you can’t get a response, [contact us](/contact) and we’ll help.',
        search: 'event cancelled postponed rescheduled new date refund transfer',
      },
      {
        id: 'organiser-not-responding',
        question: "The organiser isn't responding. Can you help?",
        answer:
          'Yes. Give the organiser a reasonable window to reply first, as they handle refunds and ticket questions directly. If you’re still stuck, [send us a message](/contact) with your order number and the event name, and we’ll step in to resolve it.',
        search:
          'organiser not responding no reply ignored escalate help dispute complaint refund tickets',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & checkout',
    items: [
      {
        id: 'payment-security',
        question: 'Is my payment secure?',
        answer:
          'Yes. All payments are processed by Stripe, a leading payment provider used by millions of businesses. Your card details go directly to Stripe and are never stored on our servers.',
        search: 'payment secure safe stripe card details stored security pay',
      },
      {
        id: 'promo-codes',
        question: "My promo code isn't working",
        answer:
          'Promo codes are created by organisers and can expire or have a limited number of uses. Check the spelling first, and if it still doesn’t apply, contact the organiser to confirm the code is still active.',
        search: 'promo code discount voucher coupon not working invalid expired',
      },
      {
        id: 'charged-no-tickets',
        question: 'I was charged but have no tickets',
        answer:
          'Occasionally a confirmation email is delayed or lands in spam, so check there first. If there’s genuinely no order confirmation, [contact us](/contact) with the email address you used and the approximate time of payment, and we’ll track it down.',
        search: 'charged no tickets payment taken money missing order failed double charge',
      },
    ],
  },
  {
    id: 'organisers',
    title: 'For organisers',
    items: [
      {
        id: 'organiser-cost',
        question: 'How much does it cost to sell tickets?',
        answer:
          'Creating an event is free, and free tickets stay free. For paid tickets we charge a small fee per ticket sold. See the full breakdown on our [pricing page](/pricing).',
        search: 'cost fees pricing sell tickets commission charge organiser free',
      },
      {
        id: 'organiser-payouts',
        question: 'How and when do I get paid?',
        answer:
          'Payouts go through Stripe. You connect your own Stripe account during onboarding, and ticket revenue is paid out to your bank account on Stripe’s payout schedule.',
        search: 'payout paid bank account stripe connect money revenue when',
      },
      {
        id: 'organiser-check-in',
        question: 'How do I check people in at the door?',
        answer:
          'Use the free HalalTicketin’ organiser app on the App Store to scan ticket QR codes at the door. You can also search orders by name and check people in manually if they can’t find their ticket.',
        search: 'check in scan qr code door entry app organiser manual search orders',
      },
    ],
  },
];

/** Strips the minimal markdown so the answer can be used in JSON-LD. */
export function faqPlainAnswer(answer: string): string {
  return answer
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}
