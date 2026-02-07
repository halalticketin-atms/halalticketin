'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    Eye,
    Loader2,
    Mail,
    Send,
    Tag,
    Upload,
    Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useOrganizers } from '@/context/organizer-context';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import {
    addContactsToEmailMarketingGroup,
    createEmailMarketingCampaign,
    createEmailMarketingGroup,
    estimateEmailMarketingRecipients,
    fetchEmailMarketingContacts,
    fetchEmailMarketingGroups,
    importEmailMarketingContactsCsv,
    sendEmailMarketingCampaign,
    type EmailMarketingContact,
    type EmailMarketingGroup,
} from '@/lib/email-marketing-api';
import { createStampPurchaseSession, getStampBalance } from '@/lib/stamps-api';
import {
    CHARITY_CREDIT_DISCOUNT_RATE,
    MAX_STAMPS,
    MIN_STAMPS,
    applyCharityCreditDiscount,
    calculateStampPrice,
} from '@/lib/fees';
import { toast } from '@/lib/notifications';
import { buildDashboardPath } from '@/lib/organizer-path';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'recipients' | 'name' | 'message' | 'preview' | 'send';

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'recipients', label: 'Recipients', icon: Users },
    { id: 'name', label: 'Name', icon: Tag },
    { id: 'message', label: 'Message', icon: Mail },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'send', label: 'Send', icon: Send },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CsvPreview = {
    rows: number;
    uniqueValid: number;
    invalid: number;
    duplicates: number;
};

type RecipientMode = 'existing' | 'import';

// ─────────────────────────────────────────────────────────────────────────────
// CSV Utilities
// ─────────────────────────────────────────────────────────────────────────────

const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    cells.push(current.trim());
    return cells;
};

const buildCsvPreview = (csvText: string): CsvPreview => {
    const lines = csvText
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return { rows: 0, uniqueValid: 0, invalid: 0, duplicates: 0 };
    }

    const firstRow = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase().trim());
    const emailHeaderIndex = firstRow.findIndex((cell) =>
        ['email', 'email address', 'e-mail', 'e-mail address'].includes(cell)
    );
    const hasHeader = emailHeaderIndex >= 0;
    const startRow = hasHeader ? 1 : 0;
    const resolvedEmailIndex = emailHeaderIndex >= 0 ? emailHeaderIndex : 0;

    const deduped = new Set<string>();
    let invalid = 0;
    let duplicates = 0;

    for (let i = startRow; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const emailRaw = (row[resolvedEmailIndex] ?? row[0] ?? '').trim();
        if (!emailRaw) continue;

        const normalized = emailRaw.toLowerCase();
        if (!EMAIL_REGEX.test(normalized)) {
            invalid += 1;
            continue;
        }
        if (deduped.has(normalized)) {
            duplicates += 1;
            continue;
        }
        deduped.add(normalized);
    }

    return {
        rows: Math.max(0, lines.length - startRow),
        uniqueValid: deduped.size,
        invalid,
        duplicates,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Step Indicator Component
// ─────────────────────────────────────────────────────────────────────────────

interface StepIndicatorProps {
    steps: typeof STEPS;
    currentStep: Step;
    completedSteps: Set<Step>;
    onStepClick: (step: Step) => void;
}

function StepIndicator({ steps, currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    return (
        <div className="flex items-center justify-center gap-0 w-full max-w-3xl mx-auto">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isCurrent = step.id === currentStep;
                const isPast = index < currentIndex;
                const isClickable = isCompleted || isPast;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <button
                            onClick={() => isClickable && onStepClick(step.id)}
                            disabled={!isClickable}
                            className={cn(
                                'relative flex flex-col items-center gap-2 group transition-all duration-300',
                                isClickable && 'cursor-pointer',
                                !isClickable && 'cursor-default'
                            )}
                        >
                            <motion.div
                                className={cn(
                                    'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm',
                                    isCurrent &&
                                    'bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white shadow-lg scale-110',
                                    isCompleted && !isCurrent && 'bg-emerald-500 text-white',
                                    !isCurrent &&
                                    !isCompleted &&
                                    'bg-muted/60 text-muted-foreground border-2 border-dashed border-border/60'
                                )}
                                whileHover={isClickable ? { scale: 1.05 } : undefined}
                                whileTap={isClickable ? { scale: 0.95 } : undefined}
                            >
                                {isCompleted && !isCurrent ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                            </motion.div>
                            <span
                                className={cn(
                                    'text-xs font-medium transition-colors whitespace-nowrap hidden sm:block',
                                    isCurrent && 'text-foreground',
                                    isCompleted && !isCurrent && 'text-emerald-600',
                                    !isCurrent && !isCompleted && 'text-muted-foreground'
                                )}
                            >
                                {step.label}
                            </span>
                        </button>

                        {index < steps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-2 sm:mx-3 relative">
                                <div className="absolute inset-0 bg-border/40 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: isCompleted || isPast ? 1 : 0 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview Component
// ─────────────────────────────────────────────────────────────────────────────

function LiveEmailPreview({
    subject,
    message,
    recipientCount,
}: {
    subject: string;
    message: string;
    recipientCount: number;
}) {
    return (
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-xl p-6 space-y-6 sticky top-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-display font-semibold">Live Preview</h3>
                    <p className="text-xs text-muted-foreground">See how recipients will view this email</p>
                </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-border/40 p-4 bg-muted/30">
                    <h2 className="text-base font-semibold">
                        {subject || 'Email subject will appear here'}
                    </h2>
                </div>
                <div className="p-6">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                        {message || 'Your message content will appear here as you type...'}
                    </p>
                </div>
                <div className="border-t border-border/40 p-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                        Sending to: {recipientCount > 0 ? `${recipientCount} recipients` : 'No recipients selected'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailMarketingPage() {
    const organizerId = useOrganizerFromParams();
    const { organizers } = useOrganizers();
    const { rates } = useExchangeRates();
    const organizer = useMemo(() => organizers.find((item) => item.id === organizerId), [organizers, organizerId]);
    const organizerCurrency = (organizer?.defaultCurrency || 'GBP').toUpperCase();
    const exchangeRate = rates[organizerCurrency] ?? 1;
    const isCharity = Boolean(organizer?.isCharityVerified && organizer?.charityNumber);

    // Wizard state
    const [currentStep, setCurrentStep] = useState<Step>('recipients');
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

    // Step 1: Recipients
    const [recipientMode, setRecipientMode] = useState<RecipientMode>('existing');
    const [groups, setGroups] = useState<EmailMarketingGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
    const [groupSearch, setGroupSearch] = useState('');

    // CSV import state
    const [csvFileName, setCsvFileName] = useState('');
    const [csvText, setCsvText] = useState('');
    const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
    const [importingCsv, setImportingCsv] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    // Step 2: Campaign name
    const [campaignName, setCampaignName] = useState('');

    // Step 3: Message
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Step 5: Send
    const [recipientEstimate, setRecipientEstimate] = useState<number | null>(null);
    const [stampBalance, setStampBalance] = useState(0);
    const [stampsLoading, setStampsLoading] = useState(false);
    const [stampsToPurchase, setStampsToPurchase] = useState(1000);
    const [isPurchasingStamps, setIsPurchasingStamps] = useState(false);
    const [recipientShortfall, setRecipientShortfall] = useState<number | null>(null);
    const [recipientCanSend, setRecipientCanSend] = useState<boolean | null>(null);
    const [estimating, setEstimating] = useState(false);
    const [sending, setSending] = useState(false);
    const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Data Loading
    // ─────────────────────────────────────────────────────────────────────────

    const loadStamps = useCallback(async () => {
        if (!organizerId) return;
        setStampsLoading(true);
        try {
            const data = await getStampBalance(organizerId);
            setStampBalance(data.balance);
        } catch (err) {
            toast.error(err);
        } finally {
            setStampsLoading(false);
        }
    }, [organizerId]);

    const loadGroups = useCallback(async () => {
        if (!organizerId) return;
        setGroupsLoading(true);
        try {
            const data = await fetchEmailMarketingGroups(organizerId);
            setGroups(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            toast.error(err);
        } finally {
            setGroupsLoading(false);
        }
    }, [organizerId]);

    useEffect(() => {
        void loadGroups();
    }, [loadGroups]);

    useEffect(() => {
        void loadStamps();
    }, [loadStamps]);

    // ─────────────────────────────────────────────────────────────────────────
    // Recipient Estimate
    // ─────────────────────────────────────────────────────────────────────────

    const updateRecipientEstimate = useCallback(async () => {
        if (!organizerId || selectedGroupIds.size === 0) {
            setRecipientEstimate(null);
            setRecipientShortfall(null);
            setRecipientCanSend(null);
            return;
        }
        setEstimating(true);
        try {
            const result = await estimateEmailMarketingRecipients(organizerId, Array.from(selectedGroupIds));
            setRecipientEstimate(result.recipientCount);
            setRecipientShortfall(result.shortfall);
            setRecipientCanSend(result.canSend);
            setStampBalance(result.stampsAvailable);
        } catch (err) {
            console.error('Failed to estimate recipients:', err);
            setRecipientEstimate(null);
            setRecipientShortfall(null);
            setRecipientCanSend(null);
        } finally {
            setEstimating(false);
        }
    }, [organizerId, selectedGroupIds]);

    useEffect(() => {
        void updateRecipientEstimate();
    }, [updateRecipientEstimate]);

    // ─────────────────────────────────────────────────────────────────────────
    // Filtered Groups
    // ─────────────────────────────────────────────────────────────────────────

    const filteredGroups = useMemo(() => {
        if (!Array.isArray(groups)) return [];
        if (!groupSearch.trim()) return groups;
        const query = groupSearch.toLowerCase();
        return groups.filter((g) => g.name.toLowerCase().includes(query));
    }, [groups, groupSearch]);

    // ─────────────────────────────────────────────────────────────────────────
    // Step Validation
    // ─────────────────────────────────────────────────────────────────────────

    const canProceedFromRecipients = selectedGroupIds.size > 0;
    const canProceedFromName = campaignName.trim().length >= 3;
    const canProceedFromMessage = subject.trim().length >= 5 && message.trim().length >= 10;
    const hasEnoughStamps = recipientCanSend !== false && (recipientEstimate === null || stampBalance >= recipientEstimate);
    const canSend = canProceedFromRecipients && canProceedFromName && canProceedFromMessage && hasEnoughStamps;

    // ─────────────────────────────────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────────────────────────────────

    const handleContinue = () => {
        const stepOrder: Step[] = ['recipients', 'name', 'message', 'preview', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex < stepOrder.length - 1) {
            setCompletedSteps((prev) => new Set([...prev, currentStep]));
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const stepOrder: Step[] = ['recipients', 'name', 'message', 'preview', 'send'];
        const currentIndex = stepOrder.indexOf(currentStep);

        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleStepClick = (step: Step) => {
        setCurrentStep(step);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CSV Handlers
    // ─────────────────────────────────────────────────────────────────────────

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            setCsvText(text);
            setCsvPreview(buildCsvPreview(text));
        };
        reader.readAsText(file);
    };

    const handleImportAndCreateGroup = async () => {
        if (!organizerId || !csvText || !newGroupName.trim()) return;

        setImportingCsv(true);
        try {
            // 1. Import contacts
            const importResult = await importEmailMarketingContactsCsv(organizerId, csvText);

            // 2. Create new group
            const groupResult = await createEmailMarketingGroup(organizerId, {
                name: newGroupName.trim(),
                description: '',
            });

            // 3. Get imported contacts and add to group
            if (importResult.contactIds && importResult.contactIds.length > 0) {
                await addContactsToEmailMarketingGroup(organizerId, groupResult.data.id, importResult.contactIds);
            }

            // 4. Select the new group
            setSelectedGroupIds(new Set([groupResult.data.id]));

            // 5. Reload groups
            await loadGroups();

            // 6. Clear import state and switch to existing mode
            setCsvText('');
            setCsvFileName('');
            setCsvPreview(null);
            setNewGroupName('');
            setRecipientMode('existing');

            toast.success(`Imported ${importResult.inserted + importResult.updated} contacts into "${newGroupName.trim()}"`);
        } catch (err) {
            toast.error(err);
        } finally {
            setImportingCsv(false);
        }
    };

    const stampPricing = useMemo(() => {
        const basePricePerStampGBP = calculateStampPrice(stampsToPurchase);
        const discountRate = isCharity ? CHARITY_CREDIT_DISCOUNT_RATE : 0;
        const discountedPricePerStampGBP = applyCharityCreditDiscount(basePricePerStampGBP, discountRate);
        const basePricePerStamp = basePricePerStampGBP * exchangeRate;
        const pricePerStamp = discountedPricePerStampGBP * exchangeRate;
        const subtotal = stampsToPurchase * basePricePerStamp;
        const discountedSubtotal = stampsToPurchase * pricePerStamp;
        const discountAmount = Math.max(0, subtotal - discountedSubtotal);
        const vat = discountedSubtotal * 0.23;
        const total = discountedSubtotal + vat;

        return {
            basePricePerStamp,
            pricePerStamp,
            subtotal,
            discountAmount,
            vat,
            total,
            currency: organizerCurrency
        };
    }, [stampsToPurchase, organizerCurrency, exchangeRate, isCharity]);

    const formatCurrency = useCallback((amount: number, currency: string) => {
        return new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }, []);

    const handlePurchaseStamps = async () => {
        if (!organizerId) return;
        setIsPurchasingStamps(true);
        try {
            const result = await createStampPurchaseSession(organizerId, stampsToPurchase);
            if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }
            toast.error(result.message || 'Failed to start stamp checkout');
        } catch (err) {
            toast.error(err);
        } finally {
            setIsPurchasingStamps(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Send Campaign
    // ─────────────────────────────────────────────────────────────────────────

    const handleSendCampaign = async () => {
        if (!organizerId || !canSend) return;

        setSending(true);
        try {
            // Create campaign if not already created
            let campaignId = createdCampaignId;
            if (!campaignId) {
                const result = await createEmailMarketingCampaign(
                    organizerId,
                    {
                        name: campaignName.trim(),
                        subject: subject.trim(),
                        message: message.trim(),
                        groupIds: Array.from(selectedGroupIds),
                    }
                );
                campaignId = result.data.id;
                setCreatedCampaignId(campaignId);
            }

            // Send campaign
            const sendResult = await sendEmailMarketingCampaign(organizerId, campaignId);
            const charged = typeof sendResult.stampsCharged === 'number' ? sendResult.stampsCharged : sendResult.recipientCount;
            toast.success(`Campaign sent to ${sendResult.recipientCount} recipients (${charged} stamps used)`);
            await loadStamps();

            // Reset wizard
            setCurrentStep('recipients');
            setCompletedSteps(new Set());
            setSelectedGroupIds(new Set());
            setCampaignName('');
            setSubject('');
            setMessage('');
            setCreatedCampaignId(null);
            setRecipientEstimate(null);
            setRecipientShortfall(null);
            setRecipientCanSend(null);
        } catch (err) {
            toast.error(err);
        } finally {
            setSending(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Summary Badges
    // ─────────────────────────────────────────────────────────────────────────

    const getSummaryBadges = () => {
        const badges: { label: string; icon: React.ElementType }[] = [];

        if (completedSteps.has('recipients') && selectedGroupIds.size > 0) {
            const count = recipientEstimate ?? selectedGroupIds.size;
            badges.push({ label: `${count} recipient${count !== 1 ? 's' : ''}`, icon: Users });
        }
        if (completedSteps.has('name') && campaignName) {
            badges.push({ label: campaignName.substring(0, 25) + (campaignName.length > 25 ? '...' : ''), icon: Tag });
        }
        if (completedSteps.has('message')) {
            badges.push({ label: subject.substring(0, 25) + (subject.length > 25 ? '...' : ''), icon: Mail });
        }

        return badges;
    };

    const summaryBadges = getSummaryBadges();

    // ─────────────────────────────────────────────────────────────────────────
    // Computed Values
    // ─────────────────────────────────────────────────────────────────────────

    const canContinue =
        (currentStep === 'recipients' && canProceedFromRecipients) ||
        (currentStep === 'name' && canProceedFromName) ||
        (currentStep === 'message' && canProceedFromMessage) ||
        currentStep === 'preview';

    const selectedGroupNames = useMemo(() => {
        if (!Array.isArray(groups)) return [];
        return groups.filter((g) => selectedGroupIds.has(g.id)).map((g) => g.name);
    }, [groups, selectedGroupIds]);
    const noStamps = !stampsLoading && stampBalance <= 0;
    const lowStamps = !stampsLoading && stampBalance > 0 && stampBalance < 1000;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="container py-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    <Button variant="ghost" size="sm" className="w-fit px-2" asChild>
                        <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Dashboard
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center shadow-lg">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="font-display text-2xl sm:text-3xl font-bold">Email Marketing</h1>
                                <p className="text-muted-foreground">Send campaigns to your contacts in 5 simple steps</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={cn(
                        'rounded-2xl border p-4 sm:p-5',
                        noStamps
                            ? 'border-amber-300 bg-amber-50'
                            : lowStamps
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-emerald-200 bg-emerald-50'
                    )}
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            {stampsLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <AlertTriangle className={cn('h-4 w-4', noStamps ? 'text-amber-700' : 'text-blue-700')} />
                            )}
                            <p className="text-sm font-medium">
                                {stampsLoading
                                    ? 'Loading stamp balance...'
                                    : `Available stamps: ${stampBalance.toLocaleString()}`}
                            </p>
                        </div>
                        {!stampsLoading && (
                            <Badge variant="secondary" className="w-fit">
                                1 stamp = 1 recipient email
                            </Badge>
                        )}
                    </div>
                    {!stampsLoading && noStamps && (
                        <p className="text-sm mt-2 text-amber-900">
                            You have no stamps. Top up below to send campaigns.
                        </p>
                    )}
                    {!stampsLoading && lowStamps && !noStamps && (
                        <p className="text-sm mt-2 text-blue-900">
                            Your stamp balance is running low. Consider topping up before your next campaign.
                        </p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="font-semibold">Buy Stamps</h3>
                            <p className="text-xs text-muted-foreground">
                                Purchase email stamps directly here. Minimum {MIN_STAMPS.toLocaleString()} stamps.
                            </p>
                        </div>
                        <Badge variant="outline">
                            {stampsToPurchase.toLocaleString()} stamps
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <Slider
                            value={[stampsToPurchase]}
                            onValueChange={(values) => setStampsToPurchase(values[0])}
                            min={MIN_STAMPS}
                            max={MAX_STAMPS}
                            step={100}
                            className="cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{MIN_STAMPS.toLocaleString()}</span>
                            <span>{MAX_STAMPS.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                            <p className="text-muted-foreground">Subtotal</p>
                            <p className="font-medium">{formatCurrency(stampPricing.subtotal, stampPricing.currency)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Discount</p>
                            <p className="font-medium">-{formatCurrency(stampPricing.discountAmount, stampPricing.currency)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">VAT</p>
                            <p className="font-medium">{formatCurrency(stampPricing.vat, stampPricing.currency)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold">{formatCurrency(stampPricing.total, stampPricing.currency)}</p>
                        </div>
                    </div>

                    <Button
                        onClick={handlePurchaseStamps}
                        disabled={isPurchasingStamps}
                        className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:opacity-90"
                    >
                        {isPurchasingStamps ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Redirecting...
                            </>
                        ) : (
                            'Checkout with Stripe'
                        )}
                    </Button>
                </motion.div>

                {/* Step Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="py-4"
                >
                    <StepIndicator
                        steps={STEPS}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={handleStepClick}
                    />
                </motion.div>

                {/* Summary Badges */}
                {summaryBadges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-wrap justify-center gap-2"
                    >
                        {summaryBadges.map((badge, i) => (
                            <Badge
                                key={i}
                                variant="secondary"
                                className="px-3 py-1.5 gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <badge.icon className="h-3.5 w-3.5" />
                                {badge.label}
                            </Badge>
                        ))}
                    </motion.div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 items-start">
                    {/* Left Column - Step Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden"
                            style={{
                                background:
                                    'linear-gradient(white, white) padding-box, linear-gradient(135deg, oklch(0.78 0.14 165 / 0.3), oklch(0.72 0.15 185 / 0.3)) border-box',
                                borderColor: 'transparent',
                            }}
                        >
                            {/* Step Header */}
                            <div className="border-b border-border/40 px-6 py-5 bg-gradient-to-r from-muted/30 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] text-white flex items-center justify-center">
                                        {STEPS.find((s) => s.id === currentStep)?.icon &&
                                            (() => {
                                                const Icon = STEPS.find((s) => s.id === currentStep)!.icon;
                                                return <Icon className="h-5 w-5" />;
                                            })()}
                                    </div>
                                    <div>
                                        <h2 className="font-display text-xl font-semibold">
                                            {STEPS.find((s) => s.id === currentStep)?.label}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {currentStep === 'recipients' && 'Choose existing groups or import new contacts'}
                                            {currentStep === 'name' && 'Give your campaign a name'}
                                            {currentStep === 'message' && 'Write your email subject and message'}
                                            {currentStep === 'preview' && 'Review your email before sending'}
                                            {currentStep === 'send' && 'Confirm and send your campaign'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="p-6">
                                {/* ─────────────────────────────────────────────────────────────
                                    STEP 1: Recipients
                                ───────────────────────────────────────────────────────────── */}
                                {currentStep === 'recipients' && (
                                    <div className="space-y-6">
                                        {/* Mode Toggle */}
                                        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-fit">
                                            <button
                                                onClick={() => setRecipientMode('existing')}
                                                className={cn(
                                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                                    recipientMode === 'existing'
                                                        ? 'bg-white shadow-sm text-foreground'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                Existing Groups
                                            </button>
                                            <button
                                                onClick={() => setRecipientMode('import')}
                                                className={cn(
                                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                                    recipientMode === 'import'
                                                        ? 'bg-white shadow-sm text-foreground'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                Import New
                                            </button>
                                        </div>

                                        {recipientMode === 'existing' && (
                                            <div className="space-y-4">
                                                <Input
                                                    placeholder="Search groups..."
                                                    value={groupSearch}
                                                    onChange={(e) => setGroupSearch(e.target.value)}
                                                    className="max-w-sm"
                                                />

                                                {groupsLoading ? (
                                                    <div className="flex items-center justify-center py-12">
                                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : filteredGroups.length === 0 ? (
                                                    <div className="text-center py-12 text-muted-foreground">
                                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                        <p>No groups found. Import contacts to create one.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {filteredGroups.map((group) => {
                                                            const isSelected = selectedGroupIds.has(group.id);
                                                            const toggleGroupSelection = () => {
                                                                setSelectedGroupIds((prev) => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(group.id)) {
                                                                        next.delete(group.id);
                                                                    } else {
                                                                        next.add(group.id);
                                                                    }
                                                                    return next;
                                                                });
                                                            };

                                                            return (
                                                                <div
                                                                    key={group.id}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-pressed={isSelected}
                                                                    onClick={toggleGroupSelection}
                                                                    onKeyDown={(event) => {
                                                                        if (event.currentTarget !== event.target) return;
                                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                                            event.preventDefault();
                                                                            toggleGroupSelection();
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer',
                                                                        isSelected
                                                                            ? 'border-[oklch(0.72_0.15_185)] bg-gradient-to-br from-[oklch(0.78_0.14_165)]/5 to-[oklch(0.72_0.15_185)]/10'
                                                                            : 'border-border/60 hover:border-border'
                                                                    )}
                                                                >
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={toggleGroupSelection}
                                                                        onClick={(event) => event.stopPropagation()}
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium truncate">{group.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {group.memberCount ?? 0} members
                                                                        </p>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="h-5 w-5 text-[oklch(0.72_0.15_185)]" />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {selectedGroupIds.size > 0 && (
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                                                            {estimating ? (
                                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                            ) : (
                                                                <Users className="h-3 w-3 mr-1" />
                                                            )}
                                                            {recipientEstimate ?? '...'} unique recipients
                                                        </Badge>
                                                        {!estimating && (recipientShortfall ?? 0) > 0 && (
                                                            <Badge variant="destructive">
                                                                Need {recipientShortfall?.toLocaleString()} more stamps
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {recipientMode === 'import' && (
                                            <div className="space-y-4">
                                                <div
                                                    className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-[oklch(0.72_0.15_185)] transition-colors cursor-pointer"
                                                    onClick={() => document.getElementById('csv-upload')?.click()}
                                                >
                                                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                                    <p className="font-medium">
                                                        {csvFileName || 'Drop CSV or click to browse'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Supports .csv files with email column
                                                    </p>
                                                    <input
                                                        id="csv-upload"
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                    />
                                                </div>

                                                {csvPreview && (
                                                    <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-muted-foreground">Rows</p>
                                                                <p className="font-semibold">{csvPreview.rows}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Valid</p>
                                                                <p className="font-semibold text-emerald-600">
                                                                    {csvPreview.uniqueValid}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Invalid</p>
                                                                <p className="font-semibold text-destructive">
                                                                    {csvPreview.invalid}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Duplicates</p>
                                                                <p className="font-semibold text-amber-600">
                                                                    {csvPreview.duplicates}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label htmlFor="group-name">Group name (required)</Label>
                                                    <Input
                                                        id="group-name"
                                                        placeholder="e.g. Newsletter Subscribers"
                                                        value={newGroupName}
                                                        onChange={(e) => setNewGroupName(e.target.value)}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Imported contacts will be added to this new group
                                                    </p>
                                                </div>

                                                <Button
                                                    onClick={handleImportAndCreateGroup}
                                                    disabled={
                                                        !csvText ||
                                                        !newGroupName.trim() ||
                                                        importingCsv ||
                                                        (csvPreview?.uniqueValid ?? 0) === 0
                                                    }
                                                    className="w-full sm:w-auto"
                                                >
                                                    {importingCsv ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Importing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Import & Create Group
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─────────────────────────────────────────────────────────────
                                    STEP 2: Campaign Name
                                ───────────────────────────────────────────────────────────── */}
                                {currentStep === 'name' && (
                                    <div className="space-y-4 max-w-lg">
                                        <div className="space-y-2">
                                            <Label htmlFor="campaign-name">Campaign name</Label>
                                            <Input
                                                id="campaign-name"
                                                placeholder="e.g. Summer Newsletter"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                className="text-lg"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                This is for your reference only. Recipients won't see this.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ─────────────────────────────────────────────────────────────
                                    STEP 3: Message
                                ───────────────────────────────────────────────────────────── */}
                                {currentStep === 'message' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject line</Label>
                                            <Input
                                                id="subject"
                                                placeholder="e.g. Exciting news about our upcoming event!"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {subject.length}/100 characters
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="message">Message</Label>
                                            <Textarea
                                                id="message"
                                                placeholder="Write your email message here..."
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                rows={8}
                                                className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {message.length.toLocaleString()}/20,000 characters
                                            </p>
                                        </div>

                                        {/* Mobile preview button */}
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowMobilePreview(true)}
                                            className="lg:hidden"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Preview
                                        </Button>
                                    </div>
                                )}

                                {/* ─────────────────────────────────────────────────────────────
                                    STEP 4: Preview
                                ───────────────────────────────────────────────────────────── */}
                                {currentStep === 'preview' && (
                                    <div className="space-y-6">
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Recipients</span>
                                                </div>
                                                <p className="text-lg font-semibold">
                                                    {recipientEstimate ?? '...'} unique
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedGroupNames.slice(0, 2).join(', ')}
                                                    {selectedGroupNames.length > 2 && ` +${selectedGroupNames.length - 2} more`}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Campaign</span>
                                                </div>
                                                <p className="text-lg font-semibold truncate">{campaignName}</p>
                                            </div>

                                            <div className="rounded-xl border border-border/60 p-4 bg-muted/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Subject</span>
                                                </div>
                                                <p className="text-lg font-semibold truncate">{subject}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-border/60 p-6 bg-white">
                                            <h4 className="text-sm font-medium mb-3">Message Preview</h4>
                                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                                {message}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ─────────────────────────────────────────────────────────────
                                    STEP 5: Send
                                ───────────────────────────────────────────────────────────── */}
                                {currentStep === 'send' && (
                                    <div className="space-y-6">
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-amber-900">
                                                        Ready to send?
                                                    </p>
                                                    <p className="text-sm text-amber-800 mt-1">
                                                        This will send immediately to{' '}
                                                        <strong>{recipientEstimate ?? '...'} recipients</strong>.
                                                        This action cannot be undone.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {(recipientShortfall ?? 0) > 0 && (
                                            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                                                You need <strong>{recipientShortfall?.toLocaleString()}</strong> more stamps to send this campaign.
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Check className="h-4 w-4 text-emerald-500" />
                                                <span>"{campaignName}"</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Check className="h-4 w-4 text-emerald-500" />
                                                <span>Subject: {subject}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Check className="h-4 w-4 text-emerald-500" />
                                                <span>{selectedGroupNames.join(', ')}</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSendCampaign}
                                            disabled={sending || !canSend}
                                            size="lg"
                                            className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:opacity-90"
                                        >
                                            {sending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Send Campaign
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Footer */}
                            <div className="border-t border-border/40 px-6 py-4 bg-muted/10 flex items-center justify-between sticky bottom-0 z-10 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={currentStep === 'recipients'}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>

                                {currentStep !== 'send' && (
                                    <Button
                                        onClick={handleContinue}
                                        disabled={!canContinue}
                                        className="bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)] hover:opacity-90"
                                    >
                                        Continue
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Right Column - Live Preview (Desktop Only) */}
                    <div className="hidden lg:block">
                        {(currentStep === 'message' || currentStep === 'preview') && (
                            <LiveEmailPreview
                                subject={subject}
                                message={message}
                                recipientCount={recipientEstimate ?? 0}
                            />
                        )}
                    </div>
                </div>

                {/* Mobile Preview Sheet */}
                <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
                    <SheetContent side="bottom" className="h-[80vh]">
                        <SheetHeader>
                            <SheetTitle>Email Preview</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4">
                            <LiveEmailPreview
                                subject={subject}
                                message={message}
                                recipientCount={recipientEstimate ?? 0}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}
