'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useState } from 'react';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: '',
        agreed: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission logic here
        console.log('Form submitted:', formData);
        alert('Thank you for your message! We will get back to you soon.');
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden gradient-mesh -mt-[var(--nav-height)] pt-[calc(var(--nav-height)+4rem)] pb-12 md:pb-24">
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
                                <Input
                                    id="subject"
                                    className="glass-surface md:backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                    placeholder="Subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

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

                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="terms"
                                checked={formData.agreed}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, agreed: checked as boolean })
                                }
                                className="mt-0.5"
                                required
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                            >
                                I&apos;ve read and agree with{' '}
                                <Link href="/terms" className="underline hover:text-foreground">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="underline hover:text-foreground">
                                    Private Policy
                                </Link>
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl md:w-auto px-12 text-lg font-bold rounded-xl"
                            size="lg"
                        >
                            Submit
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
