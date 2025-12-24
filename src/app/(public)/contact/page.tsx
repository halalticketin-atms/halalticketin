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
import Link from 'next/link';
import { useState } from 'react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

const SUBJECT_OPTIONS = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'sales', label: 'Sales & Pricing' },
    { value: 'partnerships', label: 'Partnerships & Collaborations' },
    { value: 'organizer', label: 'Become an Organizer' },
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

    const handleSubmit = (e: React.FormEvent) => {
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

        const subjectValue = formData.subject === 'other'
            ? formData.customSubject.trim()
            : formData.subject;

        // Handle form submission logic here
        console.log('Form submitted:', { ...formData, subject: subjectValue });
        alert('Thank you for your message! We will get back to you soon.');
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+4rem)] pb-12 md:pb-24">
            <AmbientBackground showNoise={false} />

            <div className="container relative z-10 flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 shadow-2xl md:p-12 glass-surface md:backdrop-blur-2xl border border-white/50 rounded-3xl ring-1 ring-white/60 animate-fade-up">
                    <div className="mb-8">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">Send us a message</h1>
                        <p className="text-muted-foreground">
                            Please fill in the form below to get in touch with us
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-muted-foreground">First name</Label>
                                <Input
                                    id="firstName"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                    placeholder="First name"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-muted-foreground">Last name</Label>
                                <Input
                                    id="lastName"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                    placeholder="Last name"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                    placeholder="Enter your subject"
                                    value={formData.customSubject}
                                    onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                            <Textarea
                                id="message"
                                className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                placeholder="Message"
                                rows={6}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex items-center gap-3 p-4 glass-surface md:backdrop-blur-sm rounded-xl border border-white/30">
                            <Checkbox
                                id="terms"
                                checked={formData.agreed}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, agreed: checked as boolean })
                                }
                                className="border-slate-400"
                                required
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none cursor-pointer text-muted-foreground whitespace-nowrap"
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
                            className="w-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl md:w-auto px-12 text-lg font-bold rounded-xl"
                            size="lg"
                        >
                            Submit
                        </Button>
                        {submitError && (
                            <p className="text-sm text-destructive">{submitError}</p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
