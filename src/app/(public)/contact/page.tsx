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
import { ChevronDown, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { getBackendErrorMessage } from '@/lib/api-errors';

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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    subject: subjectValue,
                    message: formData.message,
                }),
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
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+4rem)] pb-12 md:pb-24">
            <AmbientBackground showNoise={false} />

            <div className="container relative z-10 flex items-center justify-center">
                <div className="w-full max-w-2xl p-4 shadow-2xl md:p-12 glass-surface md:backdrop-blur-2xl border border-white/50 rounded-3xl ring-1 ring-white/60 animate-fade-up">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">Send us a message</h1>
                        <p className="text-muted-foreground">
                            Please fill in the form below to get in touch with us
                        </p>
                    </div>

                    <div
                        aria-hidden="true"
                        className="mb-7 h-px w-full bg-gradient-to-r from-transparent via-[var(--brand-teal)]/25 to-transparent"
                    />

                    <div className="mb-7 border-l-2 border-[var(--brand-teal)]/40 pl-4">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Question about a specific event or booking, like a{' '}
                            <span className="font-medium text-foreground">refund</span> or{' '}
                            <span className="font-medium text-foreground">re-sending your tickets</span>? The event
                            organiser handles those.{' '}
                            <button
                                type="button"
                                onClick={() => setShowOrganiserHint((value) => !value)}
                                className="inline-flex items-center gap-0.5 font-medium text-[var(--brand-teal)] underline-offset-2 hover:underline"
                                aria-expanded={showOrganiserHint}
                            >
                                How to reach them
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showOrganiserHint ? 'rotate-180' : ''}`}
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
                                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 pt-3">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Use the <span className="inline-flex items-center gap-1 font-medium text-foreground"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Contact organiser</span> button
                                            on the event page. Already booked? Their email is in your confirmation too, so you can write to them directly.
                                        </p>
                                        <div className="overflow-hidden rounded-xl border border-border/60">
                                            <Image
                                                src="/images/contact-organiser-button.png"
                                                alt="The Contact organiser button as it appears on an event page"
                                                width={1512}
                                                height={210}
                                                className="h-auto w-full"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            Something about the platform itself, or an issue you&rsquo;d like us to look into? Send it below.
                        </p>
                    </div>

                    <div
                        aria-hidden="true"
                        className="mb-7 h-px w-full bg-gradient-to-r from-transparent via-slate-300/80 to-transparent"
                    />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-muted-foreground">First name</Label>
                                <Input
                                    id="firstName"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all"
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
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    minLength={2}
                                    maxLength={80}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all"
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
                                    <SelectTrigger id="subject" className="glass-surface md:backdrop-blur-sm rounded-xl transition-all text-slate-700">
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
                        </div>

                        {formData.subject === 'other' && (
                            <div className="space-y-2">
                                <Label htmlFor="customSubject" className="text-muted-foreground">Please specify your subject</Label>
                                <Input
                                    id="customSubject"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all"
                                    value={formData.customSubject}
                                    onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                                    minLength={5}
                                    maxLength={78}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                            <Textarea
                                id="message"
                                className="glass-surface md:backdrop-blur-sm rounded-xl transition-all"
                                rows={6}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                minLength={20}
                                maxLength={2000}
                                required
                            />
                        </div>

                        <div className="flex items-start gap-3 p-3 md:p-4 glass-surface md:backdrop-blur-sm rounded-xl border border-white/30 overflow-hidden">
                            <Checkbox
                                id="terms"
                                checked={formData.agreed}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, agreed: checked as boolean })
                                }
                                className="border-slate-400 mt-1"
                                required
                            />
                            <Label
                                htmlFor="terms"
                                className="flex-1 block text-sm font-medium leading-relaxed cursor-pointer text-muted-foreground"
                            >
                                I agree to the{' '}
                                <Link href="/terms" className="underline text-[var(--brand-teal)] hover:text-[var(--brand-cyan)]">
                                    Terms of Use
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="underline text-[var(--brand-teal)] hover:text-[var(--brand-cyan)]">
                                    Privacy Policy
                                </Link>
                                <span className="text-red-500 ml-1">*</span>
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl md:w-auto px-12 text-lg font-bold rounded-xl disabled:opacity-50"
                            size="lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Submit'}
                        </Button>
                        {submitError && (
                            <p className="text-sm text-destructive">{submitError}</p>
                        )}
                        {isSuccess && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-sm text-green-800 font-medium">
                                    ✓ Thank you for your message! We will get back to you soon.
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
