'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Bold,
    Calendar,
    Check,
    ChevronRight,
    Clock,
    Italic,
    Loader2,
    Mail,
    RotateCcw,
    Search,
    Send,
    Type,
    Trash2,
    Underline,
    Upload,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, type DashboardEvent, type DashboardEventStatus } from '@/hooks/useOrganizerEvents';
import { buildDashboardPath } from '@/lib/organizer-path';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/lib/notifications';
import { fileToDataUrl, uploadAttendeeEmailImage } from '@/lib/upload-api';

type OrderStatus = 'completed' | 'refunded' | 'partially_refunded';

interface OrderResponse {
    id: string;
    orderNumber: string;
    createdAt: string;
    attendee: {
        name: string | null;
        email: string;
    };
    event: {
        id: string;
        name: string | null;
    };
    status: OrderStatus;
}

interface EmailHistorySummary {
    id: string;
    event: {
        id: string;
        title: string | null;
    };
    audience: 'all' | 'individual' | 'recent' | 'refunded';
    subject: string;
    messagePreview: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    status: 'sending' | 'completed' | 'partial_failure' | 'failed';
    createdAt: string;
    completedAt: string | null;
    sentBy: {
        id: string;
        name: string | null;
        email: string | null;
    };
}

interface EmailHistoryDetail extends EmailHistorySummary {
    message: string;
    audienceSnapshot: {
        mode: 'all' | 'individual' | 'recent' | 'refunded';
        orderIds: string[];
        previewMeta?: {
            eventTitle: string;
            eventMeta: string;
            organizerLabel: string;
        };
        images?: EmailImagesPayload;
    };
    recipients: Array<{
        id: string;
        orderId: string | null;
        email: string;
        name: string | null;
        createdAt: string;
    }>;
    recipientsPage: {
        limit: number;
        offset: number;
        nextOffset: number | null;
        hasMore: boolean;
        search: string;
    };
}

type EmailImageAlign = 'left' | 'center' | 'right';

interface EmailInlineImage {
    id: string;
    url: string;
    alt: string;
    width: number;
    align: EmailImageAlign;
    previewUrl?: string;
}

type EmailImagesPayload = EmailInlineImage[];

const HISTORY_PAGE_SIZE = 50;
const HISTORY_RECIPIENT_PAGE_SIZE = 50;

const statusStyles: Record<DashboardEventStatus, { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
    },
    past: {
        label: 'Past',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
    },
    draft: {
        label: 'Draft',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
};

const formatEventDate = (event: DashboardEvent) => {
    if (!event.startDatetime) {
        return 'Date TBD';
    }
    const start = new Date(event.startDatetime);
    return start.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const formatEventLocation = (event: DashboardEvent) => {
    if (event.locationType === 'online') {
        return 'Online event';
    }
    if (event.venue && event.city) {
        return `${event.venue}, ${event.city}`;
    }
    if (event.venue) {
        return event.venue;
    }
    if (event.city) {
        return event.city;
    }
    return 'Location TBD';
};

const historyAudienceLabels: Record<EmailHistorySummary['audience'], string> = {
    all: 'All attendees',
    individual: 'Selected people',
    recent: 'Recent buyers',
    refunded: 'Refunded attendees',
};

const formatHistoryDate = (value: string) =>
    new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const buildSubject = (event: DashboardEvent | null) => {
    if (!event) {
        return 'Event update';
    }
    const date = event.startDatetime
        ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
        })
        : null;
    const title = event.title ?? 'your event';
    return `Update for ${title}${date ? ` - ${date}` : ''}`;
};

const escapeMessageHtml = (message: string) =>
    message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const clampMessageFontSize = (size: number) => Math.max(10, Math.min(48, size));
const clampEmailImageWidth = (width: number) => Math.max(140, Math.min(640, width));
const emailImageTokenPattern = /\[image:([a-zA-Z0-9_-]+)\]/gi;
const LEGACY_LARGE_FONT_SIZE = 18;
const LEGACY_LARGE_LINE_HEIGHT = 1.7;
const LEGACY_SMALL_FONT_SIZE = 12;
const LEGACY_SMALL_LINE_HEIGHT = 1.6;
const EDITOR_INLINE_IMAGE_VERTICAL_MARGIN_PX = 2;
const PREVIEW_INLINE_IMAGE_VERTICAL_MARGIN_PX = 6;
const EDITOR_INLINE_IMAGE_PADDING_PX = 4;

const getEmailImageAlignmentStyles = (align: EmailImageAlign) => {
    if (align === 'left') {
        return { wrapper: 'left', margin: '0 auto 0 0' };
    }
    if (align === 'right') {
        return { wrapper: 'right', margin: '0 0 0 auto' };
    }
    return { wrapper: 'center', margin: '0 auto' };
};

const renderInlineEmailImageHtml = (
    image: EmailInlineImage,
    options?: { mode?: 'preview' | 'editor' }
) => {
    const align = getEmailImageAlignmentStyles(image.align);
    const src = escapeMessageHtml(image.previewUrl || image.url);
    const alt = escapeMessageHtml(image.alt);
    const width = clampEmailImageWidth(image.width);
    const mode = options?.mode ?? 'preview';
    const verticalMargin =
        mode === 'editor' ? EDITOR_INLINE_IMAGE_VERTICAL_MARGIN_PX : PREVIEW_INLINE_IMAGE_VERTICAL_MARGIN_PX;
    const imageStyles = [
        'display: block',
        `width: ${width}px`,
        'max-width: 100%',
        'height: auto',
        'border-radius: 16px',
        `margin: ${align.margin}`,
        'background: #ffffff',
        mode === 'editor' ? 'border: 1px solid rgba(15, 23, 42, 0.08)' : '',
        mode === 'editor' ? `padding: ${EDITOR_INLINE_IMAGE_PADDING_PX}px` : '',
        mode === 'editor' ? 'cursor: pointer' : '',
    ].filter(Boolean).join('; ');

    if (mode === 'editor') {
        return `
            <figure data-email-image-id="${escapeMessageHtml(image.id)}" contenteditable="false" style="margin: ${verticalMargin}px 0; text-align: ${align.wrapper};">
                <img src="${src}" alt="${alt}" draggable="false" style="${imageStyles};" />
            </figure>
        `;
    }

    return `
        <div style="margin: ${verticalMargin}px 0; text-align: ${align.wrapper};">
            <img src="${src}" alt="${alt}" style="${imageStyles};" />
        </div>
    `;
};

const renderFormattedMessageHtml = (
    message: string,
    images?: EmailImagesPayload,
    options?: { mode?: 'preview' | 'editor' }
) => {
    const imageMap = new Map((images ?? []).map((image) => [image.id, image]));
    const withPlaceholders = escapeMessageHtml(message).replace(
        emailImageTokenPattern,
        (_match, imageId) => `__EMAIL_IMAGE_${imageId}__`
    );

    const formattedMessage = withPlaceholders
        .replace(/\[align=(left|center|right)\]([\s\S]*?)\[\/align\]/gi, (_match, align, content) => {
            return `<div style="text-align: ${align};">${content}</div>`;
        })
        .replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, (_match, rawSize, content) => {
            const size = clampMessageFontSize(Number(rawSize));
            return `<span style="font-size: ${size}px; line-height: 1.6;">${content}</span>`;
        })
        .replace(/\[large\]([\s\S]*?)\[\/large\]/gi, `<span style="font-size: ${LEGACY_LARGE_FONT_SIZE}px; line-height: ${LEGACY_LARGE_LINE_HEIGHT};">$1</span>`)
        .replace(/\[small\]([\s\S]*?)\[\/small\]/gi, `<span style="font-size: ${LEGACY_SMALL_FONT_SIZE}px; line-height: ${LEGACY_SMALL_LINE_HEIGHT};">$1</span>`)
        .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
        .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<span style="text-decoration: underline;">$1</span>')
        .replace(/\n/g, '<br/>');

    return formattedMessage.replace(/__EMAIL_IMAGE_([a-zA-Z0-9_-]+)__/g, (_match, imageId) => {
        const image = imageMap.get(imageId);
        return image ? renderInlineEmailImageHtml(image, options) : '';
    });
};

const htmlToMessageMarkup = (html: string) => {
    if (typeof document === 'undefined') {
        return html;
    }

    const root = document.createElement('div');
    root.innerHTML = html;

    const serializeNode = (node: ChildNode): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent ?? '';
        }

        if (!(node instanceof HTMLElement)) {
            return '';
        }

        const imageId = node.getAttribute('data-email-image-id');
        if (imageId) {
            return `\n[image:${imageId}]\n`;
        }

        const tag = node.tagName.toLowerCase();

        if (tag === 'br') {
            return '\n';
        }

        const children = Array.from(node.childNodes).map(serializeNode).join('');

        if (tag === 'strong' || tag === 'b') {
            return `[b]${children}[/b]`;
        }
        if (tag === 'em' || tag === 'i') {
            return `[i]${children}[/i]`;
        }
        if (tag === 'u') {
            return `[u]${children}[/u]`;
        }
        if (tag === 'span') {
            const fontSize = Number.parseInt(node.style.fontSize, 10);
            const withUnderline = node.style.textDecoration?.includes('underline') ? `[u]${children}[/u]` : children;
            if (Number.isFinite(fontSize)) {
                return `[size=${clampMessageFontSize(fontSize)}]${withUnderline}[/size]`;
            }
            return withUnderline;
        }
        if (tag === 'div' || tag === 'p') {
            const textAlign = node.style.textAlign;
            if (textAlign === 'center' || textAlign === 'right' || textAlign === 'left') {
                return `[align=${textAlign}]${children}[/align]\n`;
            }
            return `${children}\n`;
        }

        return children;
    };

    return Array.from(root.childNodes)
        .map(serializeNode)
        .join('')
        .replace(/\u00a0/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
};

const extractImageIdsFromMarkup = (message: string) => {
    const imageIds = new Set<string>();
    for (const match of message.matchAll(emailImageTokenPattern)) {
        if (match[1]) {
            imageIds.add(match[1]);
        }
    }
    return imageIds;
};

const createEmailImageId = () => `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

type Step = 'event' | 'audience' | 'compose' | 'send';

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'event', label: 'Event', icon: Calendar },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'compose', label: 'Message', icon: Mail },
    { id: 'send', label: 'Review & Send', icon: Send },
];

interface StepIndicatorProps {
    steps: typeof STEPS;
    currentStep: Step;
    completedSteps: Set<Step>;
    onStepClick: (step: Step) => void;
}

function StepIndicator({ steps, currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="flex items-start justify-center gap-0 w-full max-w-2xl mx-auto overflow-x-hidden">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isCurrent = step.id === currentStep;
                const isPast = index < currentIndex;
                const isClickable = isCompleted || isPast;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex min-w-0 items-start flex-1 last:flex-none">
                        {/* Step circle */}
                        <button
                            onClick={() => isClickable && onStepClick(step.id)}
                            disabled={!isClickable}
                            className={cn(
                                'relative flex min-w-0 flex-col items-center gap-2 group transition-all duration-300',
                                isClickable && 'cursor-pointer',
                                !isClickable && 'cursor-default'
                            )}
                        >
                            <motion.div
                                className={cn(
                                    'h-10 w-10 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm',
                                    isCurrent && 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white shadow-lg scale-110',
                                    isCompleted && !isCurrent && 'bg-emerald-500 text-white',
                                    !isCurrent && !isCompleted && 'bg-muted/60 text-muted-foreground border-2 border-dashed border-border/60'
                                )}
                                whileHover={isClickable ? { scale: 1.05 } : undefined}
                                whileTap={isClickable ? { scale: 0.95 } : undefined}
                            >
                                {isCompleted && !isCurrent ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                            </motion.div>
                            <span className={cn(
                                'max-w-full text-center text-[11px] leading-tight font-medium transition-colors sm:text-xs sm:whitespace-nowrap',
                                isCurrent && 'text-foreground',
                                isCompleted && !isCurrent && 'text-emerald-600',
                                !isCurrent && !isCompleted && 'text-muted-foreground'
                            )}>
                                {step.label}
                            </span>
                        </button>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div className="mt-5 sm:mt-6 flex-1 h-0.5 mx-2 sm:mx-3 relative min-w-2">
                                <div className="absolute inset-0 bg-border/40 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: isCompleted || isPast ? 1 : 0 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

interface BroadcastEmailPreviewProps {
    event: DashboardEvent | null;
    subject: string;
    message: string;
    organizerLabel?: string | null;
    images?: EmailImagesPayload;
    eventTitleOverride?: string | null;
    eventMetaOverride?: string | null;
}

function BroadcastEmailPreview({
    event,
    subject,
    message,
    organizerLabel,
    images,
    eventTitleOverride,
    eventMetaOverride,
}: BroadcastEmailPreviewProps) {
    const eventTitle = eventTitleOverride ?? event?.title ?? 'Untitled event';
    const eventMeta = eventMetaOverride ?? (event ? `${formatEventDate(event)} · ${formatEventLocation(event)}` : 'Event details will appear here');
    const formattedMessageHtml = renderFormattedMessageHtml(message || 'No message written', images);

    return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            <div className="border-b border-border/50 bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Email preview</p>
            </div>
            <div className="space-y-5 px-4 py-5 sm:px-6">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="break-words text-base font-semibold text-foreground">{subject || 'No subject'}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="space-y-1">
                        <p className="break-words text-lg font-semibold text-foreground">{eventTitle}</p>
                        <p className="break-words text-sm text-muted-foreground">{eventMeta}</p>
                    </div>
                    <div
                        className="mt-4 break-words text-sm leading-6 text-foreground"
                        dangerouslySetInnerHTML={{ __html: formattedMessageHtml }}
                    />
                    <div className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                        Sent by {organizerLabel || 'Organizer'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EmailAttendeesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error } = useOrganizerEvents(organizerId);
    const [currentStep, setCurrentStep] = useState<Step>('event');
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [subject, setSubject] = useState('Event update');
    const [message, setMessage] = useState('');
    const [images, setImages] = useState<EmailImagesPayload>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [fontSizeInput, setFontSizeInput] = useState('16');
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [imageWidthInput, setImageWidthInput] = useState('360');
    const [audience, setAudience] = useState<'all' | 'individual' | 'recent' | 'refunded'>('all');

    // Enhanced audience filters
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
    const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
    const [history, setHistory] = useState<EmailHistorySummary[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<EmailHistoryDetail | null>(null);
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false);
    const [isRefreshingHistoryRecipients, setIsRefreshingHistoryRecipients] = useState(false);
    const [isLoadingMoreRecipients, setIsLoadingMoreRecipients] = useState(false);
    const [recipientSearchInput, setRecipientSearchInput] = useState('');
    const historyRequestIdRef = useRef(0);
    const historyDetailRequestIdRef = useRef(0);
    const messageEditorRef = useRef<HTMLDivElement | null>(null);
    const hiddenImageInputRef = useRef<HTMLInputElement | null>(null);
    const savedSelectionRangeRef = useRef<Range | null>(null);
    const sendSuccessTimeoutRef = useRef<number | null>(null);

    const activeOrders = useMemo(
        () => orders.filter((order) => order.status !== 'refunded'),
        [orders]
    );
    const refundedOrders = useMemo(
        () => orders.filter((order) => order.status === 'refunded'),
        [orders]
    );
    const selectedEventFromUrl = searchParams.get('eventId');
    const eligibleEvents = useMemo(
        () => events.filter((event) => event.canEmailAttendees),
        [events]
    );

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) ?? null,
        [events, selectedEventId]
    );
    const selectedImage = useMemo(
        () => images.find((image) => image.id === selectedImageId) ?? null,
        [images, selectedImageId]
    );

    const getEventEndedAt = (event: DashboardEvent) => {
        if (event.endDatetime) {
            return new Date(event.endDatetime).getTime();
        }
        if (event.startDatetime) {
            return new Date(event.startDatetime).getTime();
        }
        return 0;
    };

    // Auto-select the best eligible event
    useEffect(() => {
        if (eligibleEvents.length === 0) {
            if (selectedEventId) {
                setSelectedEventId('');
            }
            return;
        }

        const existingSelection = eligibleEvents.find((event) => event.id === selectedEventId);
        if (existingSelection) {
            return;
        }

        const requestedEvent = selectedEventFromUrl
            ? eligibleEvents.find((event) => event.id === selectedEventFromUrl)
            : null;
        if (requestedEvent) {
            setSelectedEventId(requestedEvent.id);
            return;
        }

        const activeEvent = eligibleEvents.find((event) => event.displayStatus === 'active');
        if (activeEvent) {
            setSelectedEventId(activeEvent.id);
            return;
        }

        const mostRecentlyEndedEvent = [...eligibleEvents]
            .sort((a, b) => getEventEndedAt(b) - getEventEndedAt(a))[0];

        if (mostRecentlyEndedEvent) {
            setSelectedEventId(mostRecentlyEndedEvent.id);
        }
    }, [eligibleEvents, selectedEventFromUrl, selectedEventId]);

    // Auto-update subject when event changes
    useEffect(() => {
        setSubject(buildSubject(selectedEvent));
    }, [selectedEvent]);

    useEffect(() => {
        setSelectedAttendeeIds(new Set());
        setImages([]);
        setIsUploadingImages(false);
        setSelectedImageId(null);
        setImageWidthInput('360');
    }, [selectedEventId]);

    useEffect(() => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        const currentMarkup = htmlToMessageMarkup(editor.innerHTML);
        const nextImageSignature = images
            .map((image) => `${image.id}:${image.width}:${image.align}:${image.alt}:${image.previewUrl || image.url}`)
            .join('|');
        if (currentMarkup !== message || editor.dataset.imageSignature !== nextImageSignature) {
            editor.innerHTML = renderFormattedMessageHtml(message, images, { mode: 'editor' });
            editor.dataset.imageSignature = nextImageSignature;
        }
    }, [message, images]);

    useEffect(() => {
        if (selectedImage) {
            setImageWidthInput(String(selectedImage.width));
        }
    }, [selectedImage]);

    useEffect(() => {
        syncEditorImageSelection();
    }, [images, message, selectedImageId]);

    useEffect(() => {
        return () => {
            if (sendSuccessTimeoutRef.current !== null) {
                window.clearTimeout(sendSuccessTimeoutRef.current);
            }
        };
    }, []);

    const loadHistory = async (options?: {
        broadcastIdToOpen?: string;
        offset?: number;
        append?: boolean;
    }) => {
        if (!organizerId) {
            historyRequestIdRef.current += 1;
            setHistory([]);
            setHasMoreHistory(false);
            return;
        }

        const offset = options?.offset ?? 0;
        const append = options?.append ?? false;
        const broadcastIdToOpen = options?.broadcastIdToOpen;
        const requestId = historyRequestIdRef.current + 1;
        historyRequestIdRef.current = requestId;

        if (append) {
            setIsLoadingMoreHistory(true);
        } else {
            setIsLoadingHistory(true);
        }
        try {
            const response = await api.get<{ history: EmailHistorySummary[] }>(
                `/api/v1/organizers/${organizerId}/attendee-emails/history`,
                {
                    params: {
                        limit: String(HISTORY_PAGE_SIZE),
                        offset: String(offset),
                    },
                }
            );

            if (requestId !== historyRequestIdRef.current) {
                return;
            }

            const nextHistory = response.history || [];
            let mergedHistory: EmailHistorySummary[] = nextHistory;
            setHistory((current) => {
                mergedHistory = append ? [...current, ...nextHistory] : nextHistory;
                return mergedHistory;
            });
            setHasMoreHistory(nextHistory.length === HISTORY_PAGE_SIZE);

            if (broadcastIdToOpen) {
                const matched = mergedHistory.find((item) => item.id === broadcastIdToOpen);
                if (matched) {
                    void loadHistoryDetail(matched.id);
                }
            }
        } catch (err) {
            if (requestId !== historyRequestIdRef.current) {
                return;
            }
            console.error('Failed to fetch email history:', err);
            if (!append) {
                setHistory([]);
                setHasMoreHistory(false);
            }
        } finally {
            if (requestId === historyRequestIdRef.current) {
                if (append) {
                    setIsLoadingMoreHistory(false);
                } else {
                    setIsLoadingHistory(false);
                }
            }
        }
    };

    const refreshHistory = useEffectEvent(async () => {
        await loadHistory();
    });

    const loadHistoryDetail = async (
        broadcastId: string,
        options?: {
            offset?: number;
            search?: string;
            append?: boolean;
        }
    ) => {
        if (!organizerId) {
            return;
        }

        const offset = options?.offset ?? 0;
        const search = options?.search?.trim() ?? '';
        const append = options?.append ?? false;
        const isSameBroadcastRefresh = !append && isHistorySheetOpen && selectedHistory?.id === broadcastId;
        const requestId = historyDetailRequestIdRef.current + 1;
        historyDetailRequestIdRef.current = requestId;

        if (append) {
            setIsLoadingMoreRecipients(true);
        } else if (isSameBroadcastRefresh) {
            setIsRefreshingHistoryRecipients(true);
        } else {
            setSelectedHistory(null);
            setIsLoadingHistoryDetail(true);
            setIsHistorySheetOpen(true);
        }

        try {
            const response = await api.get<{ broadcast: EmailHistoryDetail }>(
                `/api/v1/organizers/${organizerId}/attendee-emails/history/${broadcastId}`,
                {
                    params: {
                        limit: String(HISTORY_RECIPIENT_PAGE_SIZE),
                        offset: String(offset),
                        ...(search ? { search } : {}),
                    },
                }
            );

            if (requestId !== historyDetailRequestIdRef.current) {
                return;
            }

            setSelectedHistory((current) => {
                if (append && current?.id === response.broadcast.id) {
                    return {
                        ...response.broadcast,
                        recipients: [...current.recipients, ...response.broadcast.recipients],
                    };
                }

                return response.broadcast;
            });
        } catch (err) {
            if (requestId !== historyDetailRequestIdRef.current) {
                return;
            }
            toast.error(err);
            if (!append && !isSameBroadcastRefresh) {
                setIsHistorySheetOpen(false);
            }
        } finally {
            if (requestId === historyDetailRequestIdRef.current) {
                if (append) {
                    setIsLoadingMoreRecipients(false);
                } else if (isSameBroadcastRefresh) {
                    setIsRefreshingHistoryRecipients(false);
                } else {
                    setIsLoadingHistoryDetail(false);
                }
            }
        }
    };

    const openHistoryDetail = (broadcastId: string) => {
        setRecipientSearchInput('');
        void loadHistoryDetail(broadcastId, { offset: 0, search: '' });
    };

    // Debounced dynamic search — fires as the user types
    useEffect(() => {
        if (!selectedHistory) {
            return;
        }

        const trimmed = recipientSearchInput.trim();

        // Skip if the API already reflects this search term
        if (trimmed === (selectedHistory.recipientsPage.search ?? '')) {
            return;
        }

        const timer = setTimeout(() => {
            void loadHistoryDetail(selectedHistory.id, {
                offset: 0,
                search: trimmed,
            });
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recipientSearchInput, selectedHistory?.id]);

    const handleLoadMoreRecipients = () => {
        if (
            !selectedHistory ||
            !selectedHistory.recipientsPage.hasMore ||
            selectedHistory.recipientsPage.nextOffset === null
        ) {
            return;
        }

        void loadHistoryDetail(selectedHistory.id, {
            offset: selectedHistory.recipientsPage.nextOffset,
            search: selectedHistory.recipientsPage.search,
            append: true,
        });
    };

    const handleLoadMoreHistory = () => {
        if (!hasMoreHistory || isLoadingMoreHistory) {
            return;
        }

        void loadHistory({
            offset: history.length,
            append: true,
        });
    };

    // Fetch orders for selected event
    useEffect(() => {
        const fetchOrders = async () => {
            if (!organizerId || !selectedEventId) {
                setOrders([]);
                return;
            }

            setIsLoadingOrders(true);
            try {
                const response = await api.get<{ orders: OrderResponse[] }>('/api/v1/orders', {
                    params: { organizerId, eventId: selectedEventId },
                });
                setOrders(response.orders || []);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
                setOrders([]);
            } finally {
                setIsLoadingOrders(false);
            }
        };

        void fetchOrders();
    }, [organizerId, selectedEventId]);

    useEffect(() => {
        historyRequestIdRef.current += 1;
        historyDetailRequestIdRef.current += 1;
        setHistory([]);
        setHasMoreHistory(false);
        setSelectedHistory(null);
        setIsHistorySheetOpen(false);
        setRecipientSearchInput('');
        setIsLoadingHistory(false);
        setIsLoadingMoreHistory(false);
        setIsLoadingHistoryDetail(false);
        setIsRefreshingHistoryRecipients(false);
        setIsLoadingMoreRecipients(false);
        void refreshHistory();
    }, [organizerId]);

    const selectedAudience = useMemo(() => {
        const filters = [];

        if (audience === 'all') filters.push('All ticket holders');
        if (audience === 'recent') filters.push('Recent buyers');
        if (audience === 'refunded') filters.push('Refunded attendees');
        if (audience === 'individual' && selectedAttendeeIds.size > 0) {
            filters.push(`${selectedAttendeeIds.size} selected attendee${selectedAttendeeIds.size > 1 ? 's' : ''}`);
        }

        return filters;
    }, [audience, selectedAttendeeIds]);

    const formattedDate = selectedEvent ? formatEventDate(selectedEvent) : null;
    const formattedLocation = selectedEvent ? formatEventLocation(selectedEvent) : null;
    const statusMeta = selectedEvent ? statusStyles[selectedEvent.displayStatus] : null;

    // Step validation
    const canProceedFromEvent = !!selectedEventId;
    const hasAttendees = activeOrders.length > 0;
    const hasRefundedAttendees = refundedOrders.length > 0;
    const canProceedFromAudience =
        (audience === 'all' && hasAttendees) ||
        (audience === 'recent' && hasAttendees) ||
        (audience === 'refunded' && hasRefundedAttendees) ||
        (audience === 'individual' && selectedAttendeeIds.size > 0);
    const canProceedFromCompose = subject.trim().length >= 5 && message.trim().length >= 10;
    const canSend = canProceedFromEvent && canProceedFromAudience && canProceedFromCompose;

    useEffect(() => {
        setCompletedSteps((prev) => {
            const next = new Set(prev);

            if (!canProceedFromEvent) {
                next.delete('event');
                next.delete('audience');
                next.delete('compose');
                next.delete('send');
                return next;
            }

            if (!canProceedFromAudience) {
                next.delete('audience');
                next.delete('compose');
                next.delete('send');
            }

            if (!canProceedFromCompose) {
                next.delete('compose');
                next.delete('send');
            }

            return next;
        });
    }, [canProceedFromAudience, canProceedFromCompose, canProceedFromEvent]);

    const handleContinue = () => {
        const stepOrder: Step[] = ['event', 'audience', 'compose', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex < stepOrder.length - 1) {
            setCompletedSteps(prev => new Set([...prev, currentStep]));
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const stepOrder: Step[] = ['event', 'audience', 'compose', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleStepClick = (step: Step) => {
        setCurrentStep(step);
    };

    const syncEditorImageSelection = useEffectEvent(() => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        editor.querySelectorAll<HTMLElement>('[data-email-image-id]').forEach((node) => {
            const imageElement = node.querySelector('img');
            if (!imageElement) {
                return;
            }

            const isSelected = node.dataset.emailImageId === selectedImageId;
            imageElement.style.borderColor = isSelected ? 'rgba(13, 148, 136, 0.92)' : 'rgba(15, 23, 42, 0.08)';
            imageElement.style.boxShadow = isSelected ? '0 0 0 3px rgba(13, 148, 136, 0.18)' : 'none';
        });
    });

    const rememberEditorSelection = () => {
        const editor = messageEditorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
            savedSelectionRangeRef.current = range.cloneRange();
        }
    };

    const restoreEditorSelection = () => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return null;
        }

        const selection = window.getSelection();
        if (!selection) {
            return null;
        }

        let range = savedSelectionRangeRef.current?.cloneRange() ?? null;
        if (!range || !editor.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }

        selection.removeAllRanges();
        selection.addRange(range);
        return range;
    };

    const handleToolbarMouseDown = (event: { preventDefault: () => void }) => {
        event.preventDefault();
        rememberEditorSelection();
    };

    const syncMessageFromEditor = () => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        rememberEditorSelection();
        const nextMessage = htmlToMessageMarkup(editor.innerHTML);
        const usedImageIds = extractImageIdsFromMarkup(nextMessage);

        setMessage(nextMessage);
        setImages((current) => {
            const filtered = current.filter((image) => usedImageIds.has(image.id));
            return filtered.length === current.length ? current : filtered;
        });
        setSelectedImageId((current) => (current && usedImageIds.has(current) ? current : null));
    };

    const handleMessagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();

        const pastedText = event.clipboardData.getData('text/plain');
        if (!pastedText) {
            return;
        }

        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        editor.focus();
        const range = restoreEditorSelection();
        const selection = window.getSelection();
        if (!range || !selection) {
            return;
        }

        range.deleteContents();
        const lines = pastedText.replace(/\r\n/g, '\n').split('\n');
        const fragment = document.createDocumentFragment();

        lines.forEach((line, index) => {
            if (line.length > 0) {
                fragment.appendChild(document.createTextNode(line));
            }
            if (index < lines.length - 1) {
                fragment.appendChild(document.createElement('br'));
            }
        });

        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        rememberEditorSelection();
        syncMessageFromEditor();
    };

    const runEditorCommand = (command: 'bold' | 'italic' | 'underline') => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        restoreEditorSelection();
        editor.focus();
        document.execCommand(command, false);
        rememberEditorSelection();
        syncMessageFromEditor();
    };

    const runEditorAlignmentCommand = (align: EmailImageAlign) => {
        const editor = messageEditorRef.current;
        if (!editor) {
            return;
        }

        const command = align === 'left'
            ? 'justifyLeft'
            : align === 'right'
                ? 'justifyRight'
                : 'justifyCenter';

        restoreEditorSelection();
        editor.focus();
        document.execCommand(command, false);
        rememberEditorSelection();
        syncMessageFromEditor();
    };

    const applySelectedFontSize = (sizeOverride?: string) => {
        const editor = messageEditorRef.current;
        const size = Number.parseInt(sizeOverride ?? fontSizeInput, 10);
        if (!editor || !Number.isFinite(size)) {
            return;
        }

        const selection = window.getSelection();
        restoreEditorSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
            return;
        }

        const fragment = range.extractContents();
        const span = document.createElement('span');
        span.style.fontSize = `${clampMessageFontSize(size)}px`;
        span.appendChild(fragment);
        range.insertNode(span);

        selection.removeAllRanges();
        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        selection.addRange(nextRange);
        rememberEditorSelection();
        syncMessageFromEditor();
    };

    const handleFontSizeChange = (value: string) => {
        setFontSizeInput(value);

        if (!value) {
            return;
        }

        const editor = messageEditorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) {
            return;
        }

        const range = savedSelectionRangeRef.current;
        if (!range || !editor.contains(range.commonAncestorContainer) || range.collapsed) {
            return;
        }

        applySelectedFontSize(value);
    };

    const insertUploadedImagesIntoEditor = (uploadedImages: EmailImagesPayload) => {
        const editor = messageEditorRef.current;
        if (!editor || uploadedImages.length === 0) {
            return;
        }

        editor.focus();
        const selection = window.getSelection();
        const range = restoreEditorSelection();
        if (!selection || !range) {
            return;
        }

        range.deleteContents();

        const fragment = document.createDocumentFragment();
        let lastInsertedNode: Node | null = null;

        for (const image of uploadedImages) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderInlineEmailImageHtml(image, { mode: 'editor' }).trim();

            const figure = wrapper.firstElementChild;
            if (!figure) {
                continue;
            }

            fragment.appendChild(figure);
            const spacer = document.createElement('div');
            spacer.appendChild(document.createElement('br'));
            fragment.appendChild(spacer);
            lastInsertedNode = spacer;
        }

        range.insertNode(fragment);
        selection.removeAllRanges();

        const nextRange = document.createRange();
        if (lastInsertedNode) {
            nextRange.setStartAfter(lastInsertedNode);
        } else {
            nextRange.selectNodeContents(editor);
        }
        nextRange.collapse(true);
        selection.addRange(nextRange);

        rememberEditorSelection();
        syncMessageFromEditor();
        setSelectedImageId(uploadedImages[uploadedImages.length - 1]?.id ?? null);
    };

    const handleImageUpload = async (fileList: FileList | null) => {
        if (!selectedEventId) {
            toast.error('Select an event before uploading images.');
            return;
        }
        if (!fileList || fileList.length === 0) {
            return;
        }

        const availableSlots = Math.max(0, 8 - images.length);
        if (availableSlots === 0) {
            toast.error('You can upload up to 8 images in one email.');
            return;
        }

        const files = Array.from(fileList).slice(0, availableSlots);
        setIsUploadingImages(true);
        try {
            const uploadedImages = await Promise.all(files.map(async (file) => {
                const previewUrl = await fileToDataUrl(file);
                const uploaded = await uploadAttendeeEmailImage(selectedEventId, file);
                return {
                    id: createEmailImageId(),
                    url: uploaded.url,
                    alt: file.name.replace(/\.[^.]+$/, '') || 'Email image',
                    width: 360,
                    align: 'center' as EmailImageAlign,
                    previewUrl,
                };
            }));

            setImages((current) => [...current, ...uploadedImages]);
            insertUploadedImagesIntoEditor(uploadedImages);

            if (fileList.length > availableSlots) {
                toast.info(`Only the first ${availableSlots} image${availableSlots === 1 ? '' : 's'} were added.`);
            }
        } catch (error) {
            toast.error(error);
        } finally {
            setIsUploadingImages(false);
        }
    };

    const updateImage = (
        imageId: string,
        updater: (current: EmailInlineImage) => EmailInlineImage
    ) => {
        setImages((current) => {
            return current.map((image) => image.id === imageId ? updater(image) : image);
        });
    };

    const commitSelectedImageWidth = () => {
        if (!selectedImage) {
            return;
        }

        const parsed = Number.parseInt(imageWidthInput, 10);
        if (!Number.isFinite(parsed)) {
            setImageWidthInput(String(selectedImage.width));
            return;
        }

        const nextWidth = clampEmailImageWidth(parsed);
        updateImage(selectedImage.id, (current) => ({
            ...current,
            width: nextWidth,
        }));
        setImageWidthInput(String(nextWidth));
    };

    const removeSelectedImage = () => {
        const editor = messageEditorRef.current;
        if (!editor || !selectedImageId) {
            return;
        }

        const imageNode = editor.querySelector<HTMLElement>(`[data-email-image-id="${selectedImageId}"]`);
        if (imageNode) {
            const maybeSpacer = imageNode.nextElementSibling;
            imageNode.remove();
            if (maybeSpacer?.tagName.toLowerCase() === 'div' && maybeSpacer.innerHTML.trim() === '<br>') {
                maybeSpacer.remove();
            }
        }

        setSelectedImageId(null);
        syncMessageFromEditor();
    };

    const handleSendEmail = async () => {
        if (!organizerId || !selectedEventId) {
            return;
        }

        const payload = {
            eventId: selectedEventId,
            audience,
            subject: subject.trim(),
            message: message.trim(),
            images: images.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt,
                width: image.width,
                align: image.align,
            })),
            orderIds: audience === 'individual' ? Array.from(selectedAttendeeIds) : undefined,
        };

        setIsSending(true);
        try {
            const response = await api.post<{ broadcastId: string | null; sent: number; skipped: number; failed: number }>(
                `/api/v1/organizers/${organizerId}/attendee-emails`,
                payload
            );
            setSendSuccessMessage(
                response.broadcastId
                    ? 'Emails are being processed. You can check Recent Sends any time.'
                    : 'Emails are being processed.'
            );

            if (sendSuccessTimeoutRef.current !== null) {
                window.clearTimeout(sendSuccessTimeoutRef.current);
            }

            sendSuccessTimeoutRef.current = window.setTimeout(() => {
                setCurrentStep('event');
                setCompletedSteps(new Set());
                setAudience('all');
                setSelectedAttendeeIds(new Set());
                setAttendeeSearchQuery('');
                setMessage('');
                setImages([]);
                setIsUploadingImages(false);
                setFontSizeInput('16');
                setSelectedImageId(null);
                setImageWidthInput('360');
                setSubject(buildSubject(selectedEvent));
                setRecipientSearchInput('');
                setSelectedHistory(null);
                setIsHistorySheetOpen(false);
                savedSelectionRangeRef.current = null;
                setSendSuccessMessage(null);
                void loadHistory();
                router.replace(buildDashboardPath(organizerId, '/email-attendees'));
            }, 2400);
        } catch (err) {
            toast.error(err);
        } finally {
            setIsSending(false);
        }
    };

    // Get summary badges for completed steps
    const getSummaryBadges = () => {
        const badges: { label: string; icon: React.ElementType }[] = [];

        if (completedSteps.has('event') && selectedEvent) {
            badges.push({ label: selectedEvent.title || 'Untitled', icon: Calendar });
        }
        if (completedSteps.has('audience')) {
            badges.push({ label: selectedAudience[0] || 'No audience', icon: Users });
        }
        if (completedSteps.has('compose')) {
            badges.push({ label: subject.substring(0, 30) + (subject.length > 30 ? '...' : ''), icon: Mail });
        }

        return badges;
    };

    const summaryBadges = getSummaryBadges();

    return (
        <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="container py-8 space-y-8">
                <AnimatePresence>
                    {sendSuccessMessage ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="w-full max-w-md rounded-3xl border border-emerald-200/80 bg-white p-6 text-center shadow-2xl"
                            >
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    <Check className="h-7 w-7" />
                                </div>
                                <div className="mt-4 space-y-2">
                                    <h3 className="text-xl font-semibold tracking-tight text-foreground">Emails are being sent</h3>
                                    <p className="text-sm leading-6 text-muted-foreground">{sendSuccessMessage}</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    <Button variant="ghost" size="sm" className="w-fit px-2" asChild>
                        <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Dashboard
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center shadow-lg">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                                    Email Attendees
                                </h1>
                                <p className="text-muted-foreground">
                                    Send updates to your event attendees in 4 simple steps
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Step Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="py-4"
                >
                    <StepIndicator
                        steps={STEPS}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={handleStepClick}
                    />
                </motion.div>

                {/* Summary Badges */}
                {summaryBadges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-wrap justify-center gap-2"
                    >
                        {summaryBadges.map((badge, i) => (
                            <Badge
                                key={i}
                                variant="secondary"
                                className="px-3 py-1.5 gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <badge.icon className="h-3.5 w-3.5" />
                                {badge.label}
                            </Badge>
                        ))}
                    </motion.div>
                )}


                {/* Main Content */}
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, oklch(0.78 0.14 165 / 0.3), oklch(0.72 0.15 185 / 0.3)) border-box',
                                borderColor: 'transparent',
                            }}
                        >
                            {/* Step Header */}
                            <div className="border-b border-border/40 px-6 py-5 bg-gradient-to-r from-muted/30 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center">
                                        {STEPS.find(s => s.id === currentStep)?.icon && (
                                            (() => {
                                                const Icon = STEPS.find(s => s.id === currentStep)!.icon;
                                                return <Icon className="h-5 w-5" />;
                                            })()
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="font-display text-xl font-semibold">
                                            {STEPS.find(s => s.id === currentStep)?.label}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {currentStep === 'event' && 'Choose which event you\'re messaging about'}
                                            {currentStep === 'audience' && 'Select who should receive this email'}
                                            {currentStep === 'compose' && 'Write your email subject and message'}
                                            {currentStep === 'send' && 'Review your email and send it'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="p-6">
                                {/* Event Selection Step */}
                                {currentStep === 'event' && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="event-select">Select an event</Label>
                                            <Select
                                                value={selectedEventId || undefined}
                                                onValueChange={setSelectedEventId}
                                                disabled={isLoading || eligibleEvents.length === 0}
                                            >
                                                <SelectTrigger id="event-select" className="h-12 w-full min-w-0 bg-background">
                                                    <SelectValue
                                                        placeholder={isLoading ? 'Loading events...' : 'Select eligible event'}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                                                    {eligibleEvents
                                                        .map((event) => (
                                                            <SelectItem key={event.id} value={event.id} className="max-w-full">
                                                                <div className="flex min-w-0 items-center gap-3">
                                                                    {event.bannerImageUrl ? (
                                                                        <div className="relative h-6 w-6 shrink-0 rounded overflow-hidden">
                                                                            <Image
                                                                                src={event.bannerImageUrl}
                                                                                alt=""
                                                                                fill
                                                                                sizes="24px"
                                                                                className="object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-6 w-6 shrink-0 rounded bg-muted/70 flex items-center justify-center text-[10px] text-muted-foreground">
                                                                            {(event.title || 'E')
                                                                                .charAt(0)
                                                                                .toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span className="min-w-0 truncate">{event.title || 'Untitled event'}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                            {isLoading && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Loading events
                                                </div>
                                            )}
                                            {error && (
                                                <div className="flex items-center gap-2 text-xs text-destructive">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    {error}
                                                </div>
                                            )}
                                            {!isLoading && !error && eligibleEvents.length === 0 && (
                                                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                                                    <span>
                                                        Email attendees stays available while an event is active and for 7 days after it ends.
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {selectedEvent && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20"
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    {selectedEvent.bannerImageUrl ? (
                                                        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden">
                                                            <Image
                                                                src={selectedEvent.bannerImageUrl}
                                                                alt=""
                                                                fill
                                                                sizes="56px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-14 w-14 shrink-0 rounded-xl bg-muted flex items-center justify-center text-lg text-muted-foreground">
                                                            {(selectedEvent.title || 'E').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold break-words">
                                                            {selectedEvent.title || 'Untitled event'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground break-words">
                                                            {formattedDate} · {formattedLocation}
                                                        </p>
                                                    </div>
                                                </div>
                                                {statusMeta && (
                                                    <div className="flex flex-col items-start gap-2 sm:items-end">
                                                        <Badge variant="outline" className={cn('border shrink-0', statusMeta.className)}>
                                                            {statusMeta.label}
                                                        </Badge>
                                                        {selectedEvent.displayStatus === 'past' && selectedEvent.canEmailAttendees && (
                                                            <p className="max-w-full text-left text-xs text-muted-foreground sm:max-w-48 sm:text-right">
                                                                Emailing remains available for 7 days after the event ends.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Audience Selection Step */}
                                {currentStep === 'audience' && (
                                    <div className="space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {/* All Attendees */}
                                            <button
                                                onClick={() => setAudience('all')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'all'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'all'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">All Attendees</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {activeOrders.length > 0 ? `${activeOrders.length} attendee${activeOrders.length !== 1 ? 's' : ''}` : 'No attendees yet'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'all' && activeOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {activeOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'all' && activeOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-[oklch(0.72_0.15_185)]" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Individual Selection */}
                                            <button
                                                onClick={() => setAudience('individual')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'individual'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'individual'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Search className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Select Individuals</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Choose specific people
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'individual' && selectedAttendeeIds.size > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {selectedAttendeeIds.size}
                                                    </Badge>
                                                )}
                                            </button>

                                            {/* Recent Buyers */}
                                            <button
                                                onClick={() => setAudience('recent')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'recent'
                                                        ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'recent'
                                                            ? 'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Recent Buyers</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Last 48 hours
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'recent' && activeOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-[oklch(0.72_0.15_185)]">
                                                        {activeOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'recent' && activeOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-[oklch(0.72_0.15_185)]" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Refunded Attendees */}
                                            <button
                                                onClick={() => setAudience('refunded')}
                                                className={cn(
                                                    'group relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                                                    audience === 'refunded'
                                                        ? 'border-rose-300 bg-rose-50/60'
                                                        : 'border-border/60 hover:border-border'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className={cn(
                                                        'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                                                        audience === 'refunded'
                                                            ? 'bg-rose-500 text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}>
                                                        <RotateCcw className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Refunded Attendees</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {refundedOrders.length > 0 ? `${refundedOrders.length} attendee${refundedOrders.length !== 1 ? 's' : ''}` : 'No refunded attendees'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {audience === 'refunded' && refundedOrders.length > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-rose-500">
                                                        {refundedOrders.length}
                                                    </Badge>
                                                )}
                                                {audience === 'refunded' && refundedOrders.length === 0 && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="h-5 w-5 text-rose-500" />
                                                    </div>
                                                )}
                                            </button>
                                        </div>

                                        {/* Empty attendees warning */}
                                        {(audience === 'all' || audience === 'recent') && !isLoadingOrders && activeOrders.length === 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                                            >
                                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                                <div>
                                                    <p className="font-medium">No attendees found</p>
                                                    <p className="text-sm text-amber-700">
                                                        This event has no orders yet. Attendees will appear here once tickets are purchased.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                        {audience === 'refunded' && !isLoadingOrders && refundedOrders.length === 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
                                            >
                                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                                                <div>
                                                    <p className="font-medium">No refunded attendees</p>
                                                    <p className="text-sm text-rose-700">
                                                        Refunded orders will appear here after a refund is processed.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Individual attendee list */}
                                        {audience === 'individual' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3 pt-2"
                                            >
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search attendees by name or email..."
                                                        value={attendeeSearchQuery}
                                                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                                                        className="pl-9 h-11"
                                                    />
                                                </div>

                                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 rounded-xl border border-border/60 p-2 bg-muted/20">
                                                    {isLoadingOrders ? (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        </div>
                                                    ) : activeOrders.length === 0 ? (
                                                        <p className="text-sm text-center py-8 text-muted-foreground">
                                                            No attendees found for this event
                                                        </p>
                                                    ) : (
                                                        activeOrders
                                                            .filter(order => {
                                                                const query = attendeeSearchQuery.toLowerCase();
                                                                return (
                                                                    (order.attendee.name?.toLowerCase() || '').includes(query) ||
                                                                    order.attendee.email.toLowerCase().includes(query)
                                                                );
                                                            })
                                                            .map((order) => {
                                                                const isSelected = selectedAttendeeIds.has(order.id);
                                                                return (
                                                                    <label
                                                                        key={order.id}
                                                                        className={cn(
                                                                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition',
                                                                            isSelected ? 'bg-[oklch(0.78_0.14_165)]/10' : 'hover:bg-muted/50'
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onCheckedChange={(checked) => {
                                                                                const newSet = new Set(selectedAttendeeIds);
                                                                                if (checked) {
                                                                                    newSet.add(order.id);
                                                                                } else {
                                                                                    newSet.delete(order.id);
                                                                                }
                                                                                setSelectedAttendeeIds(newSet);
                                                                            }}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate">
                                                                                {order.attendee.name || 'Unnamed'}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground truncate">
                                                                                {order.attendee.email}
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Compose Message Step */}
                                {currentStep === 'compose' && (
                                    <div className="space-y-6">
                                        {/* Subject section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.15_185)]" />
                                                <Label htmlFor="subject" className="text-sm font-semibold tracking-tight">Subject line</Label>
                                            </div>
                                            <Input
                                                id="subject"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                minLength={5}
                                                maxLength={100}
                                                className="h-12"
                                                placeholder="Email subject line"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Auto-filled from your event. Edit as needed.
                                            </p>
                                        </div>

                                        <div className="h-px bg-border/40" />

                                        {/* Message body section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.15_185)]" />
                                                <Label htmlFor="message" className="text-sm font-semibold tracking-tight">Message body</Label>
                                            </div>

                                            {/* Formatting toolbar */}
                                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/10 px-2.5 py-2">
                                                {/* Text style group */}
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Bold"
                                                        onMouseDown={handleToolbarMouseDown}
                                                        onClick={() => runEditorCommand('bold')}
                                                    >
                                                        <Bold className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Italic"
                                                        onMouseDown={handleToolbarMouseDown}
                                                        onClick={() => runEditorCommand('italic')}
                                                    >
                                                        <Italic className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Underline"
                                                        onMouseDown={handleToolbarMouseDown}
                                                        onClick={() => runEditorCommand('underline')}
                                                    >
                                                        <Underline className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>

                                                <div className="mx-1 h-5 w-px bg-border/60" />

                                                {/* Font size & alignment group */}
                                                <div className="flex items-center gap-1.5">
                                                    <Select value={fontSizeInput} onValueChange={handleFontSizeChange}>
                                                        <SelectTrigger
                                                            className="h-8 w-[100px] bg-background text-xs"
                                                            onMouseDown={handleToolbarMouseDown}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <Type className="h-3 w-3 text-muted-foreground" />
                                                                <SelectValue placeholder="Size" />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="12">12 px</SelectItem>
                                                            <SelectItem value="14">14 px</SelectItem>
                                                            <SelectItem value="16">16 px</SelectItem>
                                                            <SelectItem value="18">18 px</SelectItem>
                                                            <SelectItem value="20">20 px</SelectItem>
                                                            <SelectItem value="24">24 px</SelectItem>
                                                            <SelectItem value="28">28 px</SelectItem>
                                                            <SelectItem value="32">32 px</SelectItem>
                                                            <SelectItem value="36">36 px</SelectItem>
                                                            <SelectItem value="42">42 px</SelectItem>
                                                            <SelectItem value="48">48 px</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        defaultValue="left"
                                                        onValueChange={(value) => runEditorAlignmentCommand(value as EmailImageAlign)}
                                                    >
                                                        <SelectTrigger
                                                            className="h-8 w-[110px] bg-background text-xs"
                                                            onMouseDown={handleToolbarMouseDown}
                                                        >
                                                            <SelectValue placeholder="Align" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="left">Align left</SelectItem>
                                                            <SelectItem value="center">Align center</SelectItem>
                                                            <SelectItem value="right">Align right</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="mx-1 h-5 w-px bg-border/60" />

                                                {/* Media group */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 text-xs"
                                                    onMouseDown={handleToolbarMouseDown}
                                                    onClick={() => hiddenImageInputRef.current?.click()}
                                                >
                                                    {isUploadingImages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                                    Image
                                                </Button>
                                                <input
                                                    ref={hiddenImageInputRef}
                                                    type="file"
                                                    multiple
                                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                                    className="sr-only"
                                                    onChange={(event) => {
                                                        void handleImageUpload(event.target.files);
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </div>

                                            {/* Image settings (contextual) */}
                                            {selectedImage ? (
                                                <div className="rounded-xl border border-[oklch(0.78_0.14_165)]/30 bg-[oklch(0.78_0.14_165)]/[0.04] p-4 space-y-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected image</p>
                                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_160px_auto]">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="selected-image-alt" className="text-xs">Alt text</Label>
                                                            <Input
                                                                id="selected-image-alt"
                                                                value={selectedImage.alt}
                                                                maxLength={120}
                                                                onChange={(event) => updateImage(selectedImage.id, (current) => ({
                                                                    ...current,
                                                                    alt: event.target.value,
                                                                }))}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="selected-image-width" className="text-xs">Size</Label>
                                                            <Input
                                                                id="selected-image-width"
                                                                type="number"
                                                                min={140}
                                                                max={640}
                                                                value={imageWidthInput}
                                                                onChange={(event) => setImageWidthInput(event.target.value)}
                                                                onBlur={commitSelectedImageWidth}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter') {
                                                                        event.preventDefault();
                                                                        commitSelectedImageWidth();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">Alignment</Label>
                                                            <Select
                                                                value={selectedImage.align}
                                                                onValueChange={(value) => updateImage(selectedImage.id, (current) => ({
                                                                    ...current,
                                                                    align: value as EmailImageAlign,
                                                                }))}
                                                            >
                                                                <SelectTrigger className="bg-background">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="left">Left</SelectItem>
                                                                    <SelectItem value="center">Center</SelectItem>
                                                                    <SelectItem value="right">Right</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex items-end">
                                                            <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive" onClick={removeSelectedImage}>
                                                                <Trash2 className="h-4 w-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Add up to 8 images. Click an image in the editor to resize, align, or remove it.
                                                </p>
                                            )}

                                            {/* Editor */}
                                            <div
                                                id="message"
                                                ref={messageEditorRef}
                                                contentEditable
                                                suppressContentEditableWarning
                                                onInput={syncMessageFromEditor}
                                                onPaste={handleMessagePaste}
                                                onMouseUp={rememberEditorSelection}
                                                onKeyUp={() => {
                                                    rememberEditorSelection();
                                                    if (selectedImageId) {
                                                        setSelectedImageId(null);
                                                    }
                                                }}
                                                onFocus={rememberEditorSelection}
                                                onClick={(event) => {
                                                    const target = event.target as HTMLElement;
                                                    const imageNode = target.closest<HTMLElement>('[data-email-image-id]');
                                                    if (imageNode?.dataset.emailImageId) {
                                                        savedSelectionRangeRef.current = null;
                                                        setSelectedImageId(imageNode.dataset.emailImageId);
                                                        return;
                                                    }

                                                    setSelectedImageId(null);
                                                    rememberEditorSelection();
                                                }}
                                                className="min-h-[220px] rounded-xl border border-input bg-white px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {message.length} characters
                                            </p>
                                        </div>

                                        <div className="h-px bg-border/40" />

                                        {/* Live preview section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.15_185)]" />
                                                <p className="text-sm font-semibold tracking-tight">Live preview</p>
                                            </div>
                                            <BroadcastEmailPreview
                                                event={selectedEvent}
                                                subject={subject}
                                                message={message}
                                                organizerLabel="Organizer"
                                                images={images}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Review & Send Step */}
                                {currentStep === 'send' && (
                                    <div className="space-y-6">
                                        {/* Summary Cards */}
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm overflow-hidden relative">
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]" />
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="h-4 w-4 text-[oklch(0.55_0.12_180)]" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Event</span>
                                                </div>
                                                <p className="font-semibold text-sm break-words">
                                                    {selectedEvent?.title || 'Not selected'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm overflow-hidden relative">
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]" />
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="h-4 w-4 text-[oklch(0.55_0.12_180)]" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Audience</span>
                                                </div>
                                                <p className="font-semibold text-sm break-words">
                                                    {selectedAudience[0] || 'Not selected'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm overflow-hidden relative">
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]" />
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Mail className="h-4 w-4 text-[oklch(0.55_0.12_180)]" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Subject</span>
                                                </div>
                                                <p className="font-semibold text-sm break-words">
                                                    {subject || 'No subject'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Email preview */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.15_185)]" />
                                                <p className="text-sm font-semibold tracking-tight">Email preview</p>
                                            </div>
                                            <BroadcastEmailPreview
                                                event={selectedEvent}
                                                subject={subject}
                                                message={message}
                                                organizerLabel="Organizer"
                                                images={images}
                                            />
                                        </div>

                                        {/* Validation Warnings */}
                                        {!canSend && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                                    <div className="text-sm text-amber-800">
                                                        <p className="font-medium">Please complete all steps before sending:</p>
                                                        <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                                                            {!canProceedFromEvent && <li>Select an event</li>}
                                                            {!canProceedFromAudience && <li>Choose an audience</li>}
                                                            {!canProceedFromCompose && <li>Write your message</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Send Button */}
                                        <div className="space-y-2 pt-2">
                                            <Button
                                                disabled={!canSend || isSending}
                                                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-semibold text-base shadow-lg"
                                                onClick={handleSendEmail}
                                            >
                                                {isSending ? (
                                                    <>
                                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-5 w-5 mr-2" />
                                                        Send Email Now
                                                    </>
                                                )}
                                            </Button>
                                            {canSend && (
                                                <p className="text-xs text-center text-muted-foreground">
                                                    Emails are sent immediately to the selected audience.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step Navigation */}
                            {currentStep !== 'send' && (
                                <div className="border-t border-border/40 px-4 py-4 sm:px-6 bg-muted/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={currentStep === 'event'}
                                        className="w-full gap-2 sm:w-auto"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </Button>
                                    <div className="flex w-full items-center gap-2 sm:w-auto">
                                        <Button
                                            onClick={handleContinue}
                                            disabled={
                                                (currentStep === 'event' && !canProceedFromEvent) ||
                                                (currentStep === 'audience' && !canProceedFromAudience) ||
                                                (currentStep === 'compose' && !canProceedFromCompose)
                                            }
                                            className="w-full gap-2 bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:from-[oklch(0.75_0.14_165)] hover:to-[oklch(0.68_0.15_185)] sm:w-auto"
                                        >
                                            Continue
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 'send' && (
                                <div className="border-t border-border/40 px-4 py-4 sm:px-6 bg-muted/10 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        className="w-full gap-2 sm:w-auto"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Edit
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Recent Sends — Timeline Feed */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden"
                >
                    {/* Section header */}
                    <div className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-display text-lg font-semibold">Recent Sends</h2>
                                    <p className="text-xs text-muted-foreground">Attendee emails sent from this dashboard</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline body */}
                    <div className="px-6 py-4">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-foreground">No email history yet</p>
                                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                                    Future attendee emails sent from this page will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    {/* Timeline spine */}
                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[oklch(0.78_0.14_165)] via-[oklch(0.72_0.15_185)] to-border/30 rounded-full" />

                                    <div className="space-y-0">
                                        {history.map((entry, index) => (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                onClick={() => openHistoryDetail(entry.id)}
                                                className="group relative w-full text-left pl-7 py-3.5 transition-colors hover:bg-muted/30 rounded-lg"
                                            >
                                                {/* Timeline dot */}
                                                <div className={cn(
                                                    'absolute left-0 top-[22px] h-[15px] w-[15px] rounded-full border-2 transition-all duration-200',
                                                    'border-[oklch(0.78_0.14_165)] bg-white group-hover:bg-[oklch(0.78_0.14_165)] group-hover:border-[oklch(0.72_0.15_185)]'
                                                )} />

                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-sm text-foreground truncate">{entry.subject}</p>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'shrink-0 text-[10px] px-1.5 py-0 h-5',
                                                                    entry.status === 'completed' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                                                    entry.status === 'partial_failure' && 'border-amber-200 bg-amber-50 text-amber-700',
                                                                    entry.status === 'failed' && 'border-red-200 bg-red-50 text-red-700',
                                                                    entry.status === 'sending' && 'border-sky-200 bg-sky-50 text-sky-700'
                                                                )}
                                                            >
                                                                {entry.status === 'completed' ? 'Sent' : entry.status === 'partial_failure' ? 'Partial' : entry.status === 'failed' ? 'Failed' : 'Sending'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground break-words">
                                                            {entry.event.title || 'Untitled event'} · {historyAudienceLabels[entry.audience]} · {entry.recipientCount} recipient{entry.recipientCount !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-0.5 sm:shrink-0">
                                                        <span className="text-xs text-muted-foreground">{formatHistoryDate(entry.createdAt)}</span>
                                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>

                                                {/* Separator — skip on last item */}
                                                {index < history.length - 1 && (
                                                    <div className="absolute bottom-0 left-7 right-0 h-px bg-border/40" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(hasMoreHistory || isLoadingMoreHistory) && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLoadMoreHistory}
                                            disabled={isLoadingMoreHistory}
                                            className="gap-2"
                                        >
                                            {isLoadingMoreHistory ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Loading more
                                                </>
                                            ) : (
                                                'Load more sends'
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl p-0">
                    {/* Gradient header band */}
                    <div className="bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] px-6 py-5">
                        <SheetHeader>
                            <SheetTitle className="text-white font-display">
                                {selectedHistory?.subject || 'Email Details'}
                            </SheetTitle>
                        </SheetHeader>
                        {selectedHistory && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/80">
                                <span>{formatHistoryDate(selectedHistory.createdAt)}</span>
                                <span>·</span>
                                <span>{selectedHistory.recipientCount} recipient{selectedHistory.recipientCount !== 1 ? 's' : ''}</span>
                                {selectedHistory.sentBy.email && (
                                    <>
                                        <span>·</span>
                                        <span>by {selectedHistory.sentBy.email}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-6">
                        {isLoadingHistoryDetail ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : selectedHistory ? (
                            <>
                                {/* Delivery stats */}
                                <div className="space-y-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Delivery</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                                            <Check className="h-3 w-3" />
                                            {selectedHistory.sentCount} sent
                                        </span>
                                        {selectedHistory.failedCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                                                <AlertCircle className="h-3 w-3" />
                                                {selectedHistory.failedCount} failed
                                            </span>
                                        )}
                                        {selectedHistory.skippedCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                                                {selectedHistory.skippedCount} skipped
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Event + audience context */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Context</p>
                                    <p className="text-sm text-foreground">
                                        {selectedHistory.event.title || 'Untitled event'} · {historyAudienceLabels[selectedHistory.audience]}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Message</p>
                                    <BroadcastEmailPreview
                                        event={null}
                                        subject={selectedHistory.subject}
                                        message={selectedHistory.message}
                                        organizerLabel={selectedHistory.audienceSnapshot.previewMeta?.organizerLabel || 'Organizer'}
                                        images={selectedHistory.audienceSnapshot.images}
                                        eventTitleOverride={selectedHistory.audienceSnapshot.previewMeta?.eventTitle || selectedHistory.event.title}
                                        eventMetaOverride={selectedHistory.audienceSnapshot.previewMeta?.eventMeta || 'Saved event details unavailable'}
                                    />
                                </div>

                                {/* Recipients */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recipients</p>
                                        <span className="text-xs text-muted-foreground">
                                            {selectedHistory.recipientsPage.search
                                                ? `${selectedHistory.recipients.length}${selectedHistory.recipientsPage.hasMore ? '+' : ''} matching recipient${selectedHistory.recipients.length === 1 ? '' : 's'} loaded`
                                                : `${selectedHistory.recipients.length} of ${selectedHistory.recipientCount} recipient${selectedHistory.recipientCount === 1 ? '' : 's'} loaded`}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={recipientSearchInput}
                                            onChange={(event) => setRecipientSearchInput(event.target.value)}
                                            placeholder="Search recipients by name or email…"
                                            className="pl-9 pr-9"
                                        />
                                        {recipientSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => setRecipientSearchInput('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {isRefreshingHistoryRecipients && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="max-h-[45vh] space-y-1.5 overflow-y-auto rounded-xl border border-border/50 bg-background p-2">
                                        {selectedHistory.recipients.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                                                No recipients match this search.
                                            </div>
                                        ) : (
                                            selectedHistory.recipients.map((recipient) => (
                                                <div
                                                    key={recipient.id}
                                                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] flex items-center justify-center text-[11px] font-semibold text-white">
                                                            {(recipient.name || recipient.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {recipient.name || 'Unnamed attendee'}
                                                            </p>
                                                            <p className="truncate text-xs text-muted-foreground">{recipient.email}</p>
                                                        </div>
                                                    </div>
                                                    {recipient.orderId && (
                                                        <Badge variant="outline" className="shrink-0 text-[10px] border-[oklch(0.78_0.14_165)]/40 text-[oklch(0.55_0.12_180)]">
                                                            Order linked
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            {isRefreshingHistoryRecipients ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Refreshing recipient results
                                                </span>
                                            ) : (
                                                'Recipients are loaded 50 at a time.'
                                            )}
                                        </div>
                                        {selectedHistory.recipientsPage.hasMore && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleLoadMoreRecipients}
                                                disabled={isLoadingMoreRecipients || isRefreshingHistoryRecipients}
                                            >
                                                {isLoadingMoreRecipients ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    'Load 50 more'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Select a history entry to inspect its message and recipients.
                                </p>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
