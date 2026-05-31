'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StripeConnectStatus } from '@/components/stripe-connect-status';
import { useOrganizers } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import {
    Loader2,
    AlertCircle,
    Check,
    User,
    Coins,
    CreditCard,
    ExternalLink,
    Camera,
    Building,
    Globe,
    Mail,
    Instagram,
    Linkedin,
    Youtube,
    Upload,
    Lock,
    Target,
    Bell
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';
import { COUNTRIES } from '@/lib/organizer-options';
import { uploadAvatar, uploadOrganizerAvatar, fileToDataUrl } from '@/lib/upload-api';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { OrgBadge, getOrgColor } from '@/components/dashboard/OrganizerSwitcher';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import {
    getOrganizerContactEmailError,
    normalizeOrganizerContactEmail,
} from '@/lib/organizer-contact-email';
import { getMetaTrackingStatus, type MetaTrackingStatusTone } from '@/lib/meta-tracking-status';

type SettingsTab = 'profile' | 'organizer-profile' | 'currency' | 'marketing' | 'payments';

interface TabItem {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    organizerOnly?: boolean;
}

const TABS: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organizer-profile', label: 'Organiser', icon: Building, organizerOnly: true },
    { id: 'currency', label: 'Currency', icon: Coins, organizerOnly: true },
    { id: 'marketing', label: 'Marketing', icon: Target, organizerOnly: true },
    { id: 'payments', label: 'Payments', icon: CreditCard, organizerOnly: true },
];

interface ProfileFormData {
    name: string;
    gender: 'male' | 'female' | '';
    dateOfBirth: string;
    homeCountry: string;
    homeCity: string;
}

interface OrganizerProfileFormData {
    bio: string;
    website: string;
    replyToEmail: string;
    instagram: string;
    tiktok: string;
    linkedin: string;
    youtube: string;
    sendFollowerEventNotifications: boolean;
}

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const AVATAR_ACCEPT = ALLOWED_AVATAR_MIME_TYPES.join(',');

const META_TRACKING_STATUS_STYLES: Record<MetaTrackingStatusTone, {
    dot: string;
    label: string;
    panel: string;
}> = {
    muted: {
        dot: 'bg-slate-400',
        label: 'text-slate-700 dark:text-slate-300',
        panel: 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20',
    },
    warning: {
        dot: 'bg-amber-500',
        label: 'text-amber-800 dark:text-amber-200',
        panel: 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20',
    },
    success: {
        dot: 'bg-emerald-500',
        label: 'text-emerald-800 dark:text-emerald-200',
        panel: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-900/20',
    },
};

export default function SettingsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading, refresh: refreshAuth } = useAuth();
    const { activeOrganizerId, setActiveOrganizerId, organizers, activeOrganizers, isLoading: organizersLoading, refresh } = useOrganizers();

    const isLoading = authLoading || organizersLoading;
    const hasActiveOrganizer = activeOrganizers.length > 0;
    const currentOrganizer = organizers.find(o => o.id === activeOrganizerId);

    // Only owner/co-owner can edit org settings
    const canEditOrgSettings = currentOrganizer &&
        currentOrganizer.status === 'active' &&
        ['owner', 'co_owner'].includes(currentOrganizer.role);

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        currentOrganizer?.defaultCurrency || 'GBP'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [metaPixelInput, setMetaPixelInput] = useState<string>(currentOrganizer?.metaPixelId || '');
    const [isSavingMetaPixel, setIsSavingMetaPixel] = useState(false);
    const [metaPixelStatus, setMetaPixelStatus] = useState<'success' | 'error' | null>(null);
    const [metaPixelError, setMetaPixelError] = useState<string | null>(null);
    const [metaCapiTokenInput, setMetaCapiTokenInput] = useState<string>('');
    const [isSavingMetaCapiToken, setIsSavingMetaCapiToken] = useState(false);
    const [metaCapiStatus, setMetaCapiStatus] = useState<'success' | 'error' | null>(null);
    const [metaCapiError, setMetaCapiError] = useState<string | null>(null);

    // Profile form state
    const [profileForm, setProfileForm] = useState<ProfileFormData>({
        name: '',
        gender: '',
        dateOfBirth: '',
        homeCountry: '',
        homeCity: '',
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveStatus, setProfileSaveStatus] = useState<'success' | 'error' | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Organizer profile form state
    const [organizerProfileForm, setOrganizerProfileForm] = useState<OrganizerProfileFormData>({
        bio: '',
        website: '',
        replyToEmail: '',
        instagram: '',
        tiktok: '',
        linkedin: '',
        youtube: '',
        sendFollowerEventNotifications: true,
    });
    const [isSavingOrganizerProfile, setIsSavingOrganizerProfile] = useState(false);
    const [organizerProfileSaveStatus, setOrganizerProfileSaveStatus] = useState<'success' | 'error' | null>(null);
    const [organizerProfileError, setOrganizerProfileError] = useState<string | null>(null);

    // Avatar upload state (user profile)
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUploadStatus, setAvatarUploadStatus] = useState<'success' | 'error' | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Org avatar upload state (with cropper)
    const [orgAvatarPreview, setOrgAvatarPreview] = useState<string>('');
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [isUploadingOrgAvatar, setIsUploadingOrgAvatar] = useState(false);
    const [orgAvatarError, setOrgAvatarError] = useState<string | null>(null);
    const [orgAvatarSuccess, setOrgAvatarSuccess] = useState(false);
    const orgAvatarInputRef = useRef<HTMLInputElement>(null);

    // Filter tabs based on active organizer status (not just any organizer)
    const visibleTabs = TABS.filter(tab => !tab.organizerOnly || hasActiveOrganizer);

    useEffect(() => {
        const requestedTab = searchParams.get('tab');
        if (!requestedTab) {
            return;
        }

        const validTabIds: SettingsTab[] = ['profile', 'organizer-profile', 'currency', 'marketing', 'payments'];
        if (!validTabIds.includes(requestedTab as SettingsTab)) {
            return;
        }

        const nextTab = requestedTab as SettingsTab;
        const tabConfig = TABS.find(tab => tab.id === nextTab);
        if (tabConfig?.organizerOnly && !hasActiveOrganizer) {
            return;
        }

        setActiveTab(nextTab);
    }, [hasActiveOrganizer, searchParams]);

    useEffect(() => {
        const requestedOrganizerId = searchParams.get('organizerId');
        if (!requestedOrganizerId) {
            return;
        }

        if (!organizers.some((organizer) => organizer.id === requestedOrganizerId)) {
            return;
        }

        if (activeOrganizerId !== requestedOrganizerId) {
            setActiveOrganizerId(requestedOrganizerId);
            return;
        }

        if (searchParams.has('stripe')) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('organizerId');
        const nextQuery = nextParams.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [activeOrganizerId, organizers, pathname, router, searchParams, setActiveOrganizerId]);

    useEffect(() => {
        const targetId = searchParams.get('focus');
        if (!targetId || activeTab !== 'organizer-profile') {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            const target = document.getElementById(targetId);
            if (!target) {
                return;
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                target.focus();
                target.select?.();
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, [activeTab, currentOrganizer?.id, searchParams]);

    // Initialize profile form from user data
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth || '',
                homeCountry: user.homeCountry || '',
                homeCity: user.homeCity || '',
            });
        }
    }, [user]);

    useEffect(() => {
        if (currentOrganizer?.defaultCurrency) {
            setSelectedCurrency(currentOrganizer.defaultCurrency);
        }
    }, [currentOrganizer?.defaultCurrency]);

    useEffect(() => {
        setMetaPixelInput(currentOrganizer?.metaPixelId || '');
    }, [currentOrganizer?.metaPixelId]);

    useEffect(() => {
        setMetaCapiTokenInput('');
    }, [currentOrganizer?.metaCapiTokenLast4]);

    // Initialize organizer profile form
    useEffect(() => {
        if (currentOrganizer) {
            const socialLinks = currentOrganizer.socialLinks || {};
            setOrganizerProfileForm({
                bio: currentOrganizer.bio || '',
                website: currentOrganizer.website || '',
                replyToEmail: currentOrganizer.replyToEmail || '',
                instagram: socialLinks.instagram || '',
                tiktok: socialLinks.tiktok || '',
                linkedin: socialLinks.linkedin || '',
                youtube: socialLinks.youtube || '',
                sendFollowerEventNotifications:
                    currentOrganizer.sendFollowerEventNotifications ?? true,
            });
        }
    }, [currentOrganizer]);

    const handleAvatarSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
            setAvatarError('Please upload a JPG, PNG, GIF, or WebP image');
            setAvatarUploadStatus('error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError('Image must be 5MB or less');
            setAvatarUploadStatus('error');
            return;
        }

        setAvatarFile(file);
        setAvatarError(null);
        setAvatarUploadStatus(null);

        // Create preview
        try {
            const preview = await fileToDataUrl(file);
            setAvatarPreview(preview);
        } catch {
            setAvatarError('Failed to preview image');
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;

        setIsUploadingAvatar(true);
        setAvatarUploadStatus(null);
        setAvatarError(null);

        try {
            await uploadAvatar(avatarFile);
            setAvatarUploadStatus('success');
            setAvatarFile(null);
            setAvatarPreview('');
            await refreshAuth();
            setTimeout(() => setAvatarUploadStatus(null), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload avatar';
            setAvatarError(message);
            setAvatarUploadStatus('error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const cancelAvatarUpload = () => {
        setAvatarFile(null);
        setAvatarPreview('');
        setAvatarError(null);
        setAvatarUploadStatus(null);
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    // Org avatar handlers (with cropping)
    const handleOrgAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
            setOrgAvatarError('Please upload a JPG, PNG, GIF, or WebP image');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setOrgAvatarError('Image must be 5MB or less');
            return;
        }

        setOrgAvatarError(null);
        try {
            const preview = await fileToDataUrl(file);
            setOrgAvatarPreview(preview);
            setIsCropperOpen(true);
        } catch {
            setOrgAvatarError('Failed to load image');
        }

        // Reset input so same file can be selected again
        if (orgAvatarInputRef.current) {
            orgAvatarInputRef.current.value = '';
        }
    };

    const handleOrgAvatarCropComplete = async (croppedBlob: Blob) => {
        if (!activeOrganizerId) return;

        setIsUploadingOrgAvatar(true);
        setOrgAvatarError(null);
        setOrgAvatarSuccess(false);

        try {
            // Convert blob to file
            const file = new File([croppedBlob], 'org-avatar.jpg', { type: 'image/jpeg' });
            await uploadOrganizerAvatar(activeOrganizerId, file);
            setOrgAvatarSuccess(true);
            setOrgAvatarPreview('');
            await refresh(); // Refresh organizer data to get new avatar URL
            setTimeout(() => setOrgAvatarSuccess(false), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload avatar';
            setOrgAvatarError(message);
        } finally {
            setIsUploadingOrgAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        setProfileSaveStatus(null);
        setProfileError(null);
        const trimmedName = profileForm.name.trim();

        if (!trimmedName) {
            setProfileSaveStatus('error');
            setProfileError('Display name is required.');
            setIsSavingProfile(false);
            return;
        }

        try {
            await api.patch('/api/v1/auth/me', {
                name: trimmedName,
                gender: profileForm.gender || null,
                dateOfBirth: profileForm.dateOfBirth || null,
                homeCountry: profileForm.homeCountry || null,
                homeCity: profileForm.homeCity || null,
            });
            setProfileSaveStatus('success');
            await refreshAuth();
            setTimeout(() => setProfileSaveStatus(null), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
            setProfileSaveStatus('error');
            setProfileError(message);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleSaveCurrency = async () => {
        if (!activeOrganizerId) return;

        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, {
                defaultCurrency: selectedCurrency
            });
            setSaveSuccess(true);
            await refresh();
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch {
            // Error handled by API layer
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMetaPixel = async () => {
        if (!activeOrganizerId) return;

        setIsSavingMetaPixel(true);
        setMetaPixelStatus(null);
        setMetaPixelError(null);

        const payloadValue = metaPixelInput.trim();

        try {
            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, {
                metaPixelId: payloadValue === '' ? null : payloadValue
            });
            setMetaPixelStatus('success');
            await refresh();
            setTimeout(() => setMetaPixelStatus(null), 2000);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to update Meta Pixel ID. Please try again.';
            setMetaPixelStatus('error');
            setMetaPixelError(message);
        } finally {
            setIsSavingMetaPixel(false);
        }
    };

    const handleSaveMetaCapiToken = async (clearToken: boolean) => {
        if (!activeOrganizerId) return;

        setIsSavingMetaCapiToken(true);
        setMetaCapiStatus(null);
        setMetaCapiError(null);

        const payloadValue = metaCapiTokenInput.trim();

        try {
            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, {
                metaCapiToken: clearToken ? null : (payloadValue === '' ? null : payloadValue)
            });
            setMetaCapiStatus('success');
            setMetaCapiTokenInput('');
            await refresh();
            setTimeout(() => setMetaCapiStatus(null), 2000);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to update Meta CAPI token. Please try again.';
            setMetaCapiStatus('error');
            setMetaCapiError(message);
        } finally {
            setIsSavingMetaCapiToken(false);
        }
    };

    const handleSaveOrganizerProfile = async () => {
        if (!activeOrganizerId) return;

        setIsSavingOrganizerProfile(true);
        setOrganizerProfileSaveStatus(null);
        setOrganizerProfileError(null);

        try {
            // Build payload with only fields that have values
            const payload: Record<string, unknown> = {};

            // Bio can be sent as empty string or with content
            if (organizerProfileForm.bio.trim()) {
                payload.bio = organizerProfileForm.bio.trim();
            } else {
                payload.bio = null;
            }

            const trimmedWebsite = organizerProfileForm.website.trim();
            payload.website = trimmedWebsite === '' ? null : trimmedWebsite;

            const trimmedReplyTo = normalizeOrganizerContactEmail(organizerProfileForm.replyToEmail);
            const organizerContactEmailError = getOrganizerContactEmailError(trimmedReplyTo, {
                requiredMessage: 'Organizer contact email is required. Please enter a valid email.',
                invalidMessage: 'Please enter a valid organizer contact email.',
            });
            if (organizerContactEmailError) {
                setOrganizerProfileSaveStatus('error');
                setOrganizerProfileError(organizerContactEmailError);
                return;
            }
            payload.replyToEmail = trimmedReplyTo;

            // Social links - only include non-empty ones
            const socialLinks: Record<string, string> = {};
            if (organizerProfileForm.instagram.trim()) socialLinks.instagram = organizerProfileForm.instagram.trim();
            if (organizerProfileForm.tiktok.trim()) socialLinks.tiktok = organizerProfileForm.tiktok.trim();
            if (organizerProfileForm.linkedin.trim()) socialLinks.linkedin = organizerProfileForm.linkedin.trim();
            if (organizerProfileForm.youtube.trim()) socialLinks.youtube = organizerProfileForm.youtube.trim();

            payload.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : null;

            payload.sendFollowerEventNotifications =
                organizerProfileForm.sendFollowerEventNotifications;

            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, payload);
            setOrganizerProfileSaveStatus('success');
            await refresh();
            setTimeout(() => setOrganizerProfileSaveStatus(null), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update organiser profile. Please try again.';
            setOrganizerProfileSaveStatus('error');
            setOrganizerProfileError(message);
        } finally {
            setIsSavingOrganizerProfile(false);
        }
    };

    const normalizedPixelInput = metaPixelInput.trim();
    const normalizedCurrentPixel = currentOrganizer?.metaPixelId || '';
    const metaPixelChanged = normalizedPixelInput !== normalizedCurrentPixel;
    const metaCapiConnected = Boolean(currentOrganizer?.metaCapiTokenLast4);
    const metaCapiActive = Boolean(currentOrganizer?.metaPixelId?.trim() && currentOrganizer?.metaCapiTokenLast4?.trim());
    const metaTrackingStatus = getMetaTrackingStatus({
        metaPixelId: currentOrganizer?.metaPixelId,
        metaCapiTokenLast4: currentOrganizer?.metaCapiTokenLast4,
    });
    const metaTrackingStatusStyles = META_TRACKING_STATUS_STYLES[metaTrackingStatus.tone];

    // Check if profile has changed
    const profileHasChanges = user && (
        (profileForm.name || '') !== (user.name || '') ||
        (profileForm.gender || '') !== (user.gender || '') ||
        (profileForm.dateOfBirth || '') !== (user.dateOfBirth || '') ||
        (profileForm.homeCountry || '') !== (user.homeCountry || '') ||
        (profileForm.homeCity || '') !== (user.homeCity || '')
    );

    // Check if organizer profile has changed
    const organizerProfileHasChanges = currentOrganizer && (() => {
        const currentSocialLinks = currentOrganizer.socialLinks || {};
        return (
            (organizerProfileForm.bio || '') !== (currentOrganizer.bio || '') ||
            (organizerProfileForm.website || '') !== (currentOrganizer.website || '') ||
            (organizerProfileForm.replyToEmail || '') !== (currentOrganizer.replyToEmail || '') ||
            (organizerProfileForm.instagram || '') !== (currentSocialLinks.instagram || '') ||
            (organizerProfileForm.tiktok || '') !== (currentSocialLinks.tiktok || '') ||
            (organizerProfileForm.linkedin || '') !== (currentSocialLinks.linkedin || '') ||
            (organizerProfileForm.youtube || '') !== (currentSocialLinks.youtube || '') ||
            organizerProfileForm.sendFollowerEventNotifications !==
                (currentOrganizer.sendFollowerEventNotifications ?? true)
        );
    })();

    const currencyOptions = Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => ({
        value: code,
        label: `${info.symbol} ${code} - ${info.name}`
    }));

    // Loading state
    if (isLoading) {
        return (
            <div className="container py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>

                {/* Main Content with Glass Surface */}
                <div className="glass-surface border border-white/50 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-0">

                        {/* Side Navigation */}
                        <nav className="lg:w-52 flex-shrink-0 lg:pr-6">
                            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                                {visibleTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap',
                                            activeTab === tab.id
                                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        )}
                                    >
                                        <tab.icon className="h-5 w-5 shrink-0" />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </nav>

                        {/* Content Area with Left Border */}
                        <div className="flex-1 min-w-0 lg:border-l lg:border-border/50 lg:pl-10">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>

                                    {/* Profile Header Card - Full Width */}
                                    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/50">
                                        <div className="relative">
                                            <Avatar className="h-14 w-14 text-lg">
                                                <AvatarImage
                                                    src={avatarPreview || user?.avatarUrl || ''}
                                                    alt={user?.name || 'User'}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-linear-to-br from-(--brand-cyan) to-(--brand-teal) text-white font-semibold">
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                type="button"
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border hover:bg-muted transition-colors"
                                            >
                                                <Camera className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept={AVATAR_ACCEPT}
                                                onChange={handleAvatarSelect}
                                                className="hidden"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground truncate">{user?.name || 'Your Name'}</p>
                                            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                                            {avatarFile && (
                                                <div className="flex gap-2 mt-2">
                                                    <Button size="sm" variant="default" onClick={handleAvatarUpload} disabled={isUploadingAvatar}>
                                                        {isUploadingAvatar ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Uploading</> : 'Upload'}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={cancelAvatarUpload} disabled={isUploadingAvatar}>Cancel</Button>
                                                </div>
                                            )}
                                            {avatarUploadStatus === 'success' && <p className="text-xs text-emerald-600 mt-1">Photo updated</p>}
                                            {avatarUploadStatus === 'error' && <p className="text-xs text-destructive mt-1">{avatarError || 'Upload failed'}</p>}
                                        </div>
                                    </div>

                                    {/* Two-column grid on desktop */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Left Column: Personal Info Card */}
                                        <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                <h3 className="text-sm font-medium text-foreground">Personal Info</h3>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {/* Display Name */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</Label>
                                                    <Input
                                                        id="name"
                                                        placeholder="Your display name"
                                                        value={profileForm.name}
                                                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                        className="h-10"
                                                    />
                                                </div>

                                                {/* Email - locked */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                        Email <Lock className="h-3 w-3" />
                                                    </Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        defaultValue={user?.email || ''}
                                                        disabled
                                                        className="h-10 bg-muted/40 border-transparent"
                                                    />
                                                </div>

                                                {/* Gender */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                        Gender {user?.gender && <Lock className="h-3 w-3" />}
                                                    </Label>
                                                    <Select
                                                        value={profileForm.gender}
                                                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, gender: value as 'male' | 'female' | '' }))}
                                                        disabled={!!user?.gender}
                                                    >
                                                        <SelectTrigger className={cn("h-10", user?.gender && "bg-muted/40 border-transparent")}>
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Date of Birth */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                        Date of Birth {user?.dateOfBirth && <Lock className="h-3 w-3" />}
                                                    </Label>
                                                    <DatePicker
                                                        id="dateOfBirth"
                                                        value={profileForm.dateOfBirth}
                                                        onChange={(value) => setProfileForm(prev => ({ ...prev, dateOfBirth: value }))}
                                                        placeholder="Select date"
                                                        className={cn("h-10", user?.dateOfBirth && "bg-muted/40 border-transparent")}
                                                        maxDate={new Date()}
                                                        disabled={!!user?.dateOfBirth}
                                                        showYearMonthDropdowns
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Location Card */}
                                        <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden h-fit">
                                            <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                <h3 className="text-sm font-medium text-foreground">Location</h3>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Country</Label>
                                                    <Select
                                                        value={profileForm.homeCountry}
                                                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, homeCountry: value }))}
                                                    >
                                                        <SelectTrigger className="h-10">
                                                            <SelectValue placeholder="Select country" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COUNTRIES.map((country) => (
                                                                <SelectItem key={country.code} value={country.code}>
                                                                    {country.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="homeCity" className="text-xs text-muted-foreground uppercase tracking-wide">City</Label>
                                                    <Input
                                                        id="homeCity"
                                                        placeholder="Your city"
                                                        value={profileForm.homeCity}
                                                        onChange={(e) => setProfileForm(prev => ({ ...prev, homeCity: e.target.value }))}
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save Section - Full Width */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {profileSaveStatus === 'success' && (
                                                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                                                    <Check className="h-4 w-4" /> Saved
                                                </p>
                                            )}
                                            {profileSaveStatus === 'error' && (
                                                <p className="text-sm text-destructive flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4" /> {profileError || 'Save failed'}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleSaveProfile}
                                            disabled={isSavingProfile || !profileHasChanges}
                                        >
                                            {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Organizer Profile Tab */}
                            {activeTab === 'organizer-profile' && hasActiveOrganizer && activeOrganizerId && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Organiser Profile</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Update your public organiser profile
                                            </p>
                                        </div>
                                        {activeOrganizers.length > 1 && (
                                            <Select value={activeOrganizerId} onValueChange={setActiveOrganizerId}>
                                                <SelectTrigger className="w-full sm:w-auto border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 [&>svg]:hidden">
                                                    <OrgBadge
                                                        name={currentOrganizer?.name || 'Select'}
                                                        avatarUrl={currentOrganizer?.avatarUrl}
                                                        showChevron
                                                        size="sm"
                                                        className="hover:shadow-md transition-shadow cursor-pointer"
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeOrganizers.map((org) => {
                                                        const color = getOrgColor(org.name);
                                                        return (
                                                            <SelectItem key={org.id} value={org.id} className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    {org.avatarUrl ? (
                                                                        <Image
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
                                                                            width={24}
                                                                            height={24}
                                                                            className="h-6 w-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className={cn(
                                                                            'h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                                                                            color.gradient
                                                                        )}>
                                                                            {org.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span>{org.name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {!canEditOrgSettings && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                Only owners and co-owners can edit organization settings. Contact the team owner for changes.
                                            </p>
                                        </div>
                                    )}

                                    {/* Two-column grid on desktop */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Left Column: Logo & Bio */}
                                        <div className="space-y-6">
                                            {/* Organization Logo Card */}
                                            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                    <h3 className="text-sm font-medium text-foreground">Organization Logo</h3>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            {currentOrganizer?.avatarUrl ? (
                                                                <Image
                                                                    src={currentOrganizer.avatarUrl}
                                                                    alt={currentOrganizer.name}
                                                                    width={64}
                                                                    height={64}
                                                                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                                                                />
                                                            ) : (
                                                                <div className={cn(
                                                                    'h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white bg-linear-to-br',
                                                                    getOrgColor(currentOrganizer?.name || 'O').gradient
                                                                )}>
                                                                    {(currentOrganizer?.name || 'O').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            {isUploadingOrgAvatar && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => orgAvatarInputRef.current?.click()}
                                                                disabled={!canEditOrgSettings || isUploadingOrgAvatar}
                                                            >
                                                                <Upload className="h-4 w-4 mr-1.5" />
                                                                {currentOrganizer?.avatarUrl ? 'Change' : 'Upload'}
                                                            </Button>
                                                            <input
                                                                ref={orgAvatarInputRef}
                                                                type="file"
                                                                accept={AVATAR_ACCEPT}
                                                                className="hidden"
                                                                onChange={handleOrgAvatarSelect}
                                                            />
                                                            {orgAvatarError && <p className="text-xs text-destructive">{orgAvatarError}</p>}
                                                            {orgAvatarSuccess && <p className="text-xs text-emerald-600">Updated!</p>}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-3">JPG, PNG, GIF, or WebP. Max 5MB. You can crop it after uploading.</p>
                                                </div>
                                            </div>

                                            {/* Bio Card */}
                                            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                    <h3 className="text-sm font-medium text-foreground">Bio</h3>
                                                </div>
                                                <div className="p-4 space-y-2">
                                                    <textarea
                                                        id="org-bio"
                                                        rows={5}
                                                        maxLength={2000}
                                                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                                                        placeholder="Tell people about your organization or events..."
                                                        value={organizerProfileForm.bio}
                                                        onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                                    />
                                                    <p className="text-xs text-muted-foreground text-right">{organizerProfileForm.bio.length}/2000</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Contact & Social */}
                                        <div className="space-y-6">
                                            {/* Public Visibility Note */}
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-(--brand-cyan)/5 border border-(--brand-cyan)/10 text-xs text-muted-foreground animate-fade-in relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-linear-to-r from-(--brand-cyan)/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                <div className="p-1.5 rounded-full bg-(--brand-cyan)/10 text-(--brand-cyan) shrink-0 mt-0.5">
                                                    <Globe className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex flex-col gap-0.5 z-10">
                                                    <p className="font-medium text-foreground">Publicly Visible</p>
                                                    <p className="opacity-90">Website and social links will be displayed on your organiser public profile page.</p>
                                                </div>
                                            </div>

                                            {currentOrganizer && !(currentOrganizer.replyToEmail || '').trim() && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                                                    Add an organizer contact email so attendees can reach you directly. This is required before you can publish or restore published events.
                                                </div>
                                            )}

                                            {/* Contact Card */}
                                            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                    <h3 className="text-sm font-medium text-foreground">Contact</h3>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-website" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <Globe className="h-3 w-3" /> Website
                                                        </Label>
                                                        <Input
                                                            id="org-website"
                                                            type="url"
                                                            className="h-10"
                                                            placeholder="https://your-website.com"
                                                            value={organizerProfileForm.website}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, website: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-reply-to" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <Mail className="h-3 w-3" /> Organizer Contact Email
                                                        </Label>
                                                        <Input
                                                            id="org-reply-to"
                                                            type="email"
                                                            className="h-10"
                                                            placeholder="contact@your-organization.com"
                                                            value={organizerProfileForm.replyToEmail}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, replyToEmail: e.target.value }))}
                                                            maxLength={254}
                                                        />
                                                        <p className="text-xs text-muted-foreground">Shown to attendees on event pages, checkout confirmations, and ticket emails. Also used as the reply-to address for organizer emails.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Social Links Card */}
                                            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-border/40 bg-[var(--brand-cyan)]/5">
                                                    <h3 className="text-sm font-medium text-foreground">Social Links</h3>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-instagram" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <Instagram className="h-3 w-3" /> Instagram
                                                        </Label>
                                                        <Input
                                                            id="org-instagram"
                                                            type="url"
                                                            className="h-10"
                                                            placeholder="https://instagram.com/yourprofile"
                                                            value={organizerProfileForm.instagram}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-tiktok" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                            </svg>
                                                            TikTok
                                                        </Label>
                                                        <Input
                                                            id="org-tiktok"
                                                            type="url"
                                                            className="h-10"
                                                            placeholder="https://tiktok.com/@yourprofile"
                                                            value={organizerProfileForm.tiktok}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, tiktok: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-linkedin" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <Linkedin className="h-3 w-3" /> LinkedIn
                                                        </Label>
                                                        <Input
                                                            id="org-linkedin"
                                                            type="url"
                                                            className="h-10"
                                                            placeholder="https://linkedin.com/in/yourprofile"
                                                            value={organizerProfileForm.linkedin}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, linkedin: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="org-youtube" className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                            <Youtube className="h-3 w-3" /> YouTube
                                                        </Label>
                                                        <Input
                                                            id="org-youtube"
                                                            type="url"
                                                            className="h-10"
                                                            placeholder="https://youtube.com/@yourchannel"
                                                            value={organizerProfileForm.youtube}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, youtube: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Follower Notifications Card */}
                                            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                                        <Bell className="h-3.5 w-3.5" /> Follower Notifications
                                                    </h3>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="space-y-1 min-w-0">
                                                            <Label htmlFor="org-follower-notifications" className="text-sm font-medium text-foreground">
                                                                Notify followers about new public events
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                Followers are emailed when this organiser publishes a public event. They can stop updates by unfollowing.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="org-follower-notifications"
                                                            className="mt-0.5 shrink-0"
                                                            checked={organizerProfileForm.sendFollowerEventNotifications}
                                                            disabled={!canEditOrgSettings}
                                                            onCheckedChange={(checked) =>
                                                                setOrganizerProfileForm(prev => ({ ...prev, sendFollowerEventNotifications: checked }))
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save Section - Full Width */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {organizerProfileSaveStatus === 'success' && (
                                                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                                                    <Check className="h-4 w-4" /> Saved
                                                </p>
                                            )}
                                            {organizerProfileSaveStatus === 'error' && (
                                                <p className="text-sm text-destructive flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4" /> {organizerProfileError || 'Save failed'}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleSaveOrganizerProfile}
                                            disabled={isSavingOrganizerProfile || !organizerProfileHasChanges}
                                        >
                                            {isSavingOrganizerProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Currency Tab */}
                            {activeTab === 'currency' && hasActiveOrganizer && activeOrganizerId && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Default Currency</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Set the default currency for new events
                                            </p>
                                        </div>
                                        {activeOrganizers.length > 1 && (
                                            <Select value={activeOrganizerId} onValueChange={setActiveOrganizerId}>
                                                <SelectTrigger className="w-full sm:w-auto border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 [&>svg]:hidden">
                                                    <OrgBadge
                                                        name={currentOrganizer?.name || 'Select'}
                                                        avatarUrl={currentOrganizer?.avatarUrl}
                                                        showChevron
                                                        size="sm"
                                                        className="hover:shadow-md transition-shadow cursor-pointer"
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeOrganizers.map((org) => {
                                                        const color = getOrgColor(org.name);
                                                        return (
                                                            <SelectItem key={org.id} value={org.id} className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    {org.avatarUrl ? (
                                                                        <Image
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
                                                                            width={24}
                                                                            height={24}
                                                                            className="h-6 w-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className={cn(
                                                                            'h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                                                                            color.gradient
                                                                        )}>
                                                                            {org.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span>{org.name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {!canEditOrgSettings && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                Only owners and co-owners can edit organization settings. Contact the team owner for changes.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-5 max-w-xl">
                                        <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                <h3 className="text-sm font-medium text-foreground">Currency Settings</h3>
                                            </div>
                                            <div className="p-4 space-y-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="currency" className="text-muted-foreground">Currency</Label>
                                                    <select
                                                        id="currency"
                                                        value={selectedCurrency}
                                                        onChange={(e) => setSelectedCurrency(e.target.value)}
                                                        disabled={!canEditOrgSettings}
                                                        className="flex h-11 w-full rounded-xl border border-input glass-surface backdrop-blur-sm px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                                    >
                                                        {currencyOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-muted-foreground">
                                                        This is the default currency for your events. You can override this when creating specific events.
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Default currency is locked after the first paid order.
                                                    </p>
                                                </div>

                                                <div className="pt-2">
                                                    <Button
                                                        onClick={handleSaveCurrency}
                                                        disabled={isSaving || selectedCurrency === currentOrganizer?.defaultCurrency}
                                                        className="bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : saveSuccess ? (
                                                            <>
                                                                <Check className="mr-2 h-4 w-4" />
                                                                Saved
                                                            </>
                                                        ) : (
                                                            'Save Currency'
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Marketing Tab */}
                            {activeTab === 'marketing' && hasActiveOrganizer && activeOrganizerId && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Meta Pixel Tracking</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Configure the tracking signals Halal Ticketin can send for this organiser.
                                            </p>
                                        </div>
                                        {activeOrganizers.length > 1 && (
                                            <Select value={activeOrganizerId} onValueChange={setActiveOrganizerId}>
                                                <SelectTrigger className="w-full sm:w-auto border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 [&>svg]:hidden">
                                                    <OrgBadge
                                                        name={currentOrganizer?.name || 'Select'}
                                                        avatarUrl={currentOrganizer?.avatarUrl}
                                                        showChevron
                                                        size="sm"
                                                        className="hover:shadow-md transition-shadow cursor-pointer"
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeOrganizers.map((org) => {
                                                        const color = getOrgColor(org.name);
                                                        return (
                                                            <SelectItem key={org.id} value={org.id} className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    {org.avatarUrl ? (
                                                                        <Image
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
                                                                            width={24}
                                                                            height={24}
                                                                            className="h-6 w-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className={cn(
                                                                            'h-6 w-6 rounded-full bg-linear-to-br flex items-center justify-center text-white text-xs font-bold',
                                                                            color.gradient
                                                                        )}>
                                                                            {org.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span>{org.name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {!canEditOrgSettings && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                Only owners and co-owners can edit organization settings. Contact the team owner for changes.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-5 max-w-xl">
                                        <div className={cn('rounded-lg border p-4', metaTrackingStatusStyles.panel)}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('h-2.5 w-2.5 rounded-full', metaTrackingStatusStyles.dot)} />
                                                    <span className={cn('text-sm font-medium', metaTrackingStatusStyles.label)}>
                                                        {metaTrackingStatus.label}
                                                    </span>
                                                </div>
                                                {metaCapiActive && currentOrganizer?.metaCapiTokenLast4 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        CAPI ••••{currentOrganizer.metaCapiTokenLast4}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                {metaTrackingStatus.summary}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {metaTrackingStatus.purchaseReliability}
                                            </p>
                                            <a
                                                href="https://www.facebook.com/business/help/952192354843755"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                            >
                                                Verify events in Meta Events Manager
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="metaPixelId" className="text-muted-foreground">Meta Pixel ID</Label>
                                            <Input
                                                id="metaPixelId"
                                                value={metaPixelInput}
                                                onChange={(event) => setMetaPixelInput(event.target.value.replace(/\D/g, ''))}
                                                disabled={!canEditOrgSettings}
                                                className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                                placeholder="e.g. 123456789012345"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Loads on organiser event and checkout pages after marketing cookies are accepted.
                                            </p>
                                            {metaPixelStatus === 'success' && (
                                                <p className="text-sm text-green-600 flex items-center gap-1">
                                                    <Check className="h-4 w-4" />
                                                    Pixel ID saved.
                                                </p>
                                            )}
                                            {metaPixelStatus === 'error' && (
                                                <p className="text-sm text-destructive flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {metaPixelError || 'Unable to save Pixel ID.'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setMetaPixelInput('')}
                                                disabled={isSavingMetaPixel || (!metaPixelInput && !currentOrganizer?.metaPixelId)}
                                                className="rounded-xl"
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                onClick={handleSaveMetaPixel}
                                                disabled={isSavingMetaPixel || !metaPixelChanged}
                                                className="bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                            >
                                                {isSavingMetaPixel ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    'Save Pixel'
                                                )}
                                            </Button>
                                        </div>

                                        <div className="space-y-2 pt-4">
                                            <Label htmlFor="metaCapiToken" className="text-muted-foreground">
                                                Conversions API token (optional)
                                            </Label>
                                            <Input
                                                id="metaCapiToken"
                                                type="password"
                                                value={metaCapiTokenInput}
                                                onChange={(event) => setMetaCapiTokenInput(event.target.value)}
                                                disabled={!canEditOrgSettings}
                                                className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                                placeholder="Paste token from Meta Events Manager"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Optional. Improves Purchase tracking when browser events are blocked.
                                            </p>
                                            {metaCapiConnected && (
                                                <p className="text-xs text-emerald-600">
                                                    Connected (••••{currentOrganizer?.metaCapiTokenLast4})
                                                </p>
                                            )}
                                            {metaCapiStatus === 'success' && (
                                                <p className="text-sm text-green-600 flex items-center gap-1">
                                                    <Check className="h-4 w-4" />
                                                    Token saved.
                                                </p>
                                            )}
                                            {metaCapiStatus === 'error' && (
                                                <p className="text-sm text-destructive flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {metaCapiError || 'Unable to save token.'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleSaveMetaCapiToken(true)}
                                                disabled={isSavingMetaCapiToken || !metaCapiConnected}
                                                className="rounded-xl"
                                            >
                                                Remove token
                                            </Button>
                                            <Button
                                                onClick={() => handleSaveMetaCapiToken(false)}
                                                disabled={isSavingMetaCapiToken || metaCapiTokenInput.trim() === ''}
                                                className="bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                            >
                                                {isSavingMetaCapiToken ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    'Save Token'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payments Tab */}
                            {activeTab === 'payments' && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Payment Settings</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Connect your Stripe account for payouts
                                            </p>
                                        </div>
                                        {activeOrganizers.length > 1 && hasActiveOrganizer && (
                                            <Select value={activeOrganizerId ?? undefined} onValueChange={setActiveOrganizerId}>
                                                <SelectTrigger className="w-full sm:w-auto border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 [&>svg]:hidden">
                                                    <OrgBadge
                                                        name={currentOrganizer?.name || 'Select'}
                                                        avatarUrl={currentOrganizer?.avatarUrl}
                                                        showChevron
                                                        size="sm"
                                                        className="hover:shadow-md transition-shadow cursor-pointer"
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeOrganizers.map((org) => {
                                                        const color = getOrgColor(org.name);
                                                        return (
                                                            <SelectItem key={org.id} value={org.id} className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    {org.avatarUrl ? (
                                                                        <Image
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
                                                                            width={24}
                                                                            height={24}
                                                                            className="h-6 w-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className={cn(
                                                                            'h-6 w-6 rounded-full bg-linear-to-br flex items-center justify-center text-white text-xs font-bold',
                                                                            color.gradient
                                                                        )}>
                                                                            {org.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span>{org.name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {hasActiveOrganizer && activeOrganizerId ? (
                                        <div className="space-y-4">
                                            {currentOrganizer && (
                                                <div className="text-sm text-muted-foreground">
                                                    Managing payments for: <span className="font-medium text-foreground">{currentOrganizer.name}</span>
                                                </div>
                                            )}
                                            <StripeConnectStatus organizerId={activeOrganizerId} />
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-muted/30 border border-border rounded-xl">
                                            <div className="flex items-start gap-3 text-muted-foreground">
                                                <AlertCircle className="h-5 w-5 mt-0.5 text-amber-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Organiser profile required</p>
                                                    <p className="text-sm mt-1">
                                                        Create an organiser profile first to set up payments.
                                                    </p>
                                                    <Button variant="outline" className="mt-3 rounded-xl" asChild>
                                                        <a href="/dashboard">Create Organiser Profile</a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Org Avatar Cropper Dialog */}
            <ImageCropperDialog
                open={isCropperOpen}
                onOpenChange={setIsCropperOpen}
                imageSrc={orgAvatarPreview}
                aspectRatio={1}
                title="Crop Organization Logo"
                description="Adjust and crop your organization's logo"
                onCropComplete={handleOrgAvatarCropComplete}
            />
        </>
    );
}
