'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Mail, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { getBackendErrorMessage } from '@/lib/api-errors';

const ACCEPTED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const SUBJECT_OPTIONS = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'sales', label: 'Sales & Pricing' },
    { value: 'partnerships', label: 'Partnerships & Collaborations' },
    { value: 'organizer', label: 'Become an Organiser' },
    { value: 'support', label: 'Technical Support' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'refunds', label: 'Refunds & Cancellations' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
    { value: 'other', label: 'Other' },
];

// Shared field treatment: crisp hairline border, soft white fill, and an
// on-brand teal focus ring, so every control in the form feels consistent.
const fieldClassName =
    'h-12 rounded-xl border-slate-200/80 bg-white/80 shadow-sm transition-[color,box-shadow,border-color] focus-visible:border-[var(--brand-teal)] focus-visible:ring-[var(--brand-teal)]/20 md:backdrop-blur-sm';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        customSubject: '',
        message: '',
        agreed: false,
    });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showOrganiserHint, setShowOrganiserHint] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);

    const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setSubmitError(null);

        if (!file) {
            setAttachment(null);
            return;
        }

        if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
            setAttachment(null);
            event.target.value = '';
            setSubmitError('Please attach a PNG, JPG, or PDF file.');
            return;
        }

        if (file.size > MAX_ATTACHMENT_BYTES) {
            setAttachment(null);
            event.target.value = '';
            setSubmitError('Attachment must be 10MB or smaller.');
            return;
        }

        setAttachment(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        if (!formData.subject) {
            setSubmitError('Please select a subject.');
            return;
        }

        if (formData.subject === 'other' && !formData.customSubject.trim()) {
            setSubmitError('Please enter a subject.');
            return;
        }

        if (!formData.agreed) {
            setSubmitError('Please agree to the Terms of Use and Privacy Policy.');
            return;
        }

        const subjectLabel = SUBJECT_OPTIONS.find(opt => opt.value === formData.subject)?.label || formData.subject;
        const subjectValue = formData.subject === 'other'
            ? formData.customSubject.trim()
            : subjectLabel;

        setIsSubmitting(true);

        try {
            const requestBody = new FormData();
            requestBody.set('firstName', formData.firstName);
            requestBody.set('lastName', formData.lastName);
            requestBody.set('email', formData.email);
            requestBody.set('subject', subjectValue);
            requestBody.set('message', formData.message);
            if (attachment) {
                requestBody.set('attachment', attachment);
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/contact`, {
                method: 'POST',
                body: requestBody,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(getBackendErrorMessage(errorData, 'Failed to send message'));
            }

            setIsSuccess(true);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                subject: '',
                customSubject: '',
                message: '',
                agreed: false,
            });
            setAttachment(null);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+2rem)] pb-12 md:pb-20">
            <AmbientBackground showNoise={false} />

            <div className="container relative z-10 my-auto w-full">
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-16">
                    {/* Left: message + guidance, sitting directly on the mesh */}
                    <div className="animate-fade-up max-w-md">
                        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                            Send us a{' '}
                            <span className="text-gradient">message</span>
                        </h1>
                        <p className="mt-5 text-lg text-muted-foreground md:text-xl">
                            Please fill in the form below to get in touch with us
                        </p>

                        <div className="mt-10 flex gap-4">
                            <div
                                aria-hidden="true"
                                className="w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[var(--brand-mint)] via-[var(--brand-cyan)] to-[var(--brand-teal)] opacity-60"
                            />
                            <div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Question about a specific event or booking, like a{' '}
                                    <span className="font-medium text-foreground">refund</span> or{' '}
                                    <span className="font-medium text-foreground">re-sending your tickets</span>? The event
                                    organiser handles those.{' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowOrganiserHint((value) => !value)}
                                        className="inline-flex items-center gap-0.5 font-medium text-[var(--brand-teal)] underline-offset-2 transition-colors hover:text-[var(--brand-cyan)] hover:underline"
                                        aria-expanded={showOrganiserHint}
                                    >
                                        How to reach them
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 transition-transform duration-300 ${showOrganiserHint ? 'rotate-180' : ''}`}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </p>

                                <AnimatePresence initial={false}>
                                    {showOrganiserHint && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{
                                                height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                                                opacity: { duration: 0.25, ease: 'easeOut' },
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-3 pt-3">
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    Use the <span className="inline-flex items-center gap-1 font-medium text-foreground"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Contact organiser</span> button
                                                    on the event page. Already booked? Their email is in your confirmation too, so you can write to them directly.
                                                </p>
                                                {/* A crisp, faithful recreation of the event-page card (a real
                                                    component preview) instead of a tiny embedded screenshot, so it
                                                    stays sharp at any size. Non-interactive and hidden from assistive
                                                    tech; the sr-only line below describes it. */}
                                                <figure className="space-y-2">
                                                    <figcaption className="text-xs font-medium text-muted-foreground/70">
                                                        Here&rsquo;s what to look for on the event page
                                                    </figcaption>
                                                    <div
                                                        aria-hidden="true"
                                                        className="pointer-events-none select-none rounded-2xl border border-primary/10 bg-primary/5 p-4"
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                    Contact organiser
                                                                </p>
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    Questions about this event? Send a message to the organiser.
                                                                </p>
                                                            </div>
                                                            <Button asChild className="shrink-0">
                                                                <span>
                                                                    <Mail className="mr-2 h-4 w-4" />
                                                                    Contact organiser
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <span className="sr-only">
                                                        This is an illustration of the Contact organiser button as it appears on an event page.
                                                    </span>
                                                </figure>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                    Something about the platform itself, or an issue you&rsquo;d like us to look into? Send it below.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: the form, as an elevated floating panel */}
                    <div className="animate-fade-up w-full max-w-[500px] justify-self-center rounded-3xl border border-white/60 p-7 ring-1 ring-white/50 glass-surface shadow-[0_2px_8px_-2px_oklch(0.65_0.12_190_/_0.15),0_24px_70px_-24px_oklch(0.65_0.12_190_/_0.4)] md:p-10 md:backdrop-blur-2xl lg:justify-self-end">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-muted-foreground">First name</Label>
                                    <Input
                                        id="firstName"
                                        className={fieldClassName}
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        minLength={2}
                                        maxLength={80}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-muted-foreground">Last name</Label>
                                    <Input
                                        id="lastName"
                                        className={fieldClassName}
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        minLength={2}
                                        maxLength={80}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className={fieldClassName}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    maxLength={254}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-muted-foreground">Subject</Label>
                                <Select
                                    value={formData.subject}
                                    onValueChange={(value) => setFormData({ ...formData, subject: value, customSubject: value !== 'other' ? '' : formData.customSubject })}
                                    required
                                >
                                    <SelectTrigger id="subject" className={`${fieldClassName} !h-12 w-full text-slate-700`}>
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUBJECT_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.subject === 'other' && (
                                <div className="space-y-2">
                                    <Label htmlFor="customSubject" className="text-muted-foreground">Please specify your subject</Label>
                                    <Input
                                        id="customSubject"
                                        className={fieldClassName}
                                        value={formData.customSubject}
                                        onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                                        minLength={5}
                                        maxLength={78}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                                    <span className="text-xs tabular-nums text-muted-foreground/60">
                                        {formData.message.length}/2000
                                    </span>
                                </div>
                                {/* Grows with the message up to a cap, then scrolls inside itself, so the
                                    panel and page never balloon as the user keeps typing. */}
                                <Textarea
                                    id="message"
                                    className="min-h-[150px] max-h-[300px] overflow-y-auto rounded-xl border-slate-200/80 bg-white/80 leading-relaxed shadow-sm transition-[color,box-shadow,border-color] focus-visible:border-[var(--brand-teal)] focus-visible:ring-[var(--brand-teal)]/20 md:backdrop-blur-sm"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    minLength={20}
                                    maxLength={2000}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="attachment" className="text-muted-foreground">Attachment</Label>
                                <div className="rounded-xl border border-dashed border-slate-300/90 bg-white/60 p-4 shadow-sm transition-colors focus-within:border-[var(--brand-teal)] focus-within:ring-2 focus-within:ring-[var(--brand-teal)]/20 md:backdrop-blur-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                <Paperclip className="h-4 w-4 text-[var(--brand-teal)]" aria-hidden="true" />
                                                {attachment ? (
                                                    <span className="truncate">{attachment.name}</span>
                                                ) : (
                                                    <span>Add an attachment</span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                PNG, JPG, or PDF. Max 10MB.
                                            </p>
                                        </div>

                                        {attachment ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="self-start text-muted-foreground hover:text-foreground sm:self-auto"
                                                onClick={() => setAttachment(null)}
                                            >
                                                <X className="h-4 w-4" aria-hidden="true" />
                                                Remove
                                            </Button>
                                        ) : (
                                            <Label
                                                htmlFor="attachment"
                                                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50"
                                            >
                                                Choose file
                                            </Label>
                                        )}
                                    </div>
                                    <Input
                                        key={attachment?.name ?? 'empty-attachment'}
                                        id="attachment"
                                        type="file"
                                        accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                                        className="sr-only"
                                        onChange={handleAttachmentChange}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white/60 p-3 shadow-sm md:backdrop-blur-sm md:p-4">
                                <Checkbox
                                    id="terms"
                                    checked={formData.agreed}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, agreed: checked as boolean })
                                    }
                                    className="mt-1 border-slate-400"
                                    required
                                />
                                <Label
                                    htmlFor="terms"
                                    className="block flex-1 cursor-pointer text-sm font-medium leading-relaxed text-muted-foreground"
                                >
                                    I agree to the{' '}
                                    <Link href="/terms" className="underline text-[var(--brand-teal)] hover:text-[var(--brand-cyan)]">
                                        Terms of Use
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="/privacy" className="underline text-[var(--brand-teal)] hover:text-[var(--brand-cyan)]">
                                        Privacy Policy
                                    </Link>
                                    <span className="ml-1 text-red-500">*</span>
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-base font-bold text-white shadow-lg shadow-[var(--brand-teal)]/20 transition-all hover:opacity-90 hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
                                size="lg"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Submit'}
                            </Button>
                            {submitError && (
                                <p className="text-sm text-destructive">{submitError}</p>
                            )}
                            {isSuccess && (
                                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                    <p className="text-sm font-medium text-green-800">
                                        ✓ Thank you for your message! We will get back to you soon.
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
