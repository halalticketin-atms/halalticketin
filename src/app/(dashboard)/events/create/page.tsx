'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Clock,
    Upload,
    Ticket,
    Users,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Plus,
    Minus,
    Globe,
    Building,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
    { id: 1, title: 'Basic Details', description: 'Title, description & image', icon: Sparkles },
    { id: 2, title: 'Location & Time', description: 'When and where', icon: MapPin },
    { id: 3, title: 'Tickets', description: 'Pricing & availability', icon: Ticket },
];

interface TicketType {
    id: string;
    name: string;
    price: string;
    quantity: number;
    description: string;
}

export default function CreateEventPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        organizerName: '',
        date: '',
        startTime: '',
        endTime: '',
        locationType: 'physical' as 'physical' | 'online' | 'hybrid',
        venue: '',
        address: '',
        city: '',
        onlineUrl: '',
    });

    const [tickets, setTickets] = useState<TicketType[]>([
        { id: '1', name: 'General Admission', price: '', quantity: 100, description: '' },
    ]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const updateTicket = (id: string, field: keyof TicketType, value: string | number) => {
        setTickets(tickets.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const addTicket = () => {
        setTickets([...tickets, {
            id: String(Date.now()),
            name: '',
            price: '',
            quantity: 50,
            description: '',
        }]);
    };

    const removeTicket = (id: string) => {
        if (tickets.length > 1) {
            setTickets(tickets.filter(t => t.id !== id));
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Top Header with Progress Bar */}
            <div className="sticky top-0 z-40 bg-background border-b">
                {/* Header Row */}
                <div className="container flex h-14 items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-lg font-semibold truncate">Create New Event</h1>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        Step {currentStep} of {steps.length}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-muted">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Mobile Step Indicator */}
            <div className="lg:hidden border-b bg-background">
                <div className="container py-3">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className="flex flex-col items-center gap-1"
                            >
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${currentStep === step.id
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > step.id
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                                </div>
                                <span className={`text-xs ${currentStep === step.id ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                    {step.title.split(' ')[0]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="container py-6 lg:py-10">
                <div className="flex gap-6 lg:gap-10 xl:gap-16">
                    {/* Sidebar Navigation - Desktop Only */}
                    <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
                        <div className="sticky top-24 space-y-3">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`w-full flex items-start gap-3 rounded-xl p-4 text-left transition-all ${currentStep === step.id
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : currentStep > step.id
                                            ? 'bg-primary/10 hover:bg-primary/15'
                                            : 'bg-card hover:bg-muted'
                                        }`}
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${currentStep === step.id
                                            ? 'bg-primary-foreground/20'
                                            : currentStep > step.id
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-muted'
                                            }`}
                                    >
                                        {currentStep > step.id ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <step.icon className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium">{step.title}</p>
                                        <p className={`text-sm truncate ${currentStep === step.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                </button>
                            ))}

                            {/* Quick Actions */}
                            <div className="pt-6 space-y-2">
                                <Button variant="outline" className="w-full justify-start">
                                    Save Draft
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0">
                            <AnimatePresence mode="wait">
                                {/* Step 1: Basic Details */}
                                {currentStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6 lg:space-y-8"
                                    >
                                        <div>
                                            <h2 className="font-display text-2xl lg:text-3xl font-bold">Tell us about your event</h2>
                                            <p className="mt-1 lg:mt-2 text-muted-foreground">Start with the basics - you can always edit later</p>
                                        </div>

                                        <Card>
                                            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
                                                {/* Event Title */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="title" className="text-base font-medium">Event Title *</Label>
                                                    <Input
                                                        id="title"
                                                        name="title"
                                                        placeholder="Give your event a catchy name"
                                                        value={formData.title}
                                                        onChange={handleInputChange}
                                                        className="h-12 text-base"
                                                    />
                                                </div>

                                                {/* Description */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="description" className="text-base font-medium">Description</Label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        placeholder="What's your event about?"
                                                        value={formData.description}
                                                        onChange={handleInputChange}
                                                        rows={4}
                                                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-base font-medium">Event Banner</Label>
                                                    <div className="relative flex h-40 sm:h-48 lg:h-56 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary/50 hover:bg-muted/50 group">
                                                        <div className="text-center px-4">
                                                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                                                <Upload className="h-5 w-5" />
                                                            </div>
                                                            <p className="font-medium text-sm sm:text-base">Click to upload</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">16:9 recommended</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Category */}
                                                <div className="space-y-3">
                                                    <Label className="text-base font-medium">Category</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Conference', 'Workshop', 'Iftar', 'Sisters', 'Youth', 'Charity'].map((cat) => (
                                                            <Badge
                                                                key={cat}
                                                                variant={formData.category === cat ? 'default' : 'outline'}
                                                                className="cursor-pointer px-3 py-1.5 text-sm"
                                                                onClick={() => setFormData({ ...formData, category: cat })}
                                                            >
                                                                {cat}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Organizer */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="organizerName" className="text-base font-medium">Organizer Name</Label>
                                                    <Input
                                                        id="organizerName"
                                                        name="organizerName"
                                                        placeholder="Who is hosting this event?"
                                                        value={formData.organizerName}
                                                        onChange={handleInputChange}
                                                        className="h-12 text-base"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 2: Location & Time */}
                                {currentStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6 lg:space-y-8"
                                    >
                                        <div>
                                            <h2 className="font-display text-2xl lg:text-3xl font-bold">When and where?</h2>
                                            <p className="mt-1 lg:mt-2 text-muted-foreground">Help attendees find your event</p>
                                        </div>

                                        {/* Date & Time Card */}
                                        <Card>
                                            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Calendar className="h-5 w-5" />
                                                    <h3 className="font-semibold">Date & Time</h3>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">Date *</Label>
                                                        <Input
                                                            id="date"
                                                            name="date"
                                                            type="date"
                                                            value={formData.date}
                                                            onChange={handleInputChange}
                                                            className="h-12"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="startTime">Start *</Label>
                                                        <Input
                                                            id="startTime"
                                                            name="startTime"
                                                            type="time"
                                                            value={formData.startTime}
                                                            onChange={handleInputChange}
                                                            className="h-12"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="endTime">End</Label>
                                                        <Input
                                                            id="endTime"
                                                            name="endTime"
                                                            type="time"
                                                            value={formData.endTime}
                                                            onChange={handleInputChange}
                                                            className="h-12"
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Location Card */}
                                        <Card>
                                            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
                                                <div className="flex items-center gap-2 text-primary">
                                                    <MapPin className="h-5 w-5" />
                                                    <h3 className="font-semibold">Location</h3>
                                                </div>

                                                {/* Location Type Selector */}
                                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                                    {[
                                                        { value: 'physical', label: 'In Person', icon: Building },
                                                        { value: 'online', label: 'Online', icon: Globe },
                                                        { value: 'hybrid', label: 'Hybrid', icon: Users },
                                                    ].map((type) => (
                                                        <button
                                                            key={type.value}
                                                            onClick={() => setFormData({ ...formData, locationType: type.value as typeof formData.locationType })}
                                                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 sm:p-4 transition-all ${formData.locationType === type.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:border-primary/50'
                                                                }`}
                                                        >
                                                            <type.icon className={`h-5 w-5 ${formData.locationType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                                            <span className={`text-xs sm:text-sm font-medium ${formData.locationType === type.value ? 'text-primary' : ''}`}>
                                                                {type.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Physical Location Fields */}
                                                {(formData.locationType === 'physical' || formData.locationType === 'hybrid') && (
                                                    <div className="space-y-4 pt-2">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="venue">Venue Name *</Label>
                                                            <Input
                                                                id="venue"
                                                                name="venue"
                                                                placeholder="e.g., London Central Mosque"
                                                                value={formData.venue}
                                                                onChange={handleInputChange}
                                                                className="h-12"
                                                            />
                                                        </div>
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="address">Address</Label>
                                                                <Input
                                                                    id="address"
                                                                    name="address"
                                                                    placeholder="Street address"
                                                                    value={formData.address}
                                                                    onChange={handleInputChange}
                                                                    className="h-12"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="city">City</Label>
                                                                <Input
                                                                    id="city"
                                                                    name="city"
                                                                    placeholder="City"
                                                                    value={formData.city}
                                                                    onChange={handleInputChange}
                                                                    className="h-12"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Map Placeholder */}
                                                        <div className="h-32 sm:h-40 rounded-xl bg-muted flex items-center justify-center border">
                                                            <div className="text-center text-muted-foreground">
                                                                <MapPin className="h-6 w-6 mx-auto mb-1" />
                                                                <p className="text-xs sm:text-sm">Map preview</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Online URL */}
                                                {(formData.locationType === 'online' || formData.locationType === 'hybrid') && (
                                                    <div className="space-y-2 pt-2">
                                                        <Label htmlFor="onlineUrl">Event Link</Label>
                                                        <Input
                                                            id="onlineUrl"
                                                            name="onlineUrl"
                                                            placeholder="https://zoom.us/j/..."
                                                            value={formData.onlineUrl}
                                                            onChange={handleInputChange}
                                                            className="h-12"
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 3: Tickets */}
                                {currentStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6 lg:space-y-8"
                                    >
                                        <div>
                                            <h2 className="font-display text-2xl lg:text-3xl font-bold">Set up your tickets</h2>
                                            <p className="mt-1 lg:mt-2 text-muted-foreground">Create one or more ticket types</p>
                                        </div>

                                        {/* Ticket Cards */}
                                        <div className="space-y-4">
                                            {tickets.map((ticket, index) => (
                                                <Card key={ticket.id}>
                                                    <CardContent className="p-4 sm:p-6 lg:p-8">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2 text-primary">
                                                                <Ticket className="h-5 w-5" />
                                                                <h3 className="font-semibold">Ticket {index + 1}</h3>
                                                            </div>
                                                            {tickets.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeTicket(ticket.id)}
                                                                    className="text-destructive hover:text-destructive h-8"
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>Ticket Name *</Label>
                                                                    <Input
                                                                        placeholder="e.g., General Admission"
                                                                        value={ticket.name}
                                                                        onChange={(e) => updateTicket(ticket.id, 'name', e.target.value)}
                                                                        className="h-12"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Price (£)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0 = free"
                                                                        value={ticket.price}
                                                                        onChange={(e) => updateTicket(ticket.id, 'price', e.target.value)}
                                                                        className="h-12"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Quantity Control */}
                                                            <div className="space-y-2">
                                                                <Label>Quantity</Label>
                                                                <div className="flex items-center gap-3">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-12 w-12"
                                                                        onClick={() => updateTicket(ticket.id, 'quantity', Math.max(1, ticket.quantity - 10))}
                                                                    >
                                                                        <Minus className="h-4 w-4" />
                                                                    </Button>
                                                                    <Input
                                                                        type="number"
                                                                        value={ticket.quantity}
                                                                        onChange={(e) => updateTicket(ticket.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        className="h-12 text-center text-lg font-semibold flex-1"
                                                                    />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-12 w-12"
                                                                        onClick={() => updateTicket(ticket.id, 'quantity', ticket.quantity + 10)}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Add Ticket Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 border-dashed"
                                            onClick={addTicket}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Another Ticket
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation Footer */}
                            <div className="mt-8 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Back</span>
                                </Button>

                                <div className="flex gap-2 sm:gap-3">
                                    <Button variant="outline" className="lg:hidden">
                                        Save
                                    </Button>
                                    {currentStep < steps.length ? (
                                        <Button onClick={nextStep} className="gap-2 px-4 sm:px-6">
                                            Continue
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button className="gap-2 px-4 sm:px-6">
                                            <Sparkles className="h-4 w-4" />
                                            <span className="hidden sm:inline">Publish</span>
                                            <span className="sm:hidden">Create</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
