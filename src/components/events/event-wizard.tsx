'use client';

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
    Tag,
    Percent,
    Eye,
    EyeOff,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useEventDraft, type DraftEventInitial, type DraftPromoCode } from '@/hooks/useEventDraft';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';

export const steps = [
    { id: 1, title: 'Basic Details', description: 'Title, description & image', icon: Sparkles },
    { id: 2, title: 'Location & Time', description: 'When and where', icon: MapPin },
    { id: 3, title: 'Tickets', description: 'Pricing & availability', icon: Ticket },
];

export type EntryContext = {
    label: string;
    description?: string;
};

export function EventWizard({
    mode = 'create',
    initialDraft,
    entryContext,
}: {
    mode?: 'create' | 'edit';
    initialDraft?: DraftEventInitial;
    entryContext?: EntryContext;
}) {
    const {
        currentStep,
        setCurrentStep,
        formData,
        setFormData,
        handleInputChange,
        tickets,
        updateTicket,
        addTicket,
        removeTicket,
        promoCodes,
        addPromoCode,
        updatePromoCode,
        removePromoCode,
        nextStep,
        prevStep,
        progressPercentage,
        isPreviewOpen,
        setIsPreviewOpen,
    } = useEventDraft(initialDraft, steps.length);

    const headerTitle = mode === 'edit' ? 'Edit Event' : 'Create New Event';
    const { activeOrganizerId } = useOrganizers();
    const dashboardHref = activeOrganizerId ? buildDashboardPath(activeOrganizerId) : '/dashboard';

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Top Header with Progress Bar */}
            <div className="sticky top-0 z-40 bg-background border-b">
                {/* Header Row */}
                <div className="container flex h-14 items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={dashboardHref}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-lg font-semibold truncate">
                                {headerTitle}
                            </h1>
                            {entryContext?.label ? (
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                    {entryContext.label}
                                </Badge>
                            ) : null}
                        </div>
                        {entryContext?.description ? (
                            <p className="hidden text-sm text-muted-foreground sm:block">
                                {entryContext.description}
                            </p>
                        ) : null}
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
                            <div className="pt-6 space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-center gap-2 text-base font-medium border-2"
                                    onClick={() => setIsPreviewOpen(true)}
                                >
                                    <Eye className="h-5 w-5" />
                                    Preview Event
                                </Button>
                                <Button className="w-full h-11 justify-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {mode === 'edit' ? 'Save Changes' : 'Publish Event'}
                                </Button>
                                <Button variant="ghost" className="w-full justify-center text-muted-foreground">
                                    {mode === 'edit' ? 'Update Draft' : 'Save Draft'}
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
                                                    <div className="relative flex h-40 sm:h-48 lg:h-56 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary/50 hover:bg-muted/50 group overflow-hidden">
                                                        {formData.bannerImageDataUrl ? (
                                                            <img
                                                                src={formData.bannerImageDataUrl}
                                                                alt={formData.title || 'Event banner'}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="text-center px-4">
                                                                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                                                    <Upload className="h-5 w-5" />
                                                                </div>
                                                                <p className="font-medium text-sm sm:text-base">Click to upload</p>
                                                                <p className="mt-1 text-xs text-muted-foreground">16:9 recommended</p>
                                                            </div>
                                                        )}
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
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Calendar className="h-5 w-5" />
                                                        <h3 className="font-semibold">Date & Time</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="multiday" className="text-sm text-muted-foreground">Multi-day event</Label>
                                                        <Switch
                                                            id="multiday"
                                                            checked={formData.isMultiDay}
                                                            onCheckedChange={(checked) => setFormData({ ...formData, isMultiDay: checked })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Date Selection */}
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">{formData.isMultiDay ? 'Start Date *' : 'Date *'}</Label>
                                                        <Input
                                                            id="date"
                                                            name="date"
                                                            type="date"
                                                            value={formData.date}
                                                            onChange={handleInputChange}
                                                            className="h-12"
                                                        />
                                                    </div>
                                                    {formData.isMultiDay && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="endDate">End Date *</Label>
                                                            <Input
                                                                id="endDate"
                                                                name="endDate"
                                                                type="date"
                                                                value={formData.endDate}
                                                                onChange={handleInputChange}
                                                                className="h-12"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Time Selection */}
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="startTime">Start Time *</Label>
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
                                                        <Label htmlFor="endTime">End Time</Label>
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

                                                {/* Timezone */}
                                                <div className="space-y-2">
                                                    <Label>Timezone</Label>
                                                    <Select
                                                        value={formData.timezone}
                                                        onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                                                    >
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Select timezone" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Europe/London">🇬🇧 London (GMT/BST)</SelectItem>
                                                            <SelectItem value="Europe/Paris">🇫🇷 Paris (CET)</SelectItem>
                                                            <SelectItem value="Europe/Berlin">🇩🇪 Berlin (CET)</SelectItem>
                                                            <SelectItem value="America/New_York">🇺🇸 New York (EST)</SelectItem>
                                                            <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (PST)</SelectItem>
                                                            <SelectItem value="Asia/Dubai">🇦🇪 Dubai (GST)</SelectItem>
                                                            <SelectItem value="Asia/Riyadh">🇸🇦 Riyadh (AST)</SelectItem>
                                                            <SelectItem value="Asia/Karachi">🇵🇰 Karachi (PKT)</SelectItem>
                                                            <SelectItem value="Asia/Kuala_Lumpur">🇲🇾 Kuala Lumpur (MYT)</SelectItem>
                                                            <SelectItem value="Australia/Sydney">🇦🇺 Sydney (AEDT)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
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
                                                                {ticket.visibility === 'hidden' && (
                                                                    <Badge variant="secondary" className="text-xs">Hidden</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => updateTicket(ticket.id, 'visibility', ticket.visibility === 'public' ? 'hidden' : 'public')}
                                                                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                                                                    title={ticket.visibility === 'public' ? 'Hide ticket' : 'Show ticket'}
                                                                >
                                                                    {ticket.visibility === 'public' ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                                                </button>
                                                                {tickets.length > 1 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeTicket(ticket.id)}
                                                                        className="text-destructive hover:text-destructive h-8 w-8"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-5">
                                                            {/* Name and Price */}
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
                                                                    <div className="flex items-center justify-between">
                                                                        <Label>Price (£)</Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <Label htmlFor={`free-${ticket.id}`} className="text-sm text-muted-foreground">Free</Label>
                                                                            <Switch
                                                                                id={`free-${ticket.id}`}
                                                                                checked={ticket.isFree}
                                                                                onCheckedChange={(checked) => {
                                                                                    updateTicket(ticket.id, 'isFree', checked);
                                                                                    if (checked) updateTicket(ticket.id, 'price', '0');
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0.00"
                                                                        value={ticket.price}
                                                                        onChange={(e) => updateTicket(ticket.id, 'price', e.target.value)}
                                                                        className="h-12"
                                                                        disabled={ticket.isFree}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Quantity and Max Per Order */}
                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>Total Quantity</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-12 w-12 shrink-0"
                                                                            onClick={() => updateTicket(ticket.id, 'quantity', Math.max(1, ticket.quantity - 10))}
                                                                        >
                                                                            <Minus className="h-4 w-4" />
                                                                        </Button>
                                                                        <Input
                                                                            type="number"
                                                                            value={ticket.quantity}
                                                                            onChange={(e) => updateTicket(ticket.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                            className="h-12 text-center font-semibold"
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-12 w-12 shrink-0"
                                                                            onClick={() => updateTicket(ticket.id, 'quantity', ticket.quantity + 10)}
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Max Per Order</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={ticket.maxPerOrder}
                                                                        onChange={(e) => updateTicket(ticket.id, 'maxPerOrder', parseInt(e.target.value) || 1)}
                                                                        className="h-12"
                                                                        min={1}
                                                                        max={ticket.quantity}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Early Bird Toggle */}
                                                            <div className="border rounded-xl p-4 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                                                        <Label className="font-medium">Early Bird Pricing</Label>
                                                                    </div>
                                                                    <Switch
                                                                        checked={ticket.hasEarlyBird}
                                                                        onCheckedChange={(checked) => updateTicket(ticket.id, 'hasEarlyBird', checked)}
                                                                    />
                                                                </div>
                                                                {ticket.hasEarlyBird && (
                                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm">Early Bird Price (£)</Label>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Discounted price"
                                                                                value={ticket.earlyBirdPrice}
                                                                                onChange={(e) => updateTicket(ticket.id, 'earlyBirdPrice', e.target.value)}
                                                                                className="h-10"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm">Ends On</Label>
                                                                            <Input
                                                                                type="date"
                                                                                value={ticket.earlyBirdEndDate}
                                                                                onChange={(e) => updateTicket(ticket.id, 'earlyBirdEndDate', e.target.value)}
                                                                                className="h-10"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
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

                                        {/* Promo Codes Section */}
                                        <Card className="mt-6">
                                            <CardContent className="p-4 sm:p-6 lg:p-8">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Tag className="h-5 w-5" />
                                                        <h3 className="font-semibold">Promo Codes</h3>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={addPromoCode}>
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        Add Code
                                                    </Button>
                                                </div>

                                                {promoCodes.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">No promo codes yet</p>
                                                        <p className="text-xs">Add a code to offer discounts</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {promoCodes.map((promo) => (
                                                            <div key={promo.id} className="border rounded-xl p-4 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <Input
                                                                        placeholder="CODE2024"
                                                                        value={promo.code}
                                                                        onChange={(e) => updatePromoCode(promo.id, 'code', e.target.value.toUpperCase())}
                                                                        className="h-10 w-40 font-mono uppercase"
                                                                    />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removePromoCode(promo.id)}
                                                                        className="text-destructive hover:text-destructive h-8 w-8"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="grid gap-4 sm:grid-cols-3">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm">Discount Type</Label>
                                                                        <Select
                                                                            value={promo.discountType}
                                                                    onValueChange={(val: DraftPromoCode['discountType']) => updatePromoCode(promo.id, 'discountType', val)}
                                                                        >
                                                                            <SelectTrigger className="h-10">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                                                <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm">Discount Value</Label>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="10"
                                                                                value={promo.discountValue}
                                                                                onChange={(e) => updatePromoCode(promo.id, 'discountValue', e.target.value)}
                                                                                className="h-10 pr-8"
                                                                            />
                                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                                                {promo.discountType === 'percentage' ? '%' : '£'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm">Usage Limit</Label>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="100"
                                                                            value={promo.usageLimit}
                                                                            onChange={(e) => updatePromoCode(promo.id, 'usageLimit', parseInt(e.target.value) || 0)}
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid gap-4 sm:grid-cols-2">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm">Valid From</Label>
                                                                        <Input
                                                                            type="date"
                                                                            value={promo.validFrom}
                                                                            onChange={(e) => updatePromoCode(promo.id, 'validFrom', e.target.value)}
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm">Valid Until</Label>
                                                                        <Input
                                                                            type="date"
                                                                            value={promo.validUntil}
                                                                            onChange={(e) => updatePromoCode(promo.id, 'validUntil', e.target.value)}
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}</CardContent>
                                        </Card>
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

            {/* Event Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Event Preview</DialogTitle>
                    </DialogHeader>

                    <div className="p-6 pt-4">
                        {/* Event Banner */}
                        <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 border overflow-hidden">
                            {formData.bannerImageDataUrl ? (
                                <img
                                    src={formData.bannerImageDataUrl}
                                    alt={formData.title || 'Event banner'}
                                    className="h-full w-full object-cover"
                                />
                            ) : formData.title ? (
                                <div className="text-center p-8">
                                    <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                                        {formData.title}
                                    </h1>
                                    {formData.category && (
                                        <Badge className="mb-2">{formData.category}</Badge>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Upload className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Event banner will appear here</p>
                                </div>
                            )}
                        </div>

                        {/* Event Details */}
                        <div className="space-y-6">
                            {/* Title & Description */}
                            <div>
                                <h2 className="font-display text-xl font-bold mb-2">
                                    {formData.title || 'Event Title'}
                                </h2>
                                <p className="text-muted-foreground">
                                    {formData.description || 'Event description will appear here...'}
                                </p>
                            </div>

                            <Separator />

                            {/* Date & Time */}
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">
                                        {formData.date
                                            ? new Date(formData.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'Date not set'
                                        }
                                        {formData.isMultiDay && formData.endDate && (
                                            <> - {new Date(formData.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</>
                                        )}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formData.startTime || '--:--'} - {formData.endTime || '--:--'}
                                        {formData.timezone && ` (${formData.timezone.split('/')[1]})`}
                                    </p>
                                </div>
                            </div>

                            {/* Location */}
                            {(formData.locationType === 'physical' || formData.locationType === 'hybrid') && (
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{formData.venue || 'Venue name'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formData.address && `${formData.address}, `}
                                            {formData.city || 'City'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(formData.locationType === 'online' || formData.locationType === 'hybrid') && (
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Globe className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Online Event</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formData.onlineUrl || 'Link will be shared after registration'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Tickets Preview */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Ticket className="h-4 w-4" />
                                    Available Tickets
                                </h3>
                                <div className="space-y-2">
                                    {tickets.filter(t => t.visibility === 'public').map(ticket => (
                                        <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                                            <div>
                                                <p className="font-medium">{ticket.name || 'Ticket Name'}</p>
                                                <p className="text-xs text-muted-foreground">{ticket.quantity} available</p>
                                            </div>
                                            <div className="text-right">
                                                {ticket.isFree ? (
                                                    <Badge variant="secondary">Free</Badge>
                                                ) : (
                                                    <p className="font-bold">£{ticket.price || '0'}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {tickets.filter(t => t.visibility === 'public').length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No public tickets to display
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Organizer */}
                            {formData.organizerName && (
                                <>
                                    <Separator />
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="font-bold text-primary">
                                                {formData.organizerName.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Organized by</p>
                                            <p className="font-medium">{formData.organizerName}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <Button onClick={() => setIsPreviewOpen(false)}>
                                Close Preview
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
}
