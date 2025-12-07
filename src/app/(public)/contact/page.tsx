'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useState } from 'react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
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
        <div className="min-h-[calc(100vh-4rem)] w-full bg-teal-50/30 py-12 md:py-24">
            <div className="container flex items-center justify-center">
                <div className="gradient-card-bg w-full max-w-2xl p-8 shadow-2xl md:p-12">
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
                                    className="input-teal-border"
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
                                    className="input-teal-border"
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
                                    className="input-teal-border"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-muted-foreground">Phone number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    className="input-teal-border"
                                    placeholder="Phone number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                            <Textarea
                                id="message"
                                className="input-teal-border"
                                placeholder="Message"
                                rows={6}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="terms"
                                checked={formData.agreed}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, agreed: checked as boolean })
                                }
                                required
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
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
                            className="input-teal-border w-full bg-white text-foreground hover:bg-teal-50 md:w-auto px-12 text-lg font-medium"
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
