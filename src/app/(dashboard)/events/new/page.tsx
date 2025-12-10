'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Copy,
  Loader2,
  MessageSquare,
  NotebookPen,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  cloneableEventOptions,
  draftEventOptions,
  getDraftInitialForDraft,
  getTemplateByKey,
  type CloneableEventOption,
  type DraftEventOption,
} from '@/data/mock-events';
import { savePendingDraft } from '@/utils/pending-draft-storage';
import type { DraftEventInitial } from '@/hooks/useEventDraft';

type DraftSource = 'ai' | 'clone' | 'draft';

interface ActionTileProps {
  title: string;
  description: string;
  icon: typeof Sparkles;
  badge?: string;
  actionLabel: string;
  onClick: () => void;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

const defaultMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Salaam! Describe your event or drop in a poster and I will pre-fill the creation form for you.',
  },
];

const buildAiDraft = (titleHint?: string): DraftEventInitial => {
  const cleanedTitle = titleHint
    ? titleHint.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim()
    : 'Community Meetup';

  return {
    formData: {
      title: cleanedTitle || 'Community Meetup',
      description:
        'Curated by the AI assistant. Review the details, edit anything you like and publish when ready.',
      category: 'Community',
      organizerName: 'HalalTicketin AI Draft',
      date: '2025-04-12',
      endDate: '2025-04-12',
      isMultiDay: false,
      startTime: '18:30',
      endTime: '21:30',
      timezone: 'Europe/London',
      locationType: 'physical',
      venue: 'To be confirmed',
      address: '',
      city: '',
      onlineUrl: '',
    },
    tickets: [
      {
        id: 'ai-ticket',
        name: 'Standard Ticket',
        price: '15',
        isFree: false,
        quantity: 150,
        maxPerOrder: 6,
        description: 'Auto-generated ticket tier. Adjust the price or capacity anytime.',
        salesStart: '2025-02-01',
        salesEnd: '2025-04-11',
        hasEarlyBird: false,
        earlyBirdPrice: '',
        earlyBirdEndDate: '',
        visibility: 'public',
      },
    ],
    promoCodes: [],
    currentStep: 1,
  };
};

function ActionTile({ title, description, icon: Icon, badge, actionLabel, onClick }: ActionTileProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm transition hover:border-primary/40">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          {badge ? (
            <Badge variant="outline" className="text-xs font-medium px-2 py-1">
              {badge}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full justify-between" onClick={onClick}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function NewEventChooserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiDraft, setAiDraft] = useState<DraftEventInitial | null>(null);
  const [uploadedPoster, setUploadedPoster] = useState<string | null>(null);

  const tiles: ActionTileProps[] = useMemo(
    () => [
      {
        title: 'Create with AI',
        description: 'Chat with our assistant, paste details or upload a poster for instant drafts.',
        icon: Sparkles,
        badge: 'Beta',
        actionLabel: 'Open AI assistant',
        onClick: () => setAiOpen(true),
      },
      {
        title: 'Start from scratch',
        description: 'Go straight into the creation wizard and fill everything manually.',
        icon: NotebookPen,
        actionLabel: 'Open form',
        onClick: () => router.push('/events/create'),
      },
      {
        title: 'Use previous event',
        description: 'Copy timings, tickets and copy from an existing event.',
        icon: Copy,
        actionLabel: 'Choose event',
        onClick: () => setCloneOpen(true),
      },
      {
        title: 'Continue drafting',
        description: 'Pick up where you left off with a saved draft.',
        icon: Wand2,
        actionLabel: 'View drafts',
        onClick: () => setDraftOpen(true),
      },
    ],
    [router],
  );

  const handleAiSend = () => {
    const trimmed = aiInput.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, newMessage]);
    setAiInput('');
    setIsProcessing(true);

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          'I drafted the key details below. You can continue chatting or send it to the editor.',
      };
      setMessages((prev) => [...prev, aiMessage]);
      setAiDraft(buildAiDraft(trimmed));
      setIsProcessing(false);
    }, 900);
  };

  const handlePosterUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedPoster(file.name);
    const aiMessage: ChatMessage = {
      id: `poster-${Date.now()}`,
      role: 'assistant',
      content: `Poster "${file.name}" processed. Timings and venue are in your draft.`,
    };
    setMessages((prev) => [...prev, aiMessage]);
    setAiDraft(buildAiDraft(file.name));
  };

  const handOffDraft = (source: DraftSource, draft: DraftEventInitial, meta: { label: string; description?: string; key?: string }) => {
    savePendingDraft({
      source,
      draft,
      meta,
    });
    router.push(`/events/create?source=${source}`);
  };

  const handleClone = (option: CloneableEventOption) => {
    const draft = getTemplateByKey(option.templateKey);
    handOffDraft('clone', draft, {
      label: `Cloned · ${option.title}`,
      description: option.summary,
      key: option.id,
    });
    setCloneOpen(false);
  };

  const handleDraftContinue = (option: DraftEventOption) => {
    const draft = getDraftInitialForDraft(option.id);
    if (!draft) return;
    handOffDraft('draft', draft, {
      label: `Draft · ${option.title}`,
      description: option.description,
      key: option.id,
    });
    setDraftOpen(false);
  };

  const handleApplyAiDraft = () => {
    const draftToUse = aiDraft ?? buildAiDraft();
    handOffDraft('ai', draftToUse, {
      label: uploadedPoster ? `AI from ${uploadedPoster}` : 'AI-generated draft',
      description: 'Review the auto-filled details in the editor.',
      key: `ai-${Date.now()}`,
    });
    setAiOpen(false);
  };

  return (
    <>
      <div className="min-h-screen bg-muted/30">
        <div className="container py-10 space-y-8">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              Events · step zero
            </Badge>
            <h1 className="font-display text-3xl font-bold">How would you like to create your event?</h1>
            <p className="text-muted-foreground text-lg">
              Decide whether you want AI assistance, a blank canvas, or to reuse something you have already started.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <ActionTile {...tile} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Event Assistant
            </DialogTitle>
            <DialogDescription>
              Describe the event (city, timings, ticketing) and we will pre-fill the creation wizard. Uploading a poster works too.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col rounded-2xl border bg-muted/40 p-4">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === 'assistant'
                        ? 'bg-primary/5 text-primary-foreground/80'
                        : 'bg-background border'
                    }`}
                  >
                    <p className="font-medium mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {message.role === 'assistant' ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Assistant
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-3.5 w-3.5" />
                          You
                        </>
                      )}
                    </p>
                    <p>{message.content}</p>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePosterUpload}
                  />
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="font-medium mb-1">Drop a poster image</p>
                  <p className="text-xs">
                    We will extract the key info automatically.{' '}
                    <button
                      type="button"
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse files
                    </button>
                  </p>
                  {uploadedPoster ? (
                    <p className="mt-2 text-xs text-primary">Attached: {uploadedPoster}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Example: Need an interfaith iftar in Birmingham on 12 March with VIP tickets."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="min-h-12"
                  />
                  <Button onClick={handleAiSend} disabled={isProcessing || !aiInput.trim()} className="shrink-0">
                    Send
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Draft preview</CardTitle>
                  <CardDescription>
                    We&apos;ll carry this into the regular editor so you can tweak every field.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-semibold">{aiDraft?.formData?.title ?? 'Waiting for your prompt...'}</p>
                  <p className="text-muted-foreground">
                    {aiDraft
                      ? aiDraft.formData?.description
                      : 'Share details or upload a poster to generate the outline.'}
                  </p>
                  <div className="rounded-lg bg-background/80 border px-3 py-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tickets</p>
                    <p className="font-medium">
                      {aiDraft?.tickets?.[0]?.name ?? 'TBC'} · £{aiDraft?.tickets?.[0]?.price ?? '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Button
                className="w-full"
                disabled={!aiDraft && !uploadedPoster && messages.length === 1}
                onClick={handleApplyAiDraft}
              >
                Use this draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone previous event */}
      <Sheet open={cloneOpen} onOpenChange={setCloneOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Use a previous event</SheetTitle>
            <SheetDescription>Copy all of the structure from one of your events.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 p-2">
            {cloneableEventOptions.map((option) => (
              <Card key={option.id} className="border-border/60">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div>
                    <p className="font-semibold">{option.title}</p>
                    <p className="text-sm text-muted-foreground">{option.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.location}</p>
                  </div>
                  <Button variant="outline" onClick={() => handleClone(option)}>
                    Use this template
                  </Button>
                </CardContent>
              </Card>
            ))}
            {cloneableEventOptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">No events available yet.</p>
            )}
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
            {draftEventOptions.map((option) => (
              <Card key={option.id} className="border-border/60">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{option.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {option.progressLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.updatedAt}</p>
                  </div>
                  <Button variant="outline" onClick={() => handleDraftContinue(option)}>
                    Continue draft
                  </Button>
                </CardContent>
              </Card>
            ))}
            {draftEventOptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">No drafts saved yet.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
