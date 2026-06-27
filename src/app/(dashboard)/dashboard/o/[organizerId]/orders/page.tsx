'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Download,
    Receipt,
    CreditCard,
    Calendar,
    User,
    Ticket,
    Check,
    X,
    Mail,
    RefreshCw,
    ChevronDown,
    Info,
    Users,
    Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { formatCustomQuestionDateForDisplay } from '@/lib/custom-question-dates';
import { toast } from '@/lib/notifications';
import {
    clearStoredRefundIdempotencyKey,
    getStoredRefundIdempotencyKey,
    isStripeBalanceTopUpRequiredError,
    type RefundIdempotencyParams,
} from '@/lib/refunds';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizers } from '@/context/organizer-context';
import { OrderCard, type OrderResponse, type OrderItem, type OrderStatus } from '@/components/orders/OrderCard';
import { ticketTypeColors } from '@/components/dashboard/CircularProgress';
import {
    buildAnswerQuestionLabelList,
    buildAttendeesQueryParams,
    clearAnswerFiltersForEventSelection,
    formatAnswerQuestionLabel,
    formatQuestionNumberLabel,
    getInitialEventFilterFromQuery,
    ORDER_PAGE_TABS,
    getAttendeeAnswerDisplayMode,
    type OrderDetailTab,
    type OrderPageTab,
    type AttendeeAnswerFilters,
} from '@/lib/orders-attendees-ui';

const progressColorMap: Record<string, string> = {
    primary: 'bg-linear-to-r from-violet-500 to-purple-500',
    emerald: 'bg-linear-to-r from-emerald-500 to-teal-500',
    violet: 'bg-linear-to-r from-violet-500 to-purple-500',
    amber: 'bg-linear-to-r from-amber-500 to-orange-500',
    rose: 'bg-linear-to-r from-rose-500 to-pink-500',
    sky: 'bg-linear-to-r from-sky-500 to-blue-500',
    lime: 'bg-linear-to-r from-lime-500 to-green-500',
    fuchsia: 'bg-linear-to-r from-fuchsia-500 to-pink-500',
};

const ATTENDEE_PAGE_SIZE = 500;

// useLayoutEffect on the client, useEffect on the server (avoids the SSR warning).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Custom-question column header. Only when the label actually overflows does it show a
// hover affordance that reveals the full text in a popover on hover (desktop) or tap (mobile).
function QuestionHeader({ label }: { label: string }) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [truncated, setTruncated] = useState(false);
    const [open, setOpen] = useState(false);

    // Measure before paint so the icon never pops in after the fact (no jump).
    useIsomorphicLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;
        // +1 tolerance kills sub-pixel-rounding false positives on labels that just fit.
        const measure = () => { if (el.isConnected) setTruncated(el.scrollWidth > el.clientWidth + 1); };
        measure();
        // Re-check once webfonts settle; fallback metrics can flag a fitting label as overflowing.
        document.fonts?.ready.then(measure).catch(() => {});
    }, [label]);

    const text = (
        <span ref={textRef} className="block min-w-0 max-w-48 truncate">
            {label}
        </span>
    );

    if (!truncated) return text;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                    className="group -mx-2 -my-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left align-middle outline-none transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
                >
                    {text}
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors duration-150 group-hover:text-foreground group-data-[state=open]:text-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="w-auto max-w-xs"
            >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</p>
                <p className="mt-1 break-words text-sm font-medium leading-snug text-foreground">{label}</p>
            </PopoverContent>
        </Popover>
    );
}

interface OrdersResponse {
    orders: OrderResponse[];
}

interface TicketBreakdownItem {
    ticketTypeId: string;
    name: string;
    quantity: number;
    revenue: number;
    isArchived?: boolean;
}

interface EventBreakdown {
    eventId: string;
    eventName: string;
    bannerImageUrl?: string;
    isActive: boolean;
    giftedTickets: number;
    promoCodes: Array<{
        id: string;
        code: string;
        usageCount: number;
        usageLimit: number | null;
        isActive: boolean;
    }>;
    tickets: TicketBreakdownItem[];
    total: { quantity: number; revenue: number };
}

interface TicketBreakdownResponse {
    events: EventBreakdown[];
    currency: string;
}

interface OrderTicket {
    id: string;
    ticketCode: string;
    ticketTypeId: string;
    ticketType: string | null;
    attendeeName: string | null;
    attendeeEmail: string | null;
    status: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
    unitPrice?: number;
    paidAmount?: number;
    refundBasePrice?: number;
    refundableAmount?: number;
    registrationAnswers?: RegistrationAnswer[];
}

interface OrderDetailResponse extends Omit<OrderResponse, 'attendee'> {
    attendee: OrderResponse['attendee'] & {
        gender?: string | null;
        age?: number | null;
    };
    totals: OrderResponse['totals'] & {
        remainingTicketRefundable?: number;
        breakdown?: {
            ticketSubtotal: number;
            organizerFeeTotal: number;
            discount: number;
            donationTotal: number;
            platformFee: number;
            processingFee: number;
            processingFeeVat: number;
        };
    };
    tickets: OrderTicket[];
}

interface UpdateAttendeeResponse {
    success: true;
    changed: boolean;
    orderId: string;
    attendee: {
        name: string | null;
        email: string;
        gender: 'male' | 'female' | null;
        age: number | null;
    };
    ticketsUpdatedCount: number;
    resend: {
        status: 'not_requested' | 'skipped' | 'sent' | 'failed';
        reason?: 'email_unchanged' | 'order_not_completed';
        to?: string;
        error?: string;
    };
}

interface RegistrationAnswer {
    questionId: string;
    label: string;
    type: string;
    options: string[] | null;
    value: string;
}

interface AttendeeRecord {
    ticketId: string;
    ticketCode: string;
    ticketTypeId: string;
    ticketType: string | null;
    ticketStatus: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
    checkInStatus: 'checked_in' | 'not_checked_in';
    orderId: string;
    orderNumber: string;
    orderStatus: OrderStatus;
    orderCreatedAt: string | null;
    buyer: {
        name: string | null;
        email: string;
    };
    ticketHolder: {
        name: string | null;
        email: string | null;
        gender?: string | null;
        age?: number | null;
    };
    event: {
        id: string;
        name: string | null;
        startsAt: string | null;
    };
    registrationAnswers: RegistrationAnswer[];
}

interface EventQuestionMetadata {
    questionId: string;
    label: string;
    type: string;
    options: string[] | null;
}

interface AttendeesResponse {
    attendees: AttendeeRecord[];
    total: number;
    limit: number;
    offset: number;
    eventQuestions?: EventQuestionMetadata[];
    answerFilterQuestions?: AnswerFilterQuestion[];
}

interface AnswerFilterQuestion {
    questionId: string;
    label: string;
    type: 'select' | 'checkbox';
    options: Array<{
        value: string;
        count: number;
    }>;
}

const statusBadges: Record<OrderStatus, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partially_refunded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusLabels: Record<OrderStatus, string> = {
    completed: 'Paid',
    refunded: 'Refunded',
    partially_refunded: 'Partial Refund',
};

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

const getEffectiveUnitPrice = (item: Pick<OrderItem, 'unitPrice' | 'organizerFee'>) =>
    item.unitPrice + (item.organizerFee ?? 0);

const getTicketPaidAmount = (ticket: OrderTicket) =>
    Math.max(0, ticket.paidAmount ?? ticket.refundBasePrice ?? ticket.unitPrice ?? 0);

const getRefundableTicketPrice = (ticket: OrderTicket) =>
    Math.max(0, ticket.refundableAmount ?? 0);

const formatAnswerValue = (answer: Pick<RegistrationAnswer, 'type' | 'value'>) =>
    answer.type === 'date'
        ? formatCustomQuestionDateForDisplay(answer.value)
        : answer.value;

const getAnswerValue = (answers: RegistrationAnswer[], questionId: string) => {
    const answer = answers.find((entry) => entry.questionId === questionId);
    return answer ? formatAnswerValue(answer) : '-';
};

const getPromoUsageBadges = (promoCodes: EventBreakdown['promoCodes']) =>
    [...promoCodes].sort((a, b) => {
        if (a.usageCount !== b.usageCount) {
            return b.usageCount - a.usageCount;
        }
        return a.code.localeCompare(b.code);
    });

export default function OrdersPage() {
    const organizerId = useOrganizerFromParams();
    const searchParams = useSearchParams();
    const initialEventId = searchParams.get('eventId');
    const { organizers } = useOrganizers();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
    const [attendeeTotal, setAttendeeTotal] = useState(0);
    const [knownAttendeeEvents, setKnownAttendeeEvents] = useState<Array<{ id: string; name: string }>>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [eventFilter, setEventFilter] = useState<string[]>([]); // Multi-select event filter
    const [answerFilters, setAnswerFilters] = useState<AttendeeAnswerFilters>({});
    const [answerFilterQuestions, setAnswerFilterQuestions] = useState<AnswerFilterQuestion[]>([]);
    const [selectedEventQuestions, setSelectedEventQuestions] = useState<EventQuestionMetadata[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetailResponse | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
    const [isLoadingMoreAttendees, setIsLoadingMoreAttendees] = useState(false);
    const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attendeesError, setAttendeesError] = useState<string | null>(null);

    // Dialog state
    const [activeTab, setActiveTab] = useState<OrderDetailTab>('details');
    const [refundType, setRefundType] = useState<'full' | 'partial' | 'tickets'>('full');
    const [partialAmount, setPartialAmount] = useState('');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [refundError, setRefundError] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [emailCooldowns, setEmailCooldowns] = useState<Map<string, number>>(new Map());
    const [isEditAttendeeOpen, setIsEditAttendeeOpen] = useState(false);
    const [isUpdatingAttendee, setIsUpdatingAttendee] = useState(false);
    const [attendeeForm, setAttendeeForm] = useState({
        name: '',
        email: '',
        gender: 'unspecified' as 'male' | 'female' | 'unspecified',
        age: '',
        resendConfirmation: false,
    });

    // Export state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'attendees' | 'emails'>('attendees');
    const [isExporting, setIsExporting] = useState(false);
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [includeAllEvents, setIncludeAllEvents] = useState(true);

    // Ticket breakdown state
    const [eventBreakdowns, setEventBreakdowns] = useState<EventBreakdown[]>([]);
    const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
    const [showAllBreakdown, setShowAllBreakdown] = useState(false);
    const attendeeRequestVersionRef = useRef(0);

    const [pageTab, setPageTab] = useState<OrderPageTab>('orders');

    const EMAIL_COOLDOWN_SECONDS = 5 * 60;

    const updateEventFilter = (nextEventIds: string[]) => {
        const currentSingleEventId = eventFilter.length === 1 ? eventFilter[0] : null;
        const nextSingleEventId = nextEventIds.length === 1 ? nextEventIds[0] : null;
        setEventFilter(nextEventIds);
        if (currentSingleEventId !== nextSingleEventId) {
            setAnswerFilters({});
            setAnswerFilterQuestions([]);
        } else {
            setAnswerFilters((current) =>
                clearAnswerFiltersForEventSelection(nextEventIds, current)
            );
        }
    };

    const toggleAnswerFilter = (questionId: string, choice: string) => {
        setAnswerFilters((current) => {
            const selectedChoices = current[questionId] ?? [];
            const nextChoices = selectedChoices.includes(choice)
                ? selectedChoices.filter((entry) => entry !== choice)
                : [...selectedChoices, choice];
            if (nextChoices.length === 0) {
                return Object.fromEntries(
                    Object.entries(current).filter(([key]) => key !== questionId)
                );
            }
            return { ...current, [questionId]: nextChoices };
        });
    };

    const canResendEmail = (orderId: string) => {
        const lastSent = emailCooldowns.get(orderId);
        if (!lastSent) return true;
        return Date.now() - lastSent > EMAIL_COOLDOWN_SECONDS * 1000;
    };

    const getCooldownRemaining = (orderId: string) => {
        const lastSent = emailCooldowns.get(orderId);
        if (!lastSent) return 0;
        const elapsed = Date.now() - lastSent;
        const remaining = Math.ceil((EMAIL_COOLDOWN_SECONDS * 1000 - elapsed) / 1000);
        return remaining > 0 ? remaining : 0;
    };

    const openEditAttendeeDialog = () => {
        if (!detailOrder) {
            return;
        }
        setAttendeeForm({
            name: detailOrder.attendee.name ?? '',
            email: detailOrder.attendee.email,
            gender:
                detailAttendee?.gender === 'male' || detailAttendee?.gender === 'female'
                    ? detailAttendee.gender
                    : 'unspecified',
            age: detailAttendee?.age === null || detailAttendee?.age === undefined
                ? ''
                : String(detailAttendee.age),
            resendConfirmation: false,
        });
        setIsEditAttendeeOpen(true);
    };

    const handleAttendeeEmailChange = (value: string) => {
        setAttendeeForm((current) => {
            const normalizedNext = value.trim().toLowerCase();
            const normalizedCurrent = current.email.trim().toLowerCase();
            const normalizedOriginal = detailOrder?.attendee.email.trim().toLowerCase() ?? '';
            const canResendCorrection = detailOrder?.status === 'completed';
            const isFirstEmailChange =
                canResendCorrection &&
                normalizedCurrent === normalizedOriginal &&
                normalizedNext !== normalizedOriginal;
            return {
                ...current,
                email: value,
                resendConfirmation:
                    canResendCorrection &&
                    normalizedNext !== normalizedOriginal &&
                    (isFirstEmailChange || current.resendConfirmation),
            };
        });
    };

    const handleUpdateAttendee = async () => {
        if (!selectedOrder) {
            return;
        }
        const normalizedEmail = attendeeForm.email.trim().toLowerCase();
        if (!normalizedEmail) {
            toast.warning('Attendee email is required.');
            return;
        }
        const trimmedAge = attendeeForm.age.trim();
        const parsedAge = trimmedAge === '' ? null : Number(trimmedAge);
        if (
            parsedAge !== null &&
            (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120)
        ) {
            toast.warning('Age must be a whole number between 0 and 120.');
            return;
        }

        setIsUpdatingAttendee(true);
        try {
            const response = await api.patch<UpdateAttendeeResponse>(
                `/api/v1/orders/${selectedOrder.id}/attendee`,
                {
                    attendeeName: attendeeForm.name.trim() || null,
                    attendeeEmail: normalizedEmail,
                    attendeeGender: attendeeForm.gender === 'unspecified' ? null : attendeeForm.gender,
                    attendeeAge: parsedAge,
                    resendConfirmation: attendeeForm.resendConfirmation,
                },
            );

            const [detail, list] = await Promise.all([
                api.get<OrderDetailResponse>(`/api/v1/orders/${selectedOrder.id}`),
                organizerId
                    ? api.get<OrdersResponse>('/api/v1/orders', { params: { organizerId } })
                    : Promise.resolve<OrdersResponse>({ orders: [] }),
            ]);

            setSelectedOrderDetail(detail);
            setOrders(list.orders);
            setSelectedOrder(list.orders.find((order) => order.id === selectedOrder.id) ?? selectedOrder);
            setIsEditAttendeeOpen(false);
            if (response.resend.status === 'sent') {
                setEmailCooldowns((prev) => new Map(prev).set(selectedOrder.id, Date.now()));
            }

            if (!response.changed) {
                toast.info('No changes made');
            } else if (response.resend.status === 'failed') {
                toast.warning('Attendee updated, but resend failed', {
                    description: response.resend.error ?? 'The attendee details were saved.',
                });
            } else {
                toast.success('Attendee updated', {
                    description:
                        response.resend.status === 'sent'
                            ? `Confirmation resent to ${response.resend.to ?? normalizedEmail}.`
                            : `${response.ticketsUpdatedCount} ticket${response.ticketsUpdatedCount === 1 ? '' : 's'} updated.`,
                });
            }
        } catch (err) {
            console.error('Failed to update attendee:', err);
            toast.error(err, 'Unable to update attendee');
        } finally {
            setIsUpdatingAttendee(false);
        }
    };

    const handleResendEmail = async (orderId: string) => {
        const order = orders.find((entry) => entry.id === orderId);
        if (order && order.status !== 'completed') {
            toast.warning('Refunded orders cannot receive confirmation emails.');
            return;
        }
        if (!canResendEmail(orderId)) {
            toast.warning('Please wait', {
                description: `You can resend in ${getCooldownRemaining(orderId)} seconds.`
            });
            return;
        }

        setIsResending(true);
        try {
            await api.post(`/api/v1/orders/${orderId}/resend-confirmation`);
            // Record cooldown
            setEmailCooldowns(prev => new Map(prev).set(orderId, Date.now()));
            toast.success('Confirmation email sent', {
                description: 'The attendee will receive their tickets shortly.'
            });
        } catch (err) {
            console.error('Failed to resend email:', err);
            toast.error(err, undefined, {
                action: {
                    label: 'Retry',
                    onClick: () => handleResendEmail(orderId),
                },
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleOpenExportModal = (type: 'attendees' | 'emails') => {
        setExportType(type);
        setExportModalOpen(true);
        // Reset filters
        setSelectedEvents([]);
        setDateRange({ start: '', end: '' });
        setIncludeAllEvents(true);
    };

    const handleExport = async () => {
        if (!organizerId) return;

        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                organizerId,
            });

            // Add event filter if not all events selected
            if (!includeAllEvents && selectedEvents.length > 0) {
                params.append('eventId', selectedEvents[0]);
            }

            // Add status filter (from current view)
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            // Add date range if specified
            if (dateRange.start) {
                params.append('startDate', dateRange.start);
            }
            if (dateRange.end) {
                params.append('endDate', dateRange.end);
            }

            // Add includeRefunded for email export
            if (exportType === 'emails') {
                params.append('includeRefunded', 'false');
            }

            const endpoint = exportType === 'attendees'
                ? '/api/v1/orders/export/attendees'
                : '/api/v1/orders/export/emails';

            // Use fetch instead of axios to avoid JSON parsing
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Get auth token from localStorage
            const token = typeof window !== 'undefined'
                ? window.localStorage.getItem('halal-ticketin-access-token')
                : null;

            const headers: HeadersInit = {
                'Accept': 'text/csv',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${baseURL}${endpoint}?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers,
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get the CSV text
            const csvText = await response.text();

            // Create download link
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = exportType === 'attendees'
                ? `attendees-${Date.now()}.csv`
                : `emails-${Date.now()}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Export complete', {
                description: `${exportType === 'attendees' ? 'Attendee list' : 'Email list'} downloaded successfully`,
            });
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed', `Unable to generate ${exportType === 'attendees' ? 'attendee list' : 'email list'}`);
        } finally {
            setIsExporting(false);
            setExportModalOpen(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        setEventFilter(getInitialEventFilterFromQuery(initialEventId));
        setAnswerFilters({});
        setAnswerFilterQuestions([]);
        setSelectedEventQuestions([]);
        setAttendees([]);
        setAttendeeTotal(0);
        setKnownAttendeeEvents([]);
        const fetchOrders = async () => {
            if (!organizerId) {
                setOrders([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const response = await api.get<OrdersResponse>('/api/v1/orders', {
                    params: { organizerId },
                });
                if (!isMounted) {
                    return;
                }
                setOrders(response.orders);
                setError(null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to load orders';
                if (!isMounted) {
                    return;
                }
                setError(message);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void fetchOrders();
        return () => {
            isMounted = false;
        };
    }, [organizerId, initialEventId]);

    useEffect(() => {
        let isMounted = true;
        const requestVersion = ++attendeeRequestVersionRef.current;
        const fetchAttendees = async () => {
            if (!organizerId || pageTab !== 'attendees') {
                return;
            }

            setIsLoadingAttendees(true);
            try {
                const params = buildAttendeesQueryParams({
                    organizerId,
                    eventIds: eventFilter,
                    status: statusFilter,
                    search: searchQuery,
                    answerFilters,
                    limit: ATTENDEE_PAGE_SIZE,
                    offset: 0,
                });

                const response = await api.get<AttendeesResponse>('/api/v1/orders/attendees', {
                    params,
                });
                if (!isMounted || requestVersion !== attendeeRequestVersionRef.current) {
                    return;
                }
                setAttendees(response.attendees);
                setAttendeeTotal(response.total);
                setKnownAttendeeEvents((current) => {
                    const next = new Map(current.map((event) => [event.id, event.name]));
                    for (const attendee of response.attendees) {
                        next.set(attendee.event.id, attendee.event.name || 'Unnamed Event');
                    }
                    return [...next.entries()].map(([id, name]) => ({ id, name }));
                });
                setAnswerFilterQuestions(response.answerFilterQuestions ?? []);
                setSelectedEventQuestions(response.eventQuestions ?? []);
                setAttendeesError(null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to load attendees';
                if (!isMounted || requestVersion !== attendeeRequestVersionRef.current) {
                    return;
                }
                setAttendees([]);
                setAttendeeTotal(0);
                setAnswerFilterQuestions([]);
                setSelectedEventQuestions([]);
                setAttendeesError(message);
            } finally {
                if (isMounted && requestVersion === attendeeRequestVersionRef.current) {
                    setIsLoadingAttendees(false);
                }
            }
        };

        void fetchAttendees();
        return () => {
            isMounted = false;
        };
    }, [organizerId, pageTab, searchQuery, statusFilter, eventFilter, answerFilters]);

    const handleLoadMoreAttendees = async () => {
        if (!organizerId || isLoadingMoreAttendees) {
            return;
        }

        const requestVersion = attendeeRequestVersionRef.current;
        setIsLoadingMoreAttendees(true);
        try {
            const params = buildAttendeesQueryParams({
                organizerId,
                eventIds: eventFilter,
                status: statusFilter,
                search: searchQuery,
                answerFilters,
                limit: ATTENDEE_PAGE_SIZE,
                offset: attendees.length,
            });
            const response = await api.get<AttendeesResponse>('/api/v1/orders/attendees', {
                params,
            });
            if (requestVersion !== attendeeRequestVersionRef.current) {
                return;
            }
            setAttendees((current) => {
                const existingTicketIds = new Set(current.map((attendee) => attendee.ticketId));
                const nextAttendees = response.attendees.filter(
                    (attendee) => !existingTicketIds.has(attendee.ticketId),
                );
                return [...current, ...nextAttendees];
            });
            setAttendeeTotal(response.total);
            setKnownAttendeeEvents((current) => {
                const next = new Map(current.map((event) => [event.id, event.name]));
                for (const attendee of response.attendees) {
                    next.set(attendee.event.id, attendee.event.name || 'Unnamed Event');
                }
                return [...next.entries()].map(([id, name]) => ({ id, name }));
            });
            setAttendeesError(null);
        } catch (err) {
            if (requestVersion !== attendeeRequestVersionRef.current) {
                return;
            }
            const message = err instanceof Error ? err.message : 'Unable to load more attendees';
            setAttendeesError(message);
        } finally {
            setIsLoadingMoreAttendees(false);
        }
    };

    // Fetch ticket breakdown
    useEffect(() => {
        let isMounted = true;
        const fetchBreakdown = async () => {
            if (!organizerId) {
                setEventBreakdowns([]);
                return;
            }
            setIsLoadingBreakdown(true);
            try {
                const response = await api.get<TicketBreakdownResponse>('/api/v1/orders/ticket-breakdown', {
                    params: { organizerId },
                });
                if (!isMounted) return;
                setEventBreakdowns(response.events);
            } catch (err) {
                console.error('Failed to fetch ticket breakdown:', err);
            } finally {
                if (isMounted) setIsLoadingBreakdown(false);
            }
        };

        void fetchBreakdown();
        return () => {
            isMounted = false;
        };
    }, [organizerId]);

    useEffect(() => {
        if (!isDialogOpen || !selectedOrder) {
            setSelectedOrderDetail(null);
            setIsLoadingOrderDetail(false);
            return;
        }

        let isMounted = true;
        setIsLoadingOrderDetail(true);

        const fetchOrderDetail = async () => {
            try {
                const detail = await api.get<OrderDetailResponse>(`/api/v1/orders/${selectedOrder.id}`);
                if (!isMounted) {
                    return;
                }
                setSelectedOrderDetail(detail);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setSelectedOrderDetail(null);
                toast.error(err, 'Unable to load refund details');
            } finally {
                if (isMounted) {
                    setIsLoadingOrderDetail(false);
                }
            }
        };

        void fetchOrderDetail();

        return () => {
            isMounted = false;
        };
    }, [isDialogOpen, selectedOrder]);

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.attendee.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.promo?.code ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesEvent = eventFilter.length === 0 || eventFilter.includes(order.event.id);
        return matchesSearch && matchesStatus && matchesEvent;
    });

    const filteredAttendees = attendees.filter((attendee) => {
        return eventFilter.length === 0 || eventFilter.includes(attendee.event.id);
    });
    const hasMoreAttendees = attendees.length < attendeeTotal;
    const eventOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const order of orders) {
            map.set(order.event.id, order.event.name || 'Unnamed Event');
        }
        for (const event of knownAttendeeEvents) {
            map.set(event.id, event.name);
        }
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }, [knownAttendeeEvents, orders]);
    const attendeeAnswerDisplayMode = getAttendeeAnswerDisplayMode(eventFilter);
    const selectedEventQuestionLabels = useMemo(() => {
        if (attendeeAnswerDisplayMode !== 'visible') {
            return [];
        }

        return buildAnswerQuestionLabelList(selectedEventQuestions, filteredAttendees);
    }, [attendeeAnswerDisplayMode, filteredAttendees, selectedEventQuestions]);

    const openOrderDetails = (order: OrderResponse) => {
        setSelectedOrder(order);
        setSelectedOrderDetail(null);
        setActiveTab('details');
        setRefundType('full');
        setPartialAmount('');
        setSelectedTicketIds(new Set());
        setRefundError(null);
        setIsDialogOpen(true);
    };

    const detailOrder = selectedOrderDetail ?? selectedOrder;
    const detailAttendee = detailOrder?.attendee as OrderDetailResponse['attendee'] | undefined;
    const detailTickets = selectedOrderDetail?.tickets ?? [];
    const detailBreakdown = selectedOrderDetail?.totals.breakdown;
    const remainingRefundable = selectedOrderDetail?.totals.remainingRefundable ?? 0;
    const remainingTicketRefundable = selectedOrderDetail?.totals.remainingTicketRefundable ?? 0;
    const hasDonationAmount = (detailBreakdown?.donationTotal ?? 0) > 0;
    const attendeeEmailChanged =
        Boolean(detailOrder) &&
        attendeeForm.email.trim().toLowerCase() !== (detailOrder?.attendee.email ?? '').trim().toLowerCase();
    const canResendEditedConfirmation = detailOrder?.status === 'completed' && attendeeEmailChanged;
    const refundableTickets = useMemo(
        () =>
            (selectedOrderDetail?.tickets ?? []).filter(
                (ticket) =>
                    (ticket.status === 'valid' || ticket.status === 'checked_in')
            ),
        [selectedOrderDetail]
    );
    const isRefundActionDisabled =
        detailOrder?.status === 'refunded' ||
        (selectedOrderDetail !== null && remainingRefundable <= 0 && refundableTickets.length === 0);
    const canShowRefundAction =
        (detailOrder?.status === 'completed' || detailOrder?.status === 'partially_refunded') &&
        !isRefundActionDisabled;
    const selectedRefundTotal = useMemo(
        () =>
            refundableTickets.reduce((sum, ticket) => {
                if (!selectedTicketIds.has(ticket.id)) {
                    return sum;
                }
                return sum + getRefundableTicketPrice(ticket);
            }, 0),
        [refundableTickets, selectedTicketIds]
    );
    const parsedPartialAmount = parseFloat(partialAmount);
    const isPartialAmountInvalid =
        refundType === 'partial' &&
        (
            !partialAmount ||
            Number.isNaN(parsedPartialAmount) ||
            parsedPartialAmount <= 0 ||
            parsedPartialAmount > remainingRefundable
        );

    const { totalOrders, paidOrders, revenueTotal, ticketRevenueTotal, donationRevenueTotal } = useMemo(() => {
        const totals = orders.reduce(
            (acc, order) => {
                acc.totalOrders += 1;
                if (order.status === 'completed' || order.status === 'partially_refunded') {
                    if (order.status === 'completed') {
                        acc.paidOrders += 1;
                    }
                    // Use net revenue to match overview stats
                    acc.revenueTotal += order.totals.net ?? order.totals.total;
                    acc.ticketRevenueTotal += order.totals.ticketRevenue ?? 0;
                    acc.donationRevenueTotal += order.totals.donationRevenue ?? 0;
                }
                return acc;
            },
            { totalOrders: 0, paidOrders: 0, revenueTotal: 0, ticketRevenueTotal: 0, donationRevenueTotal: 0 }
        );
        return totals;
    }, [orders]);

    const activeOrganizer = organizers.find((org) => org.id === organizerId);
    const fallbackCurrency =
        activeOrganizer?.defaultCurrency ??
        orders[0]?.totals.netCurrency ??
        orders[0]?.totals.currency ??
        'GBP';
    const netRevenueCurrency = orders[0]?.totals.netCurrency ?? fallbackCurrency;

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage purchases and process refunds</p>
                </motion.div>

                {/* Orders / Tickets Toggle */}
                <div className="mb-6">
                    <div className="inline-flex p-1 bg-muted/80 rounded-xl">
                        {ORDER_PAGE_TABS.map((tab) => {
                            const Icon = tab.id === 'orders' ? Receipt : tab.id === 'tickets' ? Ticket : Users;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setPageTab(tab.id)}
                                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 sm:px-6 ${pageTab === tab.id
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Icon className="inline-block h-4 w-4 mr-2" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Cards - Horizontal scroll on mobile */}
                <div className="mb-8 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="h-full bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                                            <Receipt className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground leading-tight">Total Orders</p>
                                            <p className="text-2xl font-bold leading-tight">{totalOrders}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="h-full bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                                            <Check className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground leading-tight">Paid Orders</p>
                                            <p className="text-2xl font-bold leading-tight">{paidOrders}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="h-full bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                                            <CreditCard className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground leading-tight">Net Revenue</p>
                                            <p className="text-2xl font-bold leading-tight">
                                                {formatCurrency(revenueTotal, netRevenueCurrency)}
                                            </p>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                <span>Tickets {formatCurrency(ticketRevenueTotal, netRevenueCurrency)}</span>
                                                {donationRevenueTotal > 0 && (
                                                    <span>Donations {formatCurrency(donationRevenueTotal, netRevenueCurrency)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>



                {/* Tickets Tab - Ticket Breakdown Section */}
                {pageTab === 'tickets' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isLoadingBreakdown ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                            </div>
                        ) : eventBreakdowns.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-1">No ticket data yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Ticket sales breakdown will appear here once you start selling
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-semibold text-lg">Ticket Sales by Event</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {showAllBreakdown ? 'All events' : 'Active events'}
                                            </p>
                                        </div>
                                    </div>
                                    {(eventBreakdowns.filter(e => e.isActive).length > 2 || eventBreakdowns.some(e => !e.isActive)) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                                            className="text-violet-600 hover:text-violet-700 dark:text-violet-400"
                                        >
                                            {showAllBreakdown
                                                ? 'Show Less'
                                                : `See All (${eventBreakdowns.length} events)`
                                            }
                                            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showAllBreakdown ? 'rotate-180' : ''}`} />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid gap-4 grid-cols-1">
                                    {(showAllBreakdown ? eventBreakdowns : eventBreakdowns.filter(e => e.isActive).slice(0, 4)).map((event, eventIndex) => (
                                        <motion.div
                                            key={event.eventId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Card
                                                className={`bg-linear-to-br ${event.isActive
                                                    ? 'from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-100 dark:border-violet-900'
                                                    : 'from-gray-50/50 to-slate-50/50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800'
                                                    }`}
                                            >
                                                <CardContent className="pt-4 pb-4">
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center relative shadow-sm border border-border/10">
                                                            {event.bannerImageUrl ? (
                                                                <Image
                                                                    src={event.bannerImageUrl}
                                                                    alt={event.eventName}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h4 className="font-semibold text-sm truncate">{event.eventName}</h4>
                                                                {!event.isActive && (
                                                                    <Badge variant="secondary" className="text-[10px] shrink-0">Past</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {event.total.quantity} tickets
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {event.tickets.map((ticket, ticketIndex) => {
                                                            const percentage = event.total.quantity > 0
                                                                ? (ticket.quantity / event.total.quantity) * 100
                                                                : 0;

                                                            const colorKey = ticketTypeColors[ticketIndex % ticketTypeColors.length];
                                                            const colorClass = progressColorMap[colorKey];

                                                            // Extract the solid color from the gradient class for the tooltip border/bg
                                                            // This is a bit of a hack since we're using tailwind classes
                                                            // improved approach: define explicit hex/tailwnd colors map
                                                            const tooltipStyles = {
                                                                primary: 'bg-violet-500 border-violet-500 text-white',
                                                                emerald: 'bg-emerald-500 border-emerald-500 text-white',
                                                                violet: 'bg-violet-500 border-violet-500 text-white',
                                                                amber: 'bg-amber-500 border-amber-500 text-white',
                                                                rose: 'bg-rose-500 border-rose-500 text-white',
                                                                sky: 'bg-sky-500 border-sky-500 text-white',
                                                                lime: 'bg-lime-500 border-lime-500 text-white',
                                                                fuchsia: 'bg-fuchsia-500 border-fuchsia-500 text-white',
                                                            }[colorKey] || 'bg-slate-800 border-slate-800 text-white';

                                                            return (
                                                                <div key={ticket.ticketTypeId || ticketIndex} className="space-y-1.5">
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="font-medium truncate flex-1 mr-2">
                                                                            {ticket.name}
                                                                            {ticket.isArchived && (
                                                                                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                                                    Archived
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 text-right shrink-0">
                                                                            <span className="text-muted-foreground">{ticket.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                    <TooltipProvider>
                                                                        <Tooltip delayDuration={0}>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="h-4 bg-muted/50 rounded-full overflow-hidden cursor-pointer">
                                                                                    <motion.div
                                                                                        initial={{ width: 0 }}
                                                                                        animate={{ width: `${percentage}%` }}
                                                                                        whileHover={{ opacity: 0.8 }}
                                                                                        transition={{ delay: 0.3 + eventIndex * 0.1 + ticketIndex * 0.05, duration: 0.4 }}
                                                                                        className={`h-full rounded-full ${event.isActive
                                                                                            ? colorClass
                                                                                            : 'bg-linear-to-r from-gray-400 to-slate-400'
                                                                                            }`}
                                                                                    />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent
                                                                                showArrow={false}
                                                                                side="top"
                                                                                className={`border-2 ${event.isActive ? tooltipStyles : 'bg-gray-500 border-gray-500 text-white'}`}
                                                                            >
                                                                                <p className="font-medium">{ticket.name}</p>
                                                                                <p className="text-xs opacity-90">
                                                                                    {ticket.quantity} sold ({percentage.toFixed(1)}%)
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {event.promoCodes.length > 0 && (
                                                        <div className="mt-8 pt-6 border-t border-dashed border-border/30">
                                                            {event.promoCodes.length > 0 && (
                                                                <>
                                                                    <div className="flex items-center gap-2 mb-4">
                                                                        <Ticket className="w-3.5 h-3.5 text-muted-foreground/50" />
                                                                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/60">
                                                                            Promo Code Usage
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {getPromoUsageBadges(event.promoCodes).map((promo, idx) => {
                                                                            const hasLimit = promo.usageLimit && promo.usageLimit > 0;
                                                                            const percentage = hasLimit ? Math.min(100, (promo.usageCount / (promo.usageLimit as number)) * 100) : 0;

                                                                            const chromaticColors = [
                                                                                { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', progress: 'bg-emerald-500/40' },
                                                                                { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-700 dark:text-violet-400', progress: 'bg-violet-500/40' },
                                                                                { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-700 dark:text-rose-400', progress: 'bg-rose-500/40' },
                                                                                { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-700 dark:text-amber-400', progress: 'bg-amber-500/40' },
                                                                                { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-700 dark:text-sky-400', progress: 'bg-sky-500/40' },
                                                                                { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-400', progress: 'bg-fuchsia-500/40' },
                                                                            ];
                                                                            const theme = chromaticColors[idx % chromaticColors.length];

                                                                            return (
                                                                                <motion.div
                                                                                    key={promo.id}
                                                                                    initial={{ opacity: 0, y: 8 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    whileHover={{ y: -1 }}
                                                                                    transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                                                                                    className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-full border ${theme.bg} ${theme.border} transition-all duration-200 hover:shadow-sm`}
                                                                                >
                                                                                    <span className={`font-mono text-[11px] font-bold ${theme.text} border-r ${theme.border} pr-3 leading-none`}>
                                                                                        {promo.code}
                                                                                    </span>

                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="flex items-baseline gap-1 tabular-nums">
                                                                                            <span className={`text-[11px] font-bold ${theme.text}`}>
                                                                                                {promo.usageCount}
                                                                                            </span>
                                                                                            <span className="text-[9px] font-medium text-muted-foreground/60 uppercase">
                                                                                                Used
                                                                                            </span>
                                                                                        </div>

                                                                                        {hasLimit && (
                                                                                            <div className="w-10 h-1 bg-muted/40 rounded-full overflow-hidden">
                                                                                                <motion.div
                                                                                                    initial={{ width: 0 }}
                                                                                                    animate={{ width: `${percentage}%` }}
                                                                                                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.5 }}
                                                                                                    className={`h-full ${theme.progress}`}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {pageTab === 'attendees' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <Card className="bg-linear-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20 border-indigo-100/50 dark:border-indigo-900/50">
                            <CardContent className="py-4">
                                <div className="flex flex-col gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search attendees, buyers, ticket codes, or events..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 bg-background/80 backdrop-blur"
                                        />
                                        {searchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[150px] h-10 bg-background/80 backdrop-blur">
                                                <Filter className="h-4 w-4 mr-2" />
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="completed">Paid</SelectItem>
                                                <SelectItem value="refunded">Refunded</SelectItem>
                                                <SelectItem value="partially_refunded">Partial Refund</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Ticket className="h-4 w-4 mr-2" />
                                                    Events {eventFilter.length > 0 && `(${eventFilter.length})`}
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56">
                                                <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                                    <div
                                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer border-b pb-2 mb-2"
                                                        onClick={() => updateEventFilter([])}
                                                    >
                                                        <Checkbox
                                                            id="attendee-filter-event-all"
                                                            checked={eventFilter.length === 0}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <Label
                                                            htmlFor="attendee-filter-event-all"
                                                            className="flex-1 cursor-pointer font-medium text-sm"
                                                        >
                                                            All Events
                                                        </Label>
                                                    </div>

                                                    {eventOptions.map((event) => (
                                                        <div
                                                            key={event.id}
                                                            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                                                            onClick={() => {
                                                                if (eventFilter.includes(event.id)) {
                                                                    updateEventFilter(eventFilter.filter(id => id !== event.id));
                                                                } else {
                                                                    updateEventFilter([...eventFilter, event.id]);
                                                                }
                                                            }}
                                                        >
                                                            <Checkbox
                                                                id={`attendee-filter-event-${event.id}`}
                                                                checked={eventFilter.includes(event.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <Label
                                                                htmlFor={`attendee-filter-event-${event.id}`}
                                                                className="flex-1 cursor-pointer font-normal text-sm"
                                                            >
                                                                {event.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {eventFilter.length === 1 && answerFilterQuestions.map((question) => {
                                            const selectedCount = answerFilters[question.questionId]?.length ?? 0;
                                            return (
                                                <DropdownMenu key={question.questionId}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="h-10 max-w-full bg-background/80 backdrop-blur"
                                                        >
                                                            <Filter className="h-4 w-4 mr-2 shrink-0" />
                                                            <span className="max-w-48 truncate">{question.label}</span>
                                                            {selectedCount > 0 && (
                                                                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
                                                                    {selectedCount}
                                                                </Badge>
                                                            )}
                                                            <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-64">
                                                        {question.options.map((option) => (
                                                            <DropdownMenuCheckboxItem
                                                                key={option.value}
                                                                checked={answerFilters[question.questionId]?.includes(option.value) ?? false}
                                                                onCheckedChange={() => toggleAnswerFilter(question.questionId, option.value)}
                                                                onSelect={(event) => event.preventDefault()}
                                                            >
                                                                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                                                    <span className="truncate">{option.value}</span>
                                                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                                        ({option.count})
                                                                    </span>
                                                                </span>
                                                            </DropdownMenuCheckboxItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            );
                                        })}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Export
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('attendees')}>
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Attendee List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('emails')}>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Email List
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {eventFilter.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {eventFilter.map(eventId => {
                                    const event = eventOptions.find((entry) => entry.id === eventId);
                                    return (
                                        <Badge
                                            key={eventId}
                                            variant="secondary"
                                            className="px-3 py-1.5 cursor-pointer hover:bg-secondary/80"
                                            onClick={() => updateEventFilter(eventFilter.filter(id => id !== eventId))}
                                        >
                                            {event?.name || 'Event'}
                                            <X className="h-3 w-3 ml-1.5" />
                                        </Badge>
                                    );
                                })}
                                {eventFilter.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => updateEventFilter([])}
                                    >
                                        Clear all
                                    </Button>
                                )}
                            </div>
                        )}

                        {isLoadingAttendees ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                                    <p className="text-muted-foreground">Loading attendees...</p>
                                </div>
                            </div>
                        ) : attendeesError ? (
                            <Card className="p-12 text-center">
                                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">{attendeesError}</p>
                            </Card>
                        ) : filteredAttendees.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-1">No attendees found</p>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery || statusFilter !== 'all' || eventFilter.length > 0
                                        ? 'Try adjusting your filters'
                                        : 'Attendees will appear here once tickets are issued'}
                                </p>
                            </Card>
                        ) : (
                            <>
                                <Card className="hidden overflow-hidden md:block">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium">Attendee</th>
                                                    <th className="px-4 py-3 text-left font-medium">Ticket</th>
                                                    <th className="px-4 py-3 text-left font-medium">Event</th>
                                                    <th className="px-4 py-3 text-left font-medium">Buyer</th>
                                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                                    {attendeeAnswerDisplayMode === 'visible'
                                                        ? selectedEventQuestionLabels.map((question, questionIndex) => (
                                                            <th key={question.questionId} className="px-4 py-3 text-left font-medium">
                                                                <QuestionHeader label={formatQuestionNumberLabel(question.label, questionIndex)} />
                                                            </th>
                                                        ))
                                                        : (
                                                            <th className="px-4 py-3 text-left font-medium">Answers</th>
                                                        )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredAttendees.map((attendee) => (
                                                    <tr key={attendee.ticketId} className="bg-card/80 align-top">
                                                        <td className="px-4 py-4">
                                                            <p className="font-medium">{attendee.ticketHolder.name || 'Unnamed attendee'}</p>
                                                            <p className="text-xs text-muted-foreground">{attendee.ticketHolder.email || 'No email'}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {[attendee.ticketHolder.gender, attendee.ticketHolder.age ? `${attendee.ticketHolder.age} yrs` : null].filter(Boolean).join(' • ')}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-medium">{attendee.ticketType || 'Ticket'}</p>
                                                            <p className="font-mono text-xs text-muted-foreground">{attendee.ticketCode}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-medium">{attendee.event.name || 'Event'}</p>
                                                            <p className="text-xs text-muted-foreground">{attendee.orderNumber.slice(0, 8)}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="font-medium">{attendee.buyer.name || 'Buyer'}</p>
                                                            <p className="text-xs text-muted-foreground">{attendee.buyer.email}</p>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="space-y-2">
                                                                <Badge className={statusBadges[attendee.orderStatus]}>
                                                                    {statusLabels[attendee.orderStatus]}
                                                                </Badge>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {attendee.checkInStatus === 'checked_in' ? 'Checked in' : 'Not checked in'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        {attendeeAnswerDisplayMode === 'visible'
                                                            ? selectedEventQuestionLabels.map((question) => (
                                                                <td key={question.questionId} className="max-w-[220px] px-4 py-4">
                                                                    <p className="break-words text-sm">{getAnswerValue(attendee.registrationAnswers, question.questionId)}</p>
                                                                </td>
                                                            ))
                                                            : (
                                                                <td className="px-4 py-4">
                                                                    {attendee.registrationAnswers.length === 0 ? (
                                                                        <span className="text-xs text-muted-foreground">No answers</span>
                                                                    ) : (
                                                                        <details className="group">
                                                                            <summary className="cursor-pointer text-xs font-medium text-violet-700 dark:text-violet-300">
                                                                                {attendee.registrationAnswers.length} answer{attendee.registrationAnswers.length === 1 ? '' : 's'}
                                                                            </summary>
                                                                            <div className="mt-2 space-y-2">
                                                                                {attendee.registrationAnswers.map((answer) => (
                                                                                    <div key={answer.questionId} className="rounded-md bg-muted/50 p-2">
                                                                                        <p className="text-xs font-medium text-muted-foreground">{answer.label}</p>
                                                                                        <p className="break-words text-sm">{formatAnswerValue(answer)}</p>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </details>
                                                                    )}
                                                                </td>
                                                            )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>

                                <div className="space-y-3 md:hidden">
                                    {filteredAttendees.map((attendee) => (
                                        <Card key={attendee.ticketId}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold truncate">{attendee.ticketHolder.name || 'Unnamed attendee'}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{attendee.ticketHolder.email || attendee.buyer.email}</p>
                                                    </div>
                                                    <Badge className={`${statusBadges[attendee.orderStatus]} shrink-0`}>
                                                        {statusLabels[attendee.orderStatus]}
                                                    </Badge>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Ticket</p>
                                                        <p className="font-medium">{attendee.ticketType || 'Ticket'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Check-in</p>
                                                        <p className="font-medium">{attendee.checkInStatus === 'checked_in' ? 'Checked in' : 'Not checked in'}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-muted-foreground">Event</p>
                                                        <p className="font-medium">{attendee.event.name || 'Event'}</p>
                                                    </div>
                                                </div>
                                                {attendee.registrationAnswers.length > 0 && (
                                                    <details className="mt-4 rounded-lg bg-muted/50 p-3">
                                                        <summary className="cursor-pointer text-sm font-medium">
                                                            Answers
                                                        </summary>
                                                        <div className="mt-3 space-y-3">
                                                            {attendee.registrationAnswers.map((answer) => (
                                                                <div key={answer.questionId}>
                                                                    <p className="text-xs font-medium text-muted-foreground">
                                                                        {formatAnswerQuestionLabel(answer.label, answer.questionId, selectedEventQuestionLabels)}
                                                                    </p>
                                                                    <p className="break-words text-sm">{formatAnswerValue(answer)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {hasMoreAttendees && (
                                    <div className="flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={handleLoadMoreAttendees}
                                            disabled={isLoadingMoreAttendees}
                                        >
                                            {isLoadingMoreAttendees
                                                ? 'Loading attendees...'
                                                : `Load more (${attendees.length} of ${attendeeTotal})`}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {/* Orders Tab Content */}
                {pageTab === 'orders' && (
                    <>
                        {/* Filters & Search with gradient background */}
                        <Card className="mb-6 bg-linear-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20 border-indigo-100/50 dark:border-indigo-900/50">
                            <CardContent className="py-4">
                                <div className="flex flex-col gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by order ID, name, email, or promo code..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 bg-background/80 backdrop-blur"
                                        />
                                        {searchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[150px] h-10 bg-background/80 backdrop-blur">
                                                <Filter className="h-4 w-4 mr-2" />
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="completed">Paid</SelectItem>
                                                <SelectItem value="refunded">Refunded</SelectItem>
                                                <SelectItem value="partially_refunded">Partial Refund</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Event Filter Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Ticket className="h-4 w-4 mr-2" />
                                                    Events {eventFilter.length > 0 && `(${eventFilter.length})`}
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56">
                                                <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                                    {/* All Events Option */}
                                                    <div
                                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer border-b pb-2 mb-2"
                                                        onClick={() => updateEventFilter([])}
                                                    >
                                                        <Checkbox
                                                            id="filter-event-all"
                                                            checked={eventFilter.length === 0}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <Label
                                                            htmlFor="filter-event-all"
                                                            className="flex-1 cursor-pointer font-medium text-sm"
                                                        >
                                                            All Events
                                                        </Label>
                                                    </div>

                                                    {eventOptions.map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                                                                onClick={() => {
                                                                    if (eventFilter.includes(event.id)) {
                                                                        updateEventFilter(eventFilter.filter(id => id !== event.id));
                                                                    } else {
                                                                        updateEventFilter([...eventFilter, event.id]);
                                                                    }
                                                                }}
                                                            >
                                                                <Checkbox
                                                                    id={`filter-event-${event.id}`}
                                                                    checked={eventFilter.includes(event.id)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <Label
                                                                    htmlFor={`filter-event-${event.id}`}
                                                                    className="flex-1 cursor-pointer font-normal text-sm"
                                                                >
                                                                    {event.name || "Unnamed Event"}
                                                                </Label>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Export
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('attendees')}>
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Attendee List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('emails')}>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Email List
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Event Filter Chips */}
                        {eventFilter.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {eventFilter.map(eventId => {
                                    const event = orders.find(o => o.event.id === eventId)?.event;
                                    return (
                                        <Badge
                                            key={eventId}
                                            variant="secondary"
                                            className="px-3 py-1.5 cursor-pointer hover:bg-secondary/80"
                                            onClick={() => updateEventFilter(eventFilter.filter(id => id !== eventId))}
                                        >
                                            {event?.name || "Event"}
                                            <X className="h-3 w-3 ml-1.5" />
                                        </Badge>
                                    );
                                })}
                                {eventFilter.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => updateEventFilter([])}
                                    >
                                        Clear all
                                    </Button>
                                )}
                            </div>
                        )}


                        {/* Orders Grid */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-32">
                                <div className="text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                                    <p className="text-muted-foreground">Loading orders...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <Card className="p-12 text-center">
                                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">{error}</p>
                            </Card>
                        ) : filteredOrders.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-1">No orders found</p>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery || statusFilter !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Orders will appear here once customers make purchases'}
                                </p>
                            </Card>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredOrders.map((order, index) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: index * 0.05, duration: 0.2 }}
                                        >
                                            <OrderCard
                                                order={order}
                                                onViewDetails={openOrderDetails}
                                                onResendEmail={handleResendEmail}
                                                onRefund={(order) => {
                                                    setSelectedOrder(order);
                                                    setSelectedOrderDetail(null);
                                                    setActiveTab('refund');
                                                    setRefundType('full');
                                                    setPartialAmount('');
                                                    setSelectedTicketIds(new Set());
                                                    setRefundError(null);
                                                    setIsDialogOpen(true);
                                                }}
                                                isResending={isResending}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </>
                )}

                {/* Order Details Dialog with Tabs */}
                <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setSelectedOrderDetail(null);
                            setSelectedTicketIds(new Set());
                            setPartialAmount('');
                            setRefundError(null);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] overflow-y-auto">
                        {detailOrder && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                        <span className="font-mono text-sm">{detailOrder.orderNumber.slice(0, 8)}...</span>
                                        <Badge className={`${statusBadges[detailOrder.status]} capitalize`}>
                                            {statusLabels[detailOrder.status]}
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Review order details, ticket answers, resend confirmations, or process refunds.
                                    </DialogDescription>
                                </DialogHeader>

                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderDetailTab)} className="mt-4">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="details">Details</TabsTrigger>
                                        <TabsTrigger value="answers">Answers</TabsTrigger>
                                        <TabsTrigger
                                            value="refund"
                                            disabled={isRefundActionDisabled}
                                        >
                                            Refund
                                        </TabsTrigger>
                                    </TabsList>

                                    <motion.div
                                        layout
                                        className="overflow-hidden mt-4"
                                        transition={{ duration: 0.2, type: "tween", ease: "easeInOut" }}
                                    >
                                        {activeTab === 'details' ? (
                                            <motion.div
                                                layout
                                                key="details"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TabsContent value="details" forceMount className="mt-0 space-y-4 p-1">
                                                    {/* Tickets */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <Ticket className="h-4 w-4" /> Tickets
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                                            {detailTickets.length > 0 ? (
                                                                detailTickets.map((ticket) => (
                                                                    <div
                                                                        key={ticket.id}
                                                                        className="flex items-start justify-between gap-3 text-sm"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="font-medium">
                                                                                {ticket.ticketType ?? 'Ticket'}
                                                                            </p>
                                                                            <p className="text-muted-foreground truncate">
                                                                                {ticket.attendeeName || ticket.ticketCode}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {ticket.status === 'refunded' && (
                                                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                                                                                    Refunded
                                                                                </Badge>
                                                                            )}
                                                                            <span className="font-medium">
                                                                                {formatCurrency(getTicketPaidAmount(ticket), detailOrder.totals.currency)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                detailOrder.items.map((item) => (
                                                                    <div key={item.id} className="flex justify-between text-sm">
                                                                        <span>{item.quantity}x {item.name ?? 'Ticket'}</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(getEffectiveUnitPrice(item) * item.quantity, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Customer */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <User className="h-4 w-4" /> Customer
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-semibold">{detailOrder.attendee.name ?? 'Unnamed'}</p>
                                                            <p className="text-sm text-muted-foreground">{detailOrder.attendee.email}</p>
                                                            {(detailAttendee?.gender || detailAttendee?.age != null) && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {detailAttendee?.gender ? detailAttendee.gender : 'Gender not set'}
                                                                    {detailAttendee?.age !== null && detailAttendee?.age !== undefined
                                                                        ? ` · Age ${detailAttendee.age}`
                                                                        : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Event */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" /> Event
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-semibold">{detailOrder.event.name ?? 'Unpublished'}</p>
                                                        </div>
                                                    </div>

                                                    {detailBreakdown && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Order Summary</h4>
                                                            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span>Ticket subtotal</span>
                                                                    <span className="font-medium">
                                                                        {formatCurrency(detailBreakdown.ticketSubtotal, detailOrder.totals.currency)}
                                                                    </span>
                                                                </div>
                                                                {detailBreakdown.organizerFeeTotal > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span>Organiser fees</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(detailBreakdown.organizerFeeTotal, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {detailBreakdown.discount > 0 && (
                                                                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                                                        <span>
                                                                            Discount
                                                                            {detailOrder.promo?.code ? ` (${detailOrder.promo.code})` : ''}
                                                                        </span>
                                                                        <span className="font-medium">
                                                                            -{formatCurrency(detailBreakdown.discount, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {detailBreakdown.donationTotal > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span>Donation</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(detailBreakdown.donationTotal, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {detailBreakdown.platformFee > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span>Platform fee</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(detailBreakdown.platformFee, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {detailBreakdown.processingFee > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span>Processing fee</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(detailBreakdown.processingFee, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {detailBreakdown.processingFeeVat > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span>Processing fee VAT</span>
                                                                        <span className="font-medium">
                                                                            {formatCurrency(detailBreakdown.processingFeeVat, detailOrder.totals.currency)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Separator />

                                                    {/* Total */}
                                                    <div className="flex justify-between font-semibold text-lg">
                                                        <span>Total</span>
                                                        <span>{formatCurrency(detailOrder.totals.total, detailOrder.totals.currency)}</span>
                                                    </div>

                                                    {/* Payment */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4" /> Payment
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-medium">{detailOrder.paymentMethod ?? 'Payment details unavailable'}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(detailOrder.createdAt).toLocaleString('en-GB')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className={`grid gap-3 pt-2 ${canShowRefundAction ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={openEditAttendeeDialog}
                                                        >
                                                            <User className="h-4 w-4 mr-2" />
                                                            Edit attendee
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => selectedOrder && handleResendEmail(selectedOrder.id)}
                                                            disabled={isResending || detailOrder.status !== 'completed'}
                                                        >
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            {isResending ? 'Sending...' : 'Resend Email'}
                                                        </Button>
                                                        {canShowRefundAction && (
                                                            <Button
                                                                variant="destructive"
                                                                className="w-full"
                                                                onClick={() => setActiveTab('refund')}
                                                            >
                                                                <RefreshCw className="h-4 w-4 mr-2" /> Refund
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            </motion.div>
                                        ) : activeTab === 'answers' ? (
                                            <motion.div
                                                layout
                                                key="answers"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TabsContent value="answers" forceMount className="mt-0 space-y-4 p-1">
                                                    {isLoadingOrderDetail ? (
                                                        <div className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                                                            Loading answers...
                                                        </div>
                                                    ) : detailTickets.length === 0 ? (
                                                        <div className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                                                            No ticket answers found for this order.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {detailTickets.map((ticket) => (
                                                                <div key={ticket.id} className="rounded-lg bg-muted/50 p-3">
                                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="font-medium">{ticket.attendeeName || ticket.ticketCode}</p>
                                                                            <p className="text-xs text-muted-foreground truncate">
                                                                                {ticket.ticketType || 'Ticket'} - {ticket.attendeeEmail || 'No email'}
                                                                            </p>
                                                                        </div>
                                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                                            {ticket.ticketCode.slice(0, 8)}
                                                                        </Badge>
                                                                    </div>
                                                                    {ticket.registrationAnswers && ticket.registrationAnswers.length > 0 ? (
                                                                        <div className="space-y-3">
                                                                            {ticket.registrationAnswers.map((answer) => {
                                                                                const questionLabels = selectedEventQuestionLabels.length > 0
                                                                                    ? selectedEventQuestionLabels
                                                                                    : ticket.registrationAnswers ?? [];
                                                                                return (
                                                                                    <div key={answer.questionId} className="rounded-md bg-background/80 p-3">
                                                                                        <p className="text-xs font-medium text-muted-foreground">
                                                                                            {formatAnswerQuestionLabel(answer.label, answer.questionId, questionLabels)}
                                                                                        </p>
                                                                                        <p className="mt-1 break-words text-sm">{formatAnswerValue(answer)}</p>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">No answers for this ticket.</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TabsContent>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                layout
                                                key="refund"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TabsContent value="refund" forceMount className="mt-0 space-y-4 p-1">
                                                    {/* Refund Type Selection */}
                                                    <div className="space-y-3">
                                                        <Label>Refund Type</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Ticket refunds exclude platform, processing, and organiser fees.
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['full', 'partial', 'tickets'] as const).map((type) => (
                                                                <Button
                                                                    key={type}
                                                                    variant={refundType === type ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => setRefundType(type)}
                                                                    className="capitalize"
                                                                >
                                                                    {type === 'tickets' ? 'By Ticket' : type}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {isLoadingOrderDetail && (
                                                        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                                                            Loading refundable ticket details...
                                                        </div>
                                                    )}

                                                    {/* Full Refund */}
                                                    {selectedOrderDetail && refundType === 'full' && (
                                                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-muted-foreground">Total refundable amount</p>
                                                            <p className="text-2xl font-bold">{formatCurrency(remainingRefundable, detailOrder.totals.currency)}</p>
                                                            {remainingTicketRefundable > 0 && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Tickets {formatCurrency(remainingTicketRefundable, detailOrder.totals.currency)}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground mt-1">All tickets will be revoked</p>
                                                        </div>
                                                    )}

                                                    {/* Partial Amount */}
                                                    {selectedOrderDetail && refundType === 'partial' && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="amount">Refund amount</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                                    {detailOrder.totals.currency === 'GBP' ? '£' : detailOrder.totals.currency === 'EUR' ? '€' : '$'}
                                                                </span>
                                                                <Input
                                                                    id="amount"
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0.01"
                                                                    max={remainingRefundable}
                                                                    value={partialAmount}
                                                                    onChange={(e) => setPartialAmount(e.target.value)}
                                                                    className="pl-8"
                                                                    placeholder={`Max: ${remainingRefundable.toFixed(2)}`}
                                                                />
                                                            </div>
                                                            {partialAmount && parsedPartialAmount > remainingRefundable && (
                                                                <p className="text-xs text-destructive">
                                                                    Partial refunds cannot exceed the remaining refundable balance.
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground">Tickets remain valid after partial refund</p>
                                                        </div>
                                                    )}

                                                    {/* Ticket Selection */}
                                                    {selectedOrderDetail && refundType === 'tickets' && (
                                                        <div className="space-y-3">
                                                            <Label>Select Tickets to Refund</Label>
                                                            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2">
                                                                {refundableTickets.length === 0 ? (
                                                                    <p className="p-2 text-sm text-muted-foreground">
                                                                        {isLoadingOrderDetail ? 'Loading tickets...' : 'No refundable tickets remaining.'}
                                                                    </p>
                                                                ) : refundableTickets.map((ticket) => (
                                                                    <div
                                                                        key={ticket.id}
                                                                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                                                                        onClick={() => {
                                                                            setSelectedTicketIds((prev) => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(ticket.id)) next.delete(ticket.id);
                                                                                else next.add(ticket.id);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <Checkbox checked={selectedTicketIds.has(ticket.id)} />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm">{ticket.ticketType || 'Ticket'}</span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {ticket.attendeeName || ticket.ticketCode}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    Paid {formatCurrency(getTicketPaidAmount(ticket), detailOrder.totals.currency)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="block text-sm font-medium">
                                                                                {formatCurrency(getRefundableTicketPrice(ticket), detailOrder.totals.currency)}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">Refundable</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {selectedTicketIds.size > 0 && (
                                                                <div className="flex justify-between text-sm font-medium">
                                                                    <span>{selectedTicketIds.size} ticket(s)</span>
                                                                    <span>
                                                                        {formatCurrency(selectedRefundTotal, detailOrder.totals.currency)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {refundError && (
                                                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                                                            {refundError}
                                                        </div>
                                                    )}

                                                    {hasDonationAmount && (
                                                        <p className="text-xs text-muted-foreground">
                                                            To refund a donation, contact the HalalTicketin team via the{' '}
                                                            <Link href="/contact" className="text-foreground underline underline-offset-2 hover:text-primary">
                                                                contact form
                                                            </Link>
                                                            .
                                                        </p>
                                                    )}

                                                    {/* Refund Button */}
                                                    <Button
                                                        variant="destructive"
                                                        className="w-full"
                                                        disabled={
                                                            isProcessing ||
                                                            isLoadingOrderDetail ||
                                                            !selectedOrderDetail ||
                                                            isPartialAmountInvalid ||
                                                            (refundType === 'tickets' && selectedTicketIds.size === 0)
                                                        }
                                                        onClick={async () => {
                                                            if (!selectedOrder || !selectedOrderDetail) {
                                                                return;
                                                            }
                                                            setIsProcessing(true);
                                                            setRefundError(null);
                                                            try {
                                                                const refundParams: RefundIdempotencyParams = {};
                                                                if (refundType === 'partial') {
                                                                    refundParams.amount = parsedPartialAmount;
                                                                } else if (refundType === 'tickets') {
                                                                    refundParams.ticketIds = refundableTickets
                                                                        .filter((ticket) => selectedTicketIds.has(ticket.id))
                                                                        .map((ticket) => ticket.id);
                                                                }
                                                                const body: { amount?: number; ticketIds?: string[]; idempotencyKey: string } = {
                                                                    ...refundParams,
                                                                    idempotencyKey: getStoredRefundIdempotencyKey(selectedOrder.id, refundParams),
                                                                };
                                                                await api.post(`/api/v1/orders/${selectedOrder.id}/refund`, body);
                                                                clearStoredRefundIdempotencyKey(selectedOrder.id, refundParams);
                                                                setOrders((prev) =>
                                                                    prev.map((o) =>
                                                                        o.id === selectedOrder.id
                                                                            ? { ...o, status: (refundType === 'full' ? 'refunded' : 'partially_refunded') as OrderStatus }
                                                                            : o
                                                                    )
                                                                );
                                                                setSelectedTicketIds(new Set());
                                                                setPartialAmount('');
                                                                setIsDialogOpen(false);
                                                            } catch (err) {
                                                                if (isStripeBalanceTopUpRequiredError(err)) {
                                                                    setRefundError('The organiser Stripe account needs enough available balance before this refund can be completed. Top up the connected Stripe account in Stripe, then retry once the funds are available.');
                                                                } else {
                                                                    setRefundError(err instanceof Error ? err.message : 'Failed to process refund');
                                                                }
                                                            } finally {
                                                                setIsProcessing(false);
                                                            }
                                                        }}
                                                    >
                                                        {isProcessing
                                                            ? 'Processing...'
                                                            : refundType === 'full'
                                                                ? 'Process Full Refund'
                                                                : refundType === 'partial'
                                                                    ? 'Process Partial Refund'
                                                                    : 'Process Ticket Refund'}
                                                    </Button>
                                                </TabsContent>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </Tabs>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditAttendeeOpen} onOpenChange={setIsEditAttendeeOpen}>
                    <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit attendee</DialogTitle>
                            <DialogDescription className="sr-only">
                                Update the buyer details stored on this order and matching inherited ticket records.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-attendee-name">Name</Label>
                                <Input
                                    id="edit-attendee-name"
                                    value={attendeeForm.name}
                                    onChange={(event) =>
                                        setAttendeeForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder="Attendee name"
                                    disabled={isUpdatingAttendee}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-attendee-email">Email</Label>
                                <Input
                                    id="edit-attendee-email"
                                    type="email"
                                    value={attendeeForm.email}
                                    onChange={(event) => handleAttendeeEmailChange(event.target.value)}
                                    placeholder="attendee@example.com"
                                    disabled={isUpdatingAttendee}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-attendee-gender">Gender</Label>
                                    <Select
                                        value={attendeeForm.gender}
                                        onValueChange={(value: 'male' | 'female' | 'unspecified') =>
                                            setAttendeeForm((current) => ({ ...current, gender: value }))
                                        }
                                        disabled={isUpdatingAttendee}
                                    >
                                        <SelectTrigger id="edit-attendee-gender">
                                            <SelectValue placeholder="Not set" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unspecified">Not set</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="male">Male</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-attendee-age">Age</Label>
                                    <Input
                                        id="edit-attendee-age"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={120}
                                        value={attendeeForm.age}
                                        onChange={(event) =>
                                            setAttendeeForm((current) => ({ ...current, age: event.target.value }))
                                        }
                                        placeholder="Not set"
                                        disabled={isUpdatingAttendee}
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border p-3">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="edit-attendee-resend"
                                        checked={attendeeForm.resendConfirmation && canResendEditedConfirmation}
                                        disabled={isUpdatingAttendee || !canResendEditedConfirmation}
                                        onCheckedChange={(checked) =>
                                            setAttendeeForm((current) => ({
                                                ...current,
                                                resendConfirmation: Boolean(checked),
                                            }))
                                        }
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-attendee-resend" className="cursor-pointer">
                                            Resend confirmation to the updated email
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {detailOrder?.status !== 'completed'
                                                ? 'Confirmation resend is unavailable for refunded orders.'
                                                : attendeeEmailChanged
                                                    ? 'This bypasses the normal resend cooldown for email corrections.'
                                                    : 'Change the email address to enable resend.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsEditAttendeeOpen(false)}
                                disabled={isUpdatingAttendee}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="w-full"
                                onClick={handleUpdateAttendee}
                                disabled={isUpdatingAttendee}
                            >
                                {isUpdatingAttendee ? 'Saving...' : 'Save changes'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Export Modal */}
                <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Export {exportType === 'attendees' ? 'Attendee List' : 'Email List'}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Choose which order records to include in the CSV export.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Event Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-medium">Events</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="all-events"
                                            checked={includeAllEvents}
                                            onCheckedChange={(checked) => {
                                                setIncludeAllEvents(!!checked);
                                                if (checked) {
                                                    setSelectedEvents([]);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="all-events" className="font-normal cursor-pointer">
                                            All Events
                                        </Label>
                                    </div>
                                </div>

                                {!includeAllEvents && (
                                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                        {/* Get unique events from orders */}
                                        {Array.from(new Set(orders.map(o => o.event.id)))
                                            .map(eventId => {
                                                const order = orders.find(o => o.event.id === eventId);
                                                if (!order) return null;

                                                return (
                                                    <div key={eventId} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`event-${eventId}`}
                                                            checked={selectedEvents.includes(eventId)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedEvents([...selectedEvents, eventId]);
                                                                } else {
                                                                    setSelectedEvents(selectedEvents.filter(id => id !== eventId));
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`event-${eventId}`}
                                                            className="font-normal cursor-pointer flex-1"
                                                        >
                                                            {order.event.name || 'Unnamed Event'}
                                                        </Label>
                                                    </div>
                                                );
                                            })
                                            .filter(Boolean)
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Date Range */}
                            <div className="space-y-3">
                                <Label className="text-base font-medium">Date Range (Optional)</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="start-date" className="text-sm text-muted-foreground">From</Label>
                                        <Input
                                            id="start-date"
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="end-date" className="text-sm text-muted-foreground">To</Label>
                                        <Input
                                            id="end-date"
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Current Filters Info */}
                            <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                <p className="font-medium mb-1">Current Filters Applied:</p>
                                <ul className="space-y-0.5 text-muted-foreground">
                                    <li>• Status: {statusFilter === 'all' ? 'All' : statusLabels[statusFilter as OrderStatus]}</li>
                                    {searchQuery && <li>• Search: &quot;{searchQuery}&quot;</li>}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setExportModalOpen(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleExport}
                                disabled={isExporting || (!includeAllEvents && selectedEvents.length === 0)}
                            >
                                {isExporting ? (
                                    <>
                                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
