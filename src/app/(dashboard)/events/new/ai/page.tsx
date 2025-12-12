'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowRight,
    ImageIcon,
    Loader2,
    Paperclip,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savePendingDraft } from '@/utils/pending-draft-storage';
import { generateEventDraft } from '@/lib/ai/event-draft';
import type { DraftEventInitial } from '@/hooks/useEventDraft';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';

const buildFallbackDraft = (titleHint?: string): DraftEventInitial => {
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
      date: '',
      endDate: '',
      isMultiDay: false,
      startTime: '',
      endTime: '',
      timezone: 'Europe/London',
      locationType: 'physical',
      venue: 'To be confirmed',
      address: '',
      city: '',
      onlineUrl: '',
    },
    tickets: [],
    promoCodes: [],
    currentStep: 1,
  };
};

export default function AIEventCreatorPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const [prompt, setPrompt] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const maxLength = 1000;
    const charCount = prompt.length;

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setUploadedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const { activeOrganizerId } = useOrganizers();

    const redirectToWizard = () => {
        if (activeOrganizerId) {
            router.push(`${buildDashboardPath(activeOrganizerId)}/events/create?source=ai`);
        } else {
            router.push('/events/create?source=ai');
        }
    };

    const handleSubmit = async () => {
        if (!prompt.trim() && !uploadedFile) return;

        setError(null);
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
                },
            });

            redirectToWizard();
        } catch (err) {
            console.error(err);

            const fallbackDraft = buildFallbackDraft(titleHint);
            if (bannerImageDataUrl) {
                fallbackDraft.formData = {
                    ...(fallbackDraft.formData ?? {}),
                    bannerImageDataUrl,
                };
            }

            savePendingDraft({
                source: 'ai',
                draft: fallbackDraft,
                meta: {
                    label: uploadedFile ? `AI from ${uploadedFile.name}` : 'AI draft (fallback)',
                    description:
                        'We could not reach the AI service, so we created a minimal draft. Please fill in the remaining details.',
                    key: `ai-fallback-${Date.now()}`,
                },
            });

            setError(
                'We had trouble contacting the AI service, so we handed you a minimal draft instead. Please review and fill in any missing details.',
            );

            redirectToWizard();
        } finally {
            setIsProcessing(false);
        }
    };

    const canSubmit = (prompt.trim().length > 0 || uploadedFile) && !isProcessing;

    return (
        <div className="min-h-screen gradient-mesh">
            {/* Back Button */}
            <div className="fixed top-6 left-6 z-10">
                <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-sm">
                    <Link href="/events/new">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl space-y-8 text-center"
                >
                    {/* Greeting */}
                    <div className="space-y-3">
                        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                            Salaam 👋{' '}
                            <span className="text-gradient">
                                What event shall we create?
                            </span>
                        </h1>
                    </div>

                    {/* Guidance Text */}
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                        Tell us a little about your event and upload the poster — AI will get to work for you
                    </p>

                    {/* Input Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={`relative rounded-2xl border bg-card shadow-lg transition-all ${isDragging ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value.slice(0, maxLength))}
                            placeholder="Describe your event... e.g., 'Community iftar in Birmingham on March 15th, expecting 200 guests, need VIP and standard tickets'"
                            className="w-full min-h-[140px] resize-none rounded-t-2xl border-0 bg-transparent px-5 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                            disabled={isProcessing}
                        />

                        {/* Uploaded File Preview */}
                        {uploadedFile && (
                            <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                                <ImageIcon className="h-4 w-4 text-primary" />
                                <span className="flex-1 truncate text-sm font-medium">{uploadedFile.name}</span>
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="rounded-full p-1 hover:bg-primary/10 transition-colors"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>
                        )}

                        {/* Bottom Bar */}
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="flex items-center gap-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 gap-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                >
                                    <Paperclip className="h-4 w-4" />
                                    <span className="hidden sm:inline">Add Attachment</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 gap-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                >
                                    <Upload className="h-4 w-4" />
                                    <span className="hidden sm:inline">Use Image</span>
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                    {charCount}/{maxLength}
                                </span>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    {/* AI Badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Powered by AI — your draft will be ready in seconds</span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                    <div className="text-center space-y-4">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-primary/20 mx-auto" />
                            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-display font-semibold text-lg">Creating your event draft...</p>
                            <p className="text-sm text-muted-foreground">AI is analyzing your input</p>
                        </div>
                    </div>
                </motion.div>
            )}
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
