// Common TypeScript type definitions for HalalTicketin'

// Event types
export interface Event {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    startDate: Date;
    endDate: Date;
    timezone: string;
    location: EventLocation;
    organizer: Organizer;
    tickets: Ticket[];
    status: EventStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventLocation {
    type: 'physical' | 'online' | 'hybrid';
    venue?: string;
    address?: string;
    city?: string;
    country?: string;
    onlineUrl?: string;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

// Organizer types
export interface Organizer {
    id: string;
    name: string;
    bio?: string;
    email: string;
    website?: string;
    socialLinks?: SocialLinks;
    avatarUrl?: string;
}

export interface SocialLinks {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
}

// Ticket types
export interface Ticket {
    id: string;
    eventId: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    quantity: number;
    quantitySold: number;
    type: TicketType;
    salesStart?: Date;
    salesEnd?: Date;
}

export type TicketType = 'free' | 'paid' | 'donation';

// Order types
export interface Order {
    id: string;
    eventId: string;
    attendee: Attendee;
    tickets: OrderTicket[];
    totalAmount: number;
    currency: string;
    status: OrderStatus;
    paymentIntentId?: string;
    createdAt: Date;
}

export interface OrderTicket {
    ticketId: string;
    quantity: number;
    unitPrice: number;
}

export interface Attendee {
    id: string;
    name: string;
    email: string;
    customFields?: Record<string, string>;
}

export type OrderStatus = 'pending' | 'completed' | 'refunded' | 'cancelled';

// Dashboard types
export interface DashboardStats {
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    upcomingEvents: number;
}

// Placeholder Data Types (for UI demos before backend integration)

/** Dashboard stat card item */
export interface StatCardItem {
    label: string;
    value: string;
    change: string;
}

/** Recent event item displayed on dashboard */
export interface RecentEventItem {
    id: string;
    name: string;
    date: string;
    tickets: number;
    status: 'draft' | 'published';
}

/** Event list item for events management page */
export interface EventListItem {
    id: string;
    name: string;
    date: string;
    location: string;
    tickets: {
        sold: number;
        total: number;
    };
    revenue: string;
    status: 'draft' | 'published';
}

/** Ticket option displayed on event details page */
export interface TicketOption {
    name: string;
    price: number;
    available: number;
}

/** Public event details for event page */
export interface EventDetails {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    address: string;
    organizer: string;
    tickets: TicketOption[];
    imageUrl: string;
}

// Check-in types
export interface CheckInTicket {
    id: string;
    ticketCode: string;
    orderId: string;
    orderNumber: string;
    attendeeName: string;
    attendeeEmail: string;
    ticketType: string;
    checkInStatus: 'checked_in' | 'not_checked_in';
    checkedInAt?: Date;
    checkedInBy?: string;
    checkedInByName?: string | null;
    // Group awareness
    groupSize: number;
    groupCheckedIn: number;
}

export interface CheckInStats {
    totalTickets: number;
    checkedIn: number;
    notCheckedIn: number;
    percentage: number;
}

export type CheckInResult =
    | { status: 'success'; ticket: CheckInTicket }
    | { status: 'already_checked_in'; ticket: CheckInTicket; checkedInAt: Date }
    | { status: 'invalid'; message: string };

export * from './organizers';
