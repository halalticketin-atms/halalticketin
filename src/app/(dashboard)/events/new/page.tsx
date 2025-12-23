'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Copy,
  NotebookPen,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { savePendingDraft } from '@/utils/pending-draft-storage';
import type { DraftEventInitial } from '@/hooks/useEventDraft';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { fetchEventDetails, listOrganizerEvents, type EventRecord } from '@/lib/events-api';
import { buildDraftFromEventRecord } from '@/lib/ticket-mappers';
import { getUserFriendlyMessage } from '@/lib/errors';
import { CreateOrganizerDialog } from '@/components/auth/CreateOrganizerDialog';

type DraftSource = 'ai' | 'clone' | 'draft';

interface ActionTileProps {
  title: string;
  description: string;
  icon: typeof Sparkles;
  badge?: string;
  actionLabel: string;
  gradient: string;
  onClick: () => void;
}

function ActionTile({ title, description, icon: Icon, badge, actionLabel, gradient, onClick }: ActionTileProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer ${gradient}`}
    >
      {/* Background Texture/Noise (Optional, keeping it clean for now) */}

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
          <Icon className="h-6 w-6 text-white" />
        </div>
        {badge ? (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="relative z-10 mt-6 space-y-1.5">
        <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
        <p className="text-white/90 leading-relaxed text-sm pr-4 opacity-90 font-medium">
          {description}
        </p>
      </div>

      <div className="relative z-10 mt-6 flex items-center gap-2 font-semibold text-white group-hover:gap-3 transition-all">
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
}

export default function NewEventChooserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizerId, isLoading: organizersLoading } = useOrganizers();
  const { user, isOrganizer, isLoading: authLoading } = useAuth();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftEvents, setDraftEvents] = useState<EventRecord[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Clone events state
  const [cloneEvents, setCloneEvents] = useState<EventRecord[]>([]);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [selectedCloneId, setSelectedCloneId] = useState<string | null>(null);

  // Auth gating dialog
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleCreateOrgOpenChange = useCallback((open: boolean) => {
    setCreateOrgOpen(open);
    if (!open && !activeOrganizerId && !organizersLoading) {
      setPendingAction(null);
    }
  }, [activeOrganizerId, organizersLoading]);

  // Execute pending action when organizer context is ready
  useEffect(() => {
    if (pendingAction && activeOrganizerId && !organizersLoading && !createOrgOpen) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction, activeOrganizerId, organizersLoading, createOrgOpen]);

  useEffect(() => {
    const openSheet = searchParams.get('open');
    if (openSheet === 'clone') {
      setCloneOpen(true);
    }
    if (openSheet === 'draft') {
      setDraftOpen(true);
    }
  }, [searchParams]);

  // Gated click handler that checks auth/organizer status
  const gatedAction = useCallback((action: () => void, options?: { loginRedirect?: string }) => {
    // Still loading? Wait for it
    if (authLoading || organizersLoading) return;

    // Not signed in → redirect to login page (they can sign up from there)
    if (!user) {
      const nextPath = options?.loginRedirect ?? '/events/new';
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    // Signed in but not an organizer → prompt to create organizer profile
    if (!isOrganizer || !activeOrganizerId) {
      setPendingAction(() => action);
      setCreateOrgOpen(true);
      return;
    }

    // User is an organizer with active profile → proceed
    action();
  }, [user, isOrganizer, activeOrganizerId, authLoading, organizersLoading, router]);

  const tiles: ActionTileProps[] = useMemo(
    () => [
      {
        title: 'Create with AI',
        description: 'Chat with our assistant, paste details or upload a poster for instant drafts.',
        icon: Sparkles,
        badge: 'Beta',
        actionLabel: 'Start with AI',
        gradient: 'bg-gradient-to-br from-[#0CCDA3] to-[#00B4D8]', // Mint to Cyan
        onClick: () => gatedAction(() => router.push('/events/new/ai')),
      },
      {
        title: 'Start from scratch',
        description: 'Go straight into the creation wizard and fill everything manually.',
        icon: NotebookPen,
        actionLabel: 'Start from scratch',
        gradient: 'bg-gradient-to-br from-[#14b8a6] to-[#0f766e]', // Teal
        onClick: () => gatedAction(() => router.push('/events/create')),
      },
      {
        title: 'Use previous event',
        description: 'Copy timings, tickets and copy from an existing event.',
        icon: Copy,
        actionLabel: 'Choose event',
        gradient: 'bg-gradient-to-br from-[#6EE7B7] to-[#34D399]', // Light Green/Mint
        onClick: () => gatedAction(() => setCloneOpen(true), { loginRedirect: '/events/new?open=clone' }),
      },
      {
        title: 'Continue drafting',
        description: 'Pick up where you left off with a saved draft.',
        icon: Wand2,
        actionLabel: 'Choose draft',
        gradient: 'bg-gradient-to-br from-[#2DD4BF] to-[#0D9488]', // Teal mix
        onClick: () => gatedAction(() => setDraftOpen(true), { loginRedirect: '/events/new?open=draft' }),
      },
    ],
    [router, gatedAction],
  );

  useEffect(() => {
    if (!draftOpen || !activeOrganizerId) {
      if (!draftOpen) {
        setDraftsError(null);
      }
      return;
    }

    let cancelled = false;
    const loadDrafts = async () => {
      setDraftsLoading(true);
      setDraftsError(null);
      try {
        const response = await listOrganizerEvents(activeOrganizerId, { status: 'draft' });
        if (!cancelled) {
          setDraftEvents(response.events);
        }
      } catch (error) {
        if (!cancelled) {
          const message = getUserFriendlyMessage(error) || 'Unable to load drafts right now.';
          setDraftsError(message);
        }
      } finally {
        if (!cancelled) {
          setDraftsLoading(false);
        }
      }
    };

    void loadDrafts();

    return () => {
      cancelled = true;
    };
  }, [activeOrganizerId, draftOpen]);

  // Load cloneable events when clone sheet opens
  useEffect(() => {
    if (!cloneOpen || !activeOrganizerId) {
      if (!cloneOpen) {
        setCloneError(null);
      }
      return;
    }

    let cancelled = false;
    const loadCloneEvents = async () => {
      setCloneLoading(true);
      setCloneError(null);
      try {
        // Fetch all non-draft events (active, published, past, cancelled)
        const response = await listOrganizerEvents(activeOrganizerId);
        if (!cancelled) {
          // Filter out drafts - show only published/active/past events
          const nonDraftEvents = response.events.filter(e => e.status !== 'draft');
          setCloneEvents(nonDraftEvents);
        }
      } catch (error) {
        if (!cancelled) {
          const message = getUserFriendlyMessage(error) || 'Unable to load events right now.';
          setCloneError(message);
        }
      } finally {
        if (!cancelled) {
          setCloneLoading(false);
        }
      }
    };

    void loadCloneEvents();

    return () => {
      cancelled = true;
    };
  }, [activeOrganizerId, cloneOpen]);

  const formatDraftDate = (value?: string | null) => {
    if (!value) return 'Date TBD';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Date TBD';
    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handOffDraft = (source: DraftSource, draft: DraftEventInitial, meta: { label: string; description?: string; key?: string }) => {
    savePendingDraft({
      source,
      draft,
      meta,
    });
    router.push(`/events/create?source=${source}`);
  };

  const handleClone = async (event: EventRecord) => {
    if (!event.id) return;
    setSelectedCloneId(event.id);
    try {
      const response = await fetchEventDetails(event.id);
      const draft = buildDraftFromEventRecord(response.event, response.tickets);

      // Prefix the title with "Copy of"
      if (draft.formData) {
        draft.formData.title = `Copy of ${draft.formData.title || event.title || 'Untitled Event'}`;
      }

      handOffDraft('clone', draft, {
        label: `Cloned · ${event.title ?? 'Untitled event'}`,
        description: event.startDatetime ? formatDraftDate(event.startDatetime) : undefined,
        key: event.id,
      });
      setCloneOpen(false);
    } catch (error) {
      const message = getUserFriendlyMessage(error) || 'Unable to clone this event.';
      setCloneError(message);
    } finally {
      setSelectedCloneId(null);
    }
  };

  const handleDraftContinue = async (event: EventRecord) => {
    if (!event.id) return;
    setSelectedDraftId(event.id);
    try {
      const response = await fetchEventDetails(event.id);
      const draft = buildDraftFromEventRecord(response.event, response.tickets);
      handOffDraft('draft', draft, {
        label: `Draft · ${event.title ?? 'Untitled event'}`,
        description: event.startDatetime ? formatDraftDate(event.startDatetime) : 'Saved draft',
        key: event.id,
      });
      setDraftOpen(false);
    } catch (error) {
      const message = getUserFriendlyMessage(error) || 'Unable to load this draft.';
      setDraftsError(message);
    } finally {
      setSelectedDraftId(null);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-5xl space-y-12">

          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
              How would you like to <span className="text-[#14b8a6]">create</span>?
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto flex items-center justify-center gap-2">
              AI assistance, blank canvas, or pick up where you left off <Sparkles className="h-5 w-5 text-[#FFD700]" />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <ActionTile {...tile} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Clone previous event */}
      <Sheet open={cloneOpen} onOpenChange={setCloneOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Use a previous event</SheetTitle>
            <SheetDescription>Copy all of the structure from one of your events.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 p-2">
            {!activeOrganizerId ? (
              <p className="text-sm text-muted-foreground text-center">
                Select or create an organiser to view events.
              </p>
            ) : cloneLoading ? (
              <p className="text-sm text-muted-foreground text-center">Loading events…</p>
            ) : cloneEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No events available yet.</p>
            ) : (
              cloneEvents.map((event) => (
                <Card key={event.id} className="border-border/60">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{event.title ?? 'Untitled event'}</p>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description?.trim() || 'No description.'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDraftDate(event.startDatetime)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={selectedCloneId === event.id}
                      onClick={() => handleClone(event)}
                    >
                      {selectedCloneId === event.id ? 'Creating copy…' : 'Use this event'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
            {cloneError ? (
              <p className="text-sm text-destructive text-center">{cloneError}</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Draft picker */}
      <Sheet open={draftOpen} onOpenChange={setDraftOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Continue a draft</SheetTitle>
            <SheetDescription>Resume a saved draft right inside the wizard.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 p-2">
            {!activeOrganizerId ? (
              <p className="text-sm text-muted-foreground text-center">
                Select or create an organiser to view drafts.
              </p>
            ) : draftsLoading ? (
              <p className="text-sm text-muted-foreground text-center">Loading drafts…</p>
            ) : draftEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No drafts saved yet.</p>
            ) : (
              draftEvents.map((event) => (
                <Card key={event.id} className="border-border/60">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{event.title ?? 'Untitled event'}</p>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description?.trim() || 'No description yet.'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDraftDate(event.updatedAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={selectedDraftId === event.id}
                      onClick={() => handleDraftContinue(event)}
                    >
                      {selectedDraftId === event.id ? 'Loading…' : 'Continue draft'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
            {draftsError ? (
              <p className="text-sm text-destructive text-center">{draftsError}</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth gating dialog */}

      <CreateOrganizerDialog
        open={createOrgOpen}
        onOpenChange={handleCreateOrgOpenChange}
        onSuccess={() => {
          // Organizer context will refresh, which triggers the pending action via useEffect
        }}
      />
    </>
  );
}
