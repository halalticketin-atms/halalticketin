'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowUp,
    CheckCircle2,
    ImagePlus,
    Loader2,
    X,
} from 'lucide-react';

import { useOrganizers } from '@/context/organizer-context';
import { generateEventDraft } from '@/lib/ai/event-draft';
import { toast } from '@/lib/notifications';
import { savePendingDraft } from '@/utils/pending-draft-storage';
import { cn } from '@/lib/utils';

const MAX_IMAGE_BYTES = 7.5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const processingSteps = [
    'Reading your event details',
    'Scanning the poster',
    'Mapping out tickets',
    'Preparing your review checklist',
] as const;

export default function AIEventCreatorPage() {
    const router = useRouter();
    const { activeOrganizerId } = useOrganizers();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const [prompt, setPrompt] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [processingStepIndex, setProcessingStepIndex] = useState(0);

    const maxLength = 1000;
    const charCount = prompt.length;

    const previewUrl = useMemo(() => uploadedFile ? URL.createObjectURL(uploadedFile) : null, [uploadedFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // Auto-grow the composer as the user types.
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }, [prompt]);

    useEffect(() => {
        if (!isProcessing) {
            setProcessingStepIndex(0);
            return;
        }
        const interval = window.setInterval(() => {
            setProcessingStepIndex((current) => Math.min(current + 1, processingSteps.length - 1));
        }, 1200);
        return () => window.clearInterval(interval);
    }, [isProcessing]);

    const validateImage = (file: File) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            toast.error('Upload a PNG, JPEG, or WebP poster.');
            return false;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error('Poster image must be under 7.5MB.');
            return false;
        }
        return true;
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!validateImage(file)) {
            event.target.value = '';
            return;
        }
        setUploadedFile(file);
    };

    const handleDragOver = (event: React.DragEvent) => {
        if (isProcessing) return;
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        if (isProcessing) return;
        const file = event.dataTransfer.files?.[0];
        if (!file || !validateImage(file)) return;
        setUploadedFile(file);
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!prompt.trim() && !uploadedFile) return;
        if (!activeOrganizerId) {
            toast.error('Select or create an organiser before using AI.');
            return;
        }

        setIsProcessing(true);

        const titleHint = uploadedFile?.name || prompt.slice(0, 80);

        let bannerImageDataUrl: string | null = null;
        if (uploadedFile) {
            try {
                bannerImageDataUrl = await fileToDataUrl(uploadedFile);
            } catch (readError) {
                console.error('Failed to read uploaded image for banner preview', readError);
            }
        }

        try {
            const draft = await generateEventDraft({
                organizerId: activeOrganizerId,
                prompt,
                imageFile: uploadedFile ?? undefined,
                titleHint,
            });

            if (bannerImageDataUrl) {
                draft.formData = {
                    ...(draft.formData ?? {}),
                    bannerImageDataUrl,
                };
            }

            savePendingDraft({
                source: 'ai',
                draft,
                meta: {
                    label: uploadedFile ? `AI from ${uploadedFile.name}` : 'AI-generated draft',
                    description: 'Review the auto-filled details in the editor.',
                    key: `ai-${Date.now()}`,
                    aiReview: draft.aiReview,
                },
            });

            router.push('/events/create?source=ai');
        } catch (err) {
            console.error('AI generation failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            let userMessage = 'Failed to generate event. Please try again.';

            if (errorMessage.includes('rate') || errorMessage.includes('Rate') || errorMessage.includes('Too many')) {
                userMessage = 'Too many requests. Please wait a minute and try again.';
            } else if (errorMessage.includes('limit reached')) {
                userMessage = errorMessage;
            } else if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
                userMessage = 'AI service is not available right now.';
            } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
                userMessage = 'Network error. Please check your connection and try again.';
            }

            toast.error(userMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const canSubmit = (prompt.trim().length > 0 || uploadedFile) && !isProcessing;

    const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            if (canSubmit) void handleSubmit();
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) void handleSubmit();
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden gradient-mesh">
            {/* Ambient brand glow */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-[var(--brand-mint)]/25 blur-[120px]" />
                <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[var(--brand-cyan)]/20 blur-[130px]" />
                <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-[var(--brand-teal)]/15 blur-[120px]" />
            </div>

            {/* Top bar */}
            <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
                <Link
                    href="/events/new"
                    aria-label="Back to event creation options"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1.5 text-sm font-medium shadow-sm backdrop-blur">
                    <Image
                        src="/images/HT-icon.png"
                        alt=""
                        width={22}
                        height={22}
                        className="h-5 w-5 rounded-full shadow-sm"
                    />
                    <span className="text-foreground">HalalTicketin&nbsp;AI</span>
                    <span className="rounded-full bg-[var(--brand-teal)]/12 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--brand-teal)]">
                        Beta
                    </span>
                </div>

                <div className="h-10 w-10" aria-hidden />
            </header>

            <main
                aria-busy={isProcessing}
                className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-8 sm:px-6"
            >
                {isProcessing ? (
                    /* ---------- Conversation / thinking state ---------- */
                    <div className="flex flex-1 flex-col gap-5 py-10">
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="flex justify-end"
                        >
                            <div className="max-w-[82%] rounded-3xl rounded-br-lg bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] px-4 py-3 text-white shadow-lg shadow-[var(--brand-cyan)]/20">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Attached poster"
                                        width={320}
                                        height={180}
                                        unoptimized
                                        className="mb-2 max-h-44 w-auto rounded-xl object-cover"
                                    />
                                ) : null}
                                <p className="whitespace-pre-wrap text-sm leading-6">
                                    {prompt.trim() || 'Create an event from this poster.'}
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.1 }}
                            className="flex items-start gap-3"
                        >
                            <Image
                                src="/images/HT-icon.png"
                                alt="HalalTicketin AI"
                                width={36}
                                height={36}
                                className="h-9 w-9 shrink-0 rounded-xl shadow-sm"
                            />
                            <div
                                role="status"
                                aria-live="polite"
                                className="flex-1 rounded-3xl rounded-bl-lg border border-border/60 bg-card/95 p-4 shadow-sm backdrop-blur sm:p-5"
                            >
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="text-sm font-semibold">On it, building your draft</span>
                                    <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
                                        {processingStepIndex + 1}/{processingSteps.length}
                                    </span>
                                </div>

                                <ul className="space-y-2.5">
                                    {processingSteps.map((step, index) => {
                                        const done = index < processingStepIndex;
                                        const active = index === processingStepIndex;
                                        return (
                                            <li
                                                key={step}
                                                className={cn(
                                                    'flex items-center gap-2.5 text-sm transition-colors',
                                                    active ? 'text-foreground font-medium' : done ? 'text-foreground/70' : 'text-muted-foreground/60',
                                                )}
                                            >
                                                {done ? (
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-teal)]" aria-hidden="true" />
                                                ) : active ? (
                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--brand-teal)]" aria-hidden="true" />
                                                ) : (
                                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                                                    </span>
                                                )}
                                                {step}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[var(--brand-mint)] via-[var(--brand-cyan)] to-[var(--brand-teal)] transition-all duration-700 ease-out"
                                        style={{ width: `${((processingStepIndex + 1) / processingSteps.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    /* ---------- Empty / compose state ---------- */
                    <div className="flex flex-col gap-8 pt-6 pb-10 sm:pt-10">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                            className="flex flex-col items-center gap-5 text-center"
                        >
                            <div className="relative">
                                <span
                                    aria-hidden
                                    className="absolute left-1/2 top-1/2 -z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-cyan)]/30 blur-2xl"
                                />
                                <Image
                                    src="/assets/icons/create-ai-assistant-icon.png"
                                    alt=""
                                    width={128}
                                    height={128}
                                    priority
                                    className="h-28 w-28 object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.14)]"
                                />
                            </div>

                            <div className="space-y-3">
                                <h1 className="font-display text-balance text-3xl font-bold tracking-tight text-foreground sm:text-[2.7rem]">
                                    Let&apos;s bring your event <span className="text-gradient">to life</span>
                                </h1>
                                <p className="mx-auto max-w-lg text-balance text-base leading-7 text-muted-foreground">
                                    Tell me what you have in mind and I&apos;ll start the draft for you. Add a poster if you have one.
                                </p>
                            </div>
                        </motion.div>

                        {/* Composer */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.1 }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={cn(
                                    'group relative rounded-[1.75rem] border bg-card/95 shadow-xl shadow-black/[0.05] backdrop-blur transition-all',
                                    isDragging
                                        ? 'border-[var(--brand-teal)] ring-2 ring-[var(--brand-cyan)]/30'
                                        : 'border-border/70 focus-within:border-[var(--brand-teal)]/60 focus-within:ring-2 focus-within:ring-[var(--brand-cyan)]/15',
                                )}
                            >
                                {/* Attached poster thumbnail (lives inside the composer) */}
                                {uploadedFile && previewUrl ? (
                                    <div className="flex items-center gap-3 px-5 pt-5">
                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70">
                                            <Image
                                                src={previewUrl}
                                                alt={`Preview of ${uploadedFile.name}`}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveFile}
                                                aria-label={`Remove poster ${uploadedFile.name}`}
                                                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur transition hover:bg-foreground"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(uploadedFile.size)}</p>
                                        </div>
                                    </div>
                                ) : null}

                                <label htmlFor="ai-event-prompt" className="sr-only">
                                    Describe your event
                                </label>
                                <textarea
                                    id="ai-event-prompt"
                                    ref={textareaRef}
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.target.value.slice(0, maxLength))}
                                    onKeyDown={handlePromptKeyDown}
                                    rows={1}
                                    placeholder="Community iftar in Birmingham on 15 March at 6:30pm. Paid standard tickets, free child tickets, refund policy..."
                                    className="block max-h-[220px] min-h-[84px] w-full resize-none border-0 bg-transparent px-5 pb-2 pt-5 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground/60"
                                    disabled={isProcessing}
                                />

                                {/* Toolbar */}
                                <div className="flex items-center justify-between gap-2 px-3.5 pb-3.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)]/40 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                                        <span className="hidden sm:inline">{uploadedFile ? 'Change poster' : 'Add poster'}</span>
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs tabular-nums text-muted-foreground/70" aria-live="polite">
                                            {charCount}/{maxLength}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={!canSubmit}
                                            aria-label="Create draft"
                                            className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition',
                                                canSubmit
                                                    ? 'bg-gradient-to-br from-[var(--brand-mint)] via-[var(--brand-cyan)] to-[var(--brand-teal)] hover:opacity-90 hover:shadow-lg'
                                                    : 'cursor-not-allowed bg-muted text-muted-foreground/50 shadow-none',
                                            )}
                                        >
                                            <ArrowUp className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                {/* Drag overlay */}
                                {isDragging ? (
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[1.75rem] bg-[var(--brand-teal)]/8 backdrop-blur-sm">
                                        <ImagePlus className="h-7 w-7 text-[var(--brand-teal)]" aria-hidden="true" />
                                        <p className="text-sm font-semibold text-[var(--brand-teal)]">Drop your poster to attach it</p>
                                    </div>
                                ) : null}
                            </div>

                            <p className="mt-4 px-1 text-center text-xs text-muted-foreground/70">
                                PNG, JPEG, or WebP under 7.5MB · Press{' '}
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[0.7rem] font-medium">Enter</kbd> to create,{' '}
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[0.7rem] font-medium">Shift</kbd>+
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[0.7rem] font-medium">Enter</kbd> for a new line
                            </p>
                            <p className="mt-2.5 text-center text-sm font-semibold text-[var(--brand-cyan)]">
                                This is just a draft to get started. Every detail stays editable before you publish.
                            </p>
                        </motion.div>
                    </div>
                )}
            </main>
        </div>
    );
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Unexpected reader result type'));
            }
        };
        reader.onerror = () => {
            reject(reader.error ?? new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}
