'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Calendar,
    MapPin,
    Plus,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Archive,
    Loader2,
    AlertCircle,
    XCircle,
    RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
}
    from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SUPPORTED_CURRENCIES } from '@/lib/fees'; // Added import
import api from '@/lib/api';
import { archiveEvent, unarchiveEvent } from '@/lib/events-api';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, DashboardEvent } from '@/hooks/useOrganizerEvents';
import { DeleteEventDialog } from '@/components/dashboard/DeleteEventDialog';
import { CancelEventDialog } from '@/components/dashboard/CancelEventDialog';
import { useOrganizers } from '@/context/organizer-context';

const statusBadgeStyles = {
    active: 'bg-emerald-500/90 text-white',
    past: 'bg-amber-500/90 text-white',
    draft: 'bg-slate-500/90 text-white',
    cancelled: 'bg-red-500/90 text-white',
    archived: 'bg-slate-700/80 text-white',
};

const getEventStatusBadge = (event: DashboardEvent) => {
    if (event.status === 'cancelled') {
        return { label: 'Cancelled', className: statusBadgeStyles.cancelled };
    }
    if (event.status === 'archived') {
        return { label: 'Archived', className: statusBadgeStyles.archived };
    }
    if (event.displayStatus === 'draft') {
        return { label: 'Draft', className: statusBadgeStyles.draft };
    }
    if (event.displayStatus === 'past') {
        return { label: 'Completed', className: statusBadgeStyles.past };
    }
    return { label: 'Active', className: statusBadgeStyles.active };
};

/**
 * Format event datetime for display.
 */
function formatEventDateTime(event: DashboardEvent): { date: string; time: string } {
    if (!event.startDatetime) {
        return { date: 'Date TBD', time: '' };
    }

    const start = new Date(event.startDatetime);
    const date = start.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const time = start.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return { date, time };
}

/**
 * Get location display string.
 */
function getLocationDisplay(event: DashboardEvent): string {
    if (event.locationType === 'online') {
        return 'Online Event';
    }
    if (event.venue) {
        return event.city ? `${event.venue}, ${event.city}` : event.venue;
    }
    if (event.city) {
        return event.city;
    }
    return 'Location TBD';
}

function EventCard({
    event,
    index,
    onDelete,
    onCancel,
    onUnarchive,
    revenueCurrency,
    isSelected,
    onToggleSelect,
}: {
    event: DashboardEvent;
    index: number;
    onDelete: (event: DashboardEvent) => void;
    onCancel: (event: DashboardEvent) => void;
    onUnarchive: (event: DashboardEvent) => void;
    revenueCurrency?: string;
    isSelected: boolean;
    onToggleSelect: (id: string, selected: boolean) => void;
}) {
    const router = useRouter();
    const statusBadge = getEventStatusBadge(event);
    const { date, time } = formatEventDateTime(event);
    const location = getLocationDisplay(event);
    const currency = revenueCurrency ?? event.currency;
    const isActivePublished = event.status === 'published' && event.displayStatus === 'active';

    // Use actual data from backend
    const ticketsSold = event.ticketsSold || 0;
    const totalTickets = event.totalTickets || 0;
    const revenue = event.revenue || 0;

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on the dropdown menu
        const target = e.target as HTMLElement;
        if (
            target.closest('[data-dropdown-trigger]') ||
            target.closest('[data-dropdown-content]') ||
            target.closest('[data-selection-toggle]')
        ) {
            return;
        }
        router.push(`/events/${event.id}/edit`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Card
                className="group relative overflow-hidden border border-border/60 hover:border-primary/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer p-0"
                onClick={handleCardClick}
            >
                {/* Banner Image - Portrait 4:5 */}
                <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted">
                    {event.bannerImageUrl ? (
                        <Image
                            src={event.bannerImageUrl}
                            alt={event.title || 'Event'}
                            fill
                            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                            <Calendar className="h-16 w-16 text-muted-foreground/30" /> {/* Changed size and opacity */}
                        </div>
                    )}

                    {/* Status Badge - Top Left */}
                    <div
                        className="absolute top-2 left-2 flex items-center gap-2"
                        data-selection-toggle
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onToggleSelect(event.id, checked === true)}
                            aria-label={`Select ${event.title || 'event'}`}
                        />
                        <span // Changed from Badge component to span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge.className}`}
                        >
                            {/* Removed StatusIcon */}
                            {statusBadge.label}
                        </span>
                    </div>

                    {/* Three-Dot Menu - Top Right */}
                    <div className="absolute top-2 right-2" data-dropdown-trigger>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" data-dropdown-content>
                                {event.slug && event.displayStatus !== 'draft' && (
                                    <DropdownMenuItem asChild>
                                        <Link href={`/events/${event.slug}`}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Public Page
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link href={`/events/${event.id}/edit`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                {event.status === 'draft' ? (
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(event);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete draft
                                    </DropdownMenuItem>
                                ) : event.status === 'archived' ? (
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUnarchive(event);
                                        }}
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Unarchive
                                    </DropdownMenuItem>
                                ) : isActivePublished ? (
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCancel(event);
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel event
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(event);
                                        }}
                                    >
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Card Content */}
                <CardContent className="p-3 space-y-2 bg-gradient-to-b from-background to-muted/20">
                    {/* Title */}
                    <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem] leading-tight">
                        {event.title || 'Untitled Event'}
                    </h3>

                    {/* Event Details */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0 text-primary/70" />
                            <span className="truncate">{date}{time && ` at ${time}`}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                            <span className="truncate">{location}</span>
                        </div>
                    </div>

                    {/* Stats Section - Enhanced */}
                    <div className="-mx-3 px-3 py-2 mt-2 border-t bg-primary/5">
                        <div className="grid grid-cols-2 gap-2 text-xs mb-1.5">
                            <div>
                                <p className="text-xs text-muted-foreground">Tickets Sold</p>
                                <p className="font-bold text-primary">{ticketsSold}/{totalTickets || '∞'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Net Revenue</p>
                                <p className="font-semibold text-primary">{SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES]?.symbol || currency}{revenue.toFixed(2)}</p>
                            </div>
                        </div>
                        {/* Progress Bar - Enhanced */}
                        <div className="h-1 bg-background rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                                style={{
                                    width: totalTickets > 0 ? `${Math.min((ticketsSold / totalTickets) * 100, 100)}%` : '0%',
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function MyEventsPage() {
    const router = useRouter();
    const organizerId = useOrganizerFromParams();
    const { events, isLoading, error, refresh: refreshEvents } = useOrganizerEvents(organizerId);
    const { organizers } = useOrganizers();
    const [activeTab, setActiveTab] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; eventId: string; eventTitle: string; eventStatus?: string | null }>({
        open: false,
        eventId: '',
        eventTitle: '',
        eventStatus: null,
    });
    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; eventId: string; eventTitle: string }>({
        open: false,
        eventId: '',
        eventTitle: '',
    });
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);
    const [bulkArchiveError, setBulkArchiveError] = useState<string | null>(null);
    const [isBulkArchiving, setIsBulkArchiving] = useState(false);

    const visibleEvents = showArchived ? events : events.filter((event) => event.status !== 'archived');
    const selectedEvents = visibleEvents.filter((event) => selectedEventIds.has(event.id));
    const draftSelected = selectedEvents.filter((event) => event.status === 'draft');
    const activeSelected = selectedEvents.filter(
        (event) => event.status === 'published' && event.displayStatus === 'active'
    );
    const archivableSelected = selectedEvents.filter(
        (event) =>
            event.status !== 'draft' &&
            event.status !== 'archived' &&
            !(event.status === 'published' && event.displayStatus === 'active')
    );

    const handleDeleteSuccess = () => {
        refreshEvents();
        router.refresh();
    };

    const handleCancelSuccess = () => {
        refreshEvents();
        router.refresh();
    };

    useEffect(() => {
        setSelectedEventIds(new Set());
    }, [activeTab, showArchived]);

    useEffect(() => {
        setSelectedEventIds((prev) => {
            if (prev.size === 0) {
                return prev;
            }
            const validIds = new Set(visibleEvents.map((event) => event.id));
            const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [visibleEvents]);

    // Scroll to top when page loads
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const getFilteredEvents = (status: string) => {
        if (status === 'all') return visibleEvents;
        if (status === 'draft') return visibleEvents.filter((event) => event.status === 'draft');
        if (status === 'cancelled') return visibleEvents.filter((event) => event.status === 'cancelled');
        if (status === 'past') {
            return visibleEvents.filter(
                (event) => event.displayStatus === 'past' && event.status !== 'cancelled'
            );
        }
        return visibleEvents.filter((event) => event.displayStatus === 'active');
    };
    const counts = {
        all: visibleEvents.length,
        active: visibleEvents.filter((event) => event.displayStatus === 'active').length,
        past: visibleEvents.filter(
            (event) => event.displayStatus === 'past' && event.status !== 'cancelled'
        ).length,
        draft: visibleEvents.filter((event) => event.status === 'draft').length,
        cancelled: visibleEvents.filter((event) => event.status === 'cancelled').length,
    };
    const revenueCurrency = organizers.find((org) => org.id === organizerId)?.defaultCurrency;
    const hasSelectedEvents = selectedEventIds.size > 0;
    const hasArchivableSelected = archivableSelected.length > 0;
    const hasDraftSelected = draftSelected.length > 0;
    const hasActiveSelected = activeSelected.length > 0;
    const hasNonDraftSelected = selectedEvents.some((event) => event.status !== 'draft');

    const toggleSelectedEvent = (id: string, selected: boolean) => {
        setSelectedEventIds((prev) => {
            const next = new Set(prev);
            if (selected) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const toggleSelectAll = (ids: string[]) => {
        setSelectedEventIds((prev) => {
            const next = new Set(prev);
            const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
            if (allSelected) {
                ids.forEach((id) => next.delete(id));
            } else {
                ids.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const handleBulkDeleteClick = () => {
        if (!hasDraftSelected) {
            return;
        }
        setBulkDeleteError(null);
        setBulkDialogOpen(true);
    };

    const handleBulkDeleteConfirm = async () => {
        if (draftSelected.length === 0) {
            return;
        }
        setIsBulkDeleting(true);
        setBulkDeleteError(null);
        try {
            await Promise.all(
                draftSelected.map((event) => api.delete(`/api/v1/events/${event.id}`))
            );
            setBulkDialogOpen(false);
            setSelectedEventIds(new Set());
            refreshEvents();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete selected events';
            setBulkDeleteError(message);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkArchiveClick = () => {
        if (!hasArchivableSelected) {
            return;
        }
        setBulkArchiveError(null);
        setBulkArchiveDialogOpen(true);
    };

    const handleUnarchive = async (eventId: string) => {
        try {
            setActionError(null);
            await unarchiveEvent(eventId);
            refreshEvents();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to unarchive event';
            setActionError(message);
        }
    };

    const handleBulkArchiveConfirm = async () => {
        if (archivableSelected.length === 0) {
            return;
        }
        setIsBulkArchiving(true);
        setBulkArchiveError(null);
        try {
            await Promise.all(
                archivableSelected.map((event) => archiveEvent(event.id))
            );
            setBulkArchiveDialogOpen(false);
            setSelectedEventIds(new Set());
            refreshEvents();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to archive selected events';
            setBulkArchiveError(message);
        } finally {
            setIsBulkArchiving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading events...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <Card className="max-w-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <h2 className="text-lg font-semibold">Failed to load events</h2>
                    <p className="text-muted-foreground mt-2">{error}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold">My Events</h1>
                        <p className="text-muted-foreground mt-1">Manage your events and track performance</p>
                    </div>
                    <Button asChild className="shrink-0">
                        <Link href={organizerId ? `/events/new?organizerId=${organizerId}` : '/events/new'}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Event
                        </Link>
                    </Button>
                </motion.div>

                {actionError && (
                    <Card className="mb-4 border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {actionError}
                    </Card>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Scrollable container for mobile */}
                        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                            <TabsList className="bg-muted/50 p-1 w-max sm:w-auto">
                                <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                                    All <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5">{counts.all}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                                    Active <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5">{counts.active}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="past" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                                    Past <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5">{counts.past}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="cancelled" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                                    Cancelled <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5">{counts.cancelled}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="draft" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                                    Drafts <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-1.5">{counts.draft}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="toggle-archived"
                                checked={showArchived}
                                onCheckedChange={(checked) => setShowArchived(checked)}
                            />
                            <label htmlFor="toggle-archived" className="text-sm text-muted-foreground">
                                Show archived
                            </label>
                        </div>
                    </div>

                    {['all', 'active', 'past', 'cancelled', 'draft'].map(tab => (
                        <TabsContent key={tab} value={tab}>
                            {(() => {
                                const tabEvents = getFilteredEvents(tab);
                                const tabEventIds = tabEvents.map((event) => event.id);
                                const selectedInTab = tabEventIds.filter((id) => selectedEventIds.has(id));
                                const allSelectedInTab = tabEventIds.length > 0 && selectedInTab.length === tabEventIds.length;

                                if (tabEvents.length === 0) {
                                    return (
                                        <Card className="p-12 text-center">
                                            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                            <h3 className="font-semibold text-lg">No events found</h3>
                                            <p className="text-muted-foreground mt-1">
                                                {tab === 'draft'
                                                    ? "You don't have any draft events."
                                                    : tab === 'all'
                                                        ? "You haven't created any events yet."
                                                        : tab === 'active'
                                                            ? "You don't have any active events."
                                                            : tab === 'cancelled'
                                                                ? "You don't have any cancelled events."
                                                                : "You don't have any past events yet."}
                                            </p>
                                            <Button asChild className="mt-4">
                                                <Link href={organizerId ? `/events/new?organizerId=${organizerId}` : '/events/new'}>
                                                    Create your first event
                                                </Link>
                                            </Button>
                                        </Card>
                                    );
                                }

                                return (
                                    <>
                                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleSelectAll(tabEventIds)}
                                                >
                                                    {allSelectedInTab ? 'Clear selection' : 'Select all'}
                                                </Button>
                                                {hasSelectedEvents && (
                                                    <span className="text-sm text-muted-foreground">
                                                        {selectedEventIds.size} selected
                                                    </span>
                                                )}
                                            </div>
                                            {hasSelectedEvents && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {hasArchivableSelected && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={handleBulkArchiveClick}
                                                            disabled={isBulkArchiving}
                                                        >
                                                            Archive selected
                                                        </Button>
                                                    )}
                                                    {hasDraftSelected && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={handleBulkDeleteClick}
                                                            disabled={isBulkDeleting}
                                                        >
                                                            Delete drafts
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {tabEvents.map((event, i) => (
                                                <EventCard
                                                    key={event.id}
                                                    event={event}
                                                    index={i}
                                                    onDelete={(selectedEvent) =>
                                                        setDeleteDialog({
                                                            open: true,
                                                            eventId: selectedEvent.id,
                                                            eventTitle: selectedEvent.title || 'Untitled Event',
                                                            eventStatus: selectedEvent.status,
                                                        })
                                                    }
                                                    onCancel={(selectedEvent) =>
                                                        setCancelDialog({
                                                            open: true,
                                                            eventId: selectedEvent.id,
                                                            eventTitle: selectedEvent.title || 'Untitled Event',
                                                        })
                                                    }
                                                    onUnarchive={(selectedEvent) =>
                                                        handleUnarchive(selectedEvent.id)
                                                    }
                                                    revenueCurrency={revenueCurrency}
                                                    isSelected={selectedEventIds.has(event.id)}
                                                    onToggleSelect={toggleSelectedEvent}
                                                />
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteEventDialog
                eventId={deleteDialog.eventId}
                eventTitle={deleteDialog.eventTitle}
                eventStatus={deleteDialog.eventStatus}
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
                onSuccess={handleDeleteSuccess}
            />

            <CancelEventDialog
                eventId={cancelDialog.eventId}
                eventTitle={cancelDialog.eventTitle}
                open={cancelDialog.open}
                onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}
                onSuccess={handleCancelSuccess}
            />

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Delete selected drafts
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-sm text-muted-foreground space-y-3 pt-2">
                                <p>
                                    You are about to delete {draftSelected.length} draft
                                    {draftSelected.length === 1 ? '' : 's'}. This cannot be undone.
                                </p>
                                {hasNonDraftSelected && (
                                    <p className="text-xs text-muted-foreground">
                                        Active or past events in your selection will not be deleted.
                                    </p>
                                )}
                                {bulkDeleteError && (
                                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                        {bulkDeleteError}
                                    </p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkDialogOpen(false)}
                            disabled={isBulkDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleBulkDeleteConfirm}
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting ? 'Deleting...' : 'Delete drafts'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Archive Confirmation Dialog */}
            <Dialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <Archive className="h-5 w-5" />
                            Archive selected events
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-sm text-muted-foreground space-y-3 pt-2">
                                <p>
                                    You are about to archive {archivableSelected.length} event
                                    {archivableSelected.length === 1 ? '' : 's'}. Archived events are hidden from public
                                    listings and checkout.
                                </p>
                                {hasActiveSelected && (
                                    <p className="text-xs text-muted-foreground">
                                        Active events must be cancelled before archiving and will be skipped.
                                    </p>
                                )}
                                {bulkArchiveError && (
                                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                        {bulkArchiveError}
                                    </p>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkArchiveDialogOpen(false)}
                            disabled={isBulkArchiving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBulkArchiveConfirm}
                            disabled={isBulkArchiving}
                        >
                            {isBulkArchiving ? 'Archiving...' : 'Archive events'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
