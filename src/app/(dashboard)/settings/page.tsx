'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
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
    CheckCircle,
    User,
    Coins,
    Target,
    CreditCard,
    ExternalLink,
    Calendar,
    MapPin,
    Camera,
    Building,
    Globe,
    Mail,
    Instagram,
    Linkedin,
    X,
    Youtube,
    Upload
} from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';
import { COUNTRIES } from '@/lib/organizer-options';
import { uploadAvatar, uploadOrganizerAvatar, fileToDataUrl } from '@/lib/upload-api';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { OrgBadge, getOrgColor } from '@/components/dashboard/OrganizerSwitcher';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';

type SettingsTab = 'profile' | 'organizer-profile' | 'currency' | 'marketing' | 'payments';

interface TabItem {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    organizerOnly?: boolean;
}

const TABS: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organizer-profile', label: 'Organizer', icon: Building, organizerOnly: true },
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
}

export default function SettingsPage() {
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
            });
        }
    }, [currentOrganizer]);

    const handleAvatarSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setAvatarError('Please select an image file');
            setAvatarUploadStatus('error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError('Image must be less than 5MB');
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
        if (!file.type.startsWith('image/')) {
            setOrgAvatarError('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setOrgAvatarError('Image must be less than 5MB');
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

        try {
            await api.patch('/api/v1/auth/me', {
                name: profileForm.name || null,
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

            const trimmedReplyTo = organizerProfileForm.replyToEmail.trim();
            payload.replyToEmail = trimmedReplyTo === '' ? null : trimmedReplyTo;

            // Social links - only include non-empty ones
            const socialLinks: Record<string, string> = {};
            if (organizerProfileForm.instagram.trim()) socialLinks.instagram = organizerProfileForm.instagram.trim();
            if (organizerProfileForm.tiktok.trim()) socialLinks.tiktok = organizerProfileForm.tiktok.trim();
            if (organizerProfileForm.linkedin.trim()) socialLinks.linkedin = organizerProfileForm.linkedin.trim();
            if (organizerProfileForm.youtube.trim()) socialLinks.youtube = organizerProfileForm.youtube.trim();

            payload.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : null;

            await api.patch(`/api/v1/organizers/${activeOrganizerId}`, payload);
            setOrganizerProfileSaveStatus('success');
            await refresh();
            setTimeout(() => setOrganizerProfileSaveStatus(null), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update organizer profile. Please try again.';
            setOrganizerProfileSaveStatus('error');
            setOrganizerProfileError(message);
        } finally {
            setIsSavingOrganizerProfile(false);
        }
    };

    const normalizedPixelInput = metaPixelInput.trim();
    const normalizedCurrentPixel = currentOrganizer?.metaPixelId || '';
    const metaPixelChanged = normalizedPixelInput !== normalizedCurrentPixel;

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
            (organizerProfileForm.youtube || '') !== (currentSocialLinks.youtube || '')
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
                                    <div>
                                        <h2 className="text-xl font-semibold mb-1">Profile</h2>
                                        <p className="text-muted-foreground text-sm">Update your personal information</p>
                                    </div>

                                    {/* Avatar Upload Section */}
                                    <div className="flex items-start gap-6 p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <div className="relative group">
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg text-2xl">
                                                <AvatarImage
                                                    src={avatarPreview || user?.avatarUrl || ''}
                                                    alt={user?.name || 'User'}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white">
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                type="button"
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition-colors cursor-pointer group-hover:scale-110 duration-200"
                                            >
                                                <Camera className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                onChange={handleAvatarSelect}
                                                className="hidden"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <h3 className="font-medium">Profile Picture</h3>
                                                <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
                                                <p className="text-xs text-muted-foreground mt-1">Max 5MB • JPEG, PNG, GIF, or WebP • 400×400px recommended</p>
                                            </div>
                                            {avatarFile && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAvatarUpload}
                                                        disabled={isUploadingAvatar}
                                                        className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white"
                                                    >
                                                        {isUploadingAvatar ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            'Upload'
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={cancelAvatarUpload}
                                                        disabled={isUploadingAvatar}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                            {avatarUploadStatus === 'success' && (
                                                <p className="text-sm text-green-600 flex items-center gap-1">
                                                    <Check className="h-4 w-4" />
                                                    Avatar updated successfully
                                                </p>
                                            )}
                                            {avatarUploadStatus === 'error' && (
                                                <p className="text-sm text-destructive flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {avatarError || 'Failed to upload avatar'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-5 max-w-xl">
                                        {/* Display Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-muted-foreground flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Display Name
                                            </Label>
                                            <Input
                                                id="name"
                                                className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                                placeholder="Your display name"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                minLength={2}
                                                maxLength={80}
                                            />
                                        </div>

                                        {/* Email (read-only) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 opacity-60"
                                                placeholder="your@email.com"
                                                defaultValue={user?.email || ''}
                                                maxLength={254}
                                                disabled
                                            />
                                            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                        </div>

                                        {/* Gender */}
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Gender</Label>
                                            <Select
                                                value={profileForm.gender}
                                                onValueChange={(value) => setProfileForm(prev => ({ ...prev, gender: value as 'male' | 'female' | '' }))}
                                                disabled={!!user?.gender}
                                            >
                                                <SelectTrigger className={cn("glass-surface backdrop-blur-sm rounded-xl", user?.gender && "opacity-60")}>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {user?.gender && (
                                                <p className="text-xs text-muted-foreground">Gender cannot be changed once set</p>
                                            )}
                                        </div>

                                        {/* Date of Birth */}
                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfBirth" className="text-muted-foreground flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Date of Birth
                                            </Label>
                                            <DatePicker
                                                id="dateOfBirth"
                                                value={profileForm.dateOfBirth}
                                                onChange={(value) => setProfileForm(prev => ({ ...prev, dateOfBirth: value }))}
                                                placeholder="Select date of birth"
                                                className={cn("glass-surface backdrop-blur-sm rounded-xl", user?.dateOfBirth && "opacity-60")}
                                                maxDate={new Date()}
                                                disabled={!!user?.dateOfBirth}
                                                showYearMonthDropdowns
                                            />
                                            {user?.dateOfBirth && (
                                                <p className="text-xs text-muted-foreground">Date of birth cannot be changed once set</p>
                                            )}
                                        </div>

                                        {/* Country */}
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Country
                                            </Label>
                                            <Select
                                                value={profileForm.homeCountry}
                                                onValueChange={(value) => setProfileForm(prev => ({ ...prev, homeCountry: value }))}
                                            >
                                                <SelectTrigger className="glass-surface backdrop-blur-sm rounded-xl">
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

                                        {/* City */}
                                        <div className="space-y-2">
                                            <Label htmlFor="homeCity" className="text-muted-foreground">City</Label>
                                            <Input
                                                id="homeCity"
                                                className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500"
                                                placeholder="Your city"
                                                value={profileForm.homeCity}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, homeCity: e.target.value }))}
                                            />
                                        </div>

                                        {/* Status messages */}
                                        {profileSaveStatus === 'success' && (
                                            <p className="text-sm text-green-600 flex items-center gap-1">
                                                <Check className="h-4 w-4" />
                                                Profile updated successfully.
                                            </p>
                                        )}
                                        {profileSaveStatus === 'error' && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {profileError || 'Unable to save profile.'}
                                            </p>
                                        )}

                                        {/* Save Button */}
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile || !profileHasChanges}
                                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                            >
                                                {isSavingProfile ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : profileSaveStatus === 'success' ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Updated
                                                    </>
                                                ) : (
                                                    'Save Changes'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Organizer Profile Tab */}
                            {activeTab === 'organizer-profile' && hasActiveOrganizer && activeOrganizerId && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Organizer Profile</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Update your public organizer profile
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
                                                                        <img
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
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
                                        {/* Organization Avatar */}
                                        <div className="space-y-3">
                                            <Label className="text-muted-foreground flex items-center gap-2">
                                                <Camera className="h-4 w-4" />
                                                Organization Logo
                                            </Label>
                                            <div className="flex items-center gap-4">
                                                {/* Avatar Preview */}
                                                <div className="relative">
                                                    {currentOrganizer?.avatarUrl ? (
                                                        <img
                                                            src={currentOrganizer.avatarUrl}
                                                            alt={currentOrganizer.name}
                                                            className="h-20 w-20 rounded-full object-cover ring-2 ring-border shadow-md"
                                                        />
                                                    ) : (
                                                        <div className={cn(
                                                            'h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md bg-gradient-to-br',
                                                            getOrgColor(currentOrganizer?.name || 'O').gradient
                                                        )}>
                                                            {(currentOrganizer?.name || 'O').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {isUploadingOrgAvatar && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Upload Button & Status */}
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => orgAvatarInputRef.current?.click()}
                                                        disabled={!canEditOrgSettings || isUploadingOrgAvatar}
                                                        className="rounded-xl gap-2"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        {currentOrganizer?.avatarUrl ? 'Change Logo' : 'Upload Logo'}
                                                    </Button>
                                                    <input
                                                        ref={orgAvatarInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleOrgAvatarSelect}
                                                    />
                                                    {orgAvatarError && (
                                                        <p className="text-xs text-destructive flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {orgAvatarError}
                                                        </p>
                                                    )}
                                                    {orgAvatarSuccess && (
                                                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Logo updated!
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Recommended: Square image, at least 200x200px. Max 5MB.
                                            </p>
                                        </div>

                                        {/* Bio */}
                                        <div className="space-y-2">
                                            <Label htmlFor="org-bio" className="text-muted-foreground flex items-center gap-2">
                                                <Building className="h-4 w-4" />
                                                Bio
                                            </Label>
                                            <textarea
                                                id="org-bio"
                                                rows={4}
                                                maxLength={2000}
                                                className="flex w-full rounded-xl border border-input glass-surface backdrop-blur-sm px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                                                placeholder="Tell people about your organization or events..."
                                                value={organizerProfileForm.bio}
                                                onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                            />
                                            <p className="text-xs text-muted-foreground text-right">{organizerProfileForm.bio.length}/2000</p>
                                        </div>

                                        {/* Website */}
                                        <div className="space-y-2">
                                            <Label htmlFor="org-website" className="text-muted-foreground flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                Website
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="org-website"
                                                    type="url"
                                                    className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                    placeholder="https://your-website.com"
                                                    value={organizerProfileForm.website}
                                                    onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, website: e.target.value }))}
                                                />
                                                {organizerProfileForm.website && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setOrganizerProfileForm(prev => ({ ...prev, website: '' }))}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                        aria-label="Clear website"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reply-To Email */}
                                        <div className="space-y-2">
                                            <Label htmlFor="org-reply-to" className="text-muted-foreground flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Reply-to email
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="org-reply-to"
                                                    type="email"
                                                    className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                    placeholder="replies@your-organization.com"
                                                    value={organizerProfileForm.replyToEmail}
                                                    onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, replyToEmail: e.target.value }))}
                                                    maxLength={254}
                                                />
                                                {organizerProfileForm.replyToEmail && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setOrganizerProfileForm(prev => ({ ...prev, replyToEmail: '' }))}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                        aria-label="Clear reply-to email"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Used when attendees reply to broadcast emails.</p>
                                        </div>

                                        {/* Social Links Section */}
                                        <div className="pt-4 border-t border-border/50">
                                            <h3 className="text-sm font-medium mb-4">Social Links</h3>
                                            <div className="space-y-4">
                                                {/* Instagram */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="org-instagram" className="text-muted-foreground flex items-center gap-2">
                                                        <Instagram className="h-4 w-4" />
                                                        Instagram
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="org-instagram"
                                                            type="url"
                                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                            placeholder="https://instagram.com/yourprofile"
                                                            value={organizerProfileForm.instagram}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                                                        />
                                                        {organizerProfileForm.instagram && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOrganizerProfileForm(prev => ({ ...prev, instagram: '' }))}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                                aria-label="Clear Instagram"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* TikTok */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="org-tiktok" className="text-muted-foreground flex items-center gap-2">
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                        </svg>
                                                        TikTok
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="org-tiktok"
                                                            type="url"
                                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                            placeholder="https://tiktok.com/@yourprofile"
                                                            value={organizerProfileForm.tiktok}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, tiktok: e.target.value }))}
                                                        />
                                                        {organizerProfileForm.tiktok && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOrganizerProfileForm(prev => ({ ...prev, tiktok: '' }))}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                                aria-label="Clear TikTok"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* LinkedIn */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="org-linkedin" className="text-muted-foreground flex items-center gap-2">
                                                        <Linkedin className="h-4 w-4" />
                                                        LinkedIn
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="org-linkedin"
                                                            type="url"
                                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                            placeholder="https://linkedin.com/in/yourprofile"
                                                            value={organizerProfileForm.linkedin}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, linkedin: e.target.value }))}
                                                        />
                                                        {organizerProfileForm.linkedin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOrganizerProfileForm(prev => ({ ...prev, linkedin: '' }))}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                                aria-label="Clear LinkedIn"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* YouTube */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="org-youtube" className="text-muted-foreground flex items-center gap-2">
                                                        <Youtube className="h-4 w-4" />
                                                        YouTube
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="org-youtube"
                                                            type="url"
                                                            className="glass-surface backdrop-blur-sm rounded-xl transition-all placeholder:text-slate-500 pr-10"
                                                            placeholder="https://youtube.com/@yourchannel"
                                                            value={organizerProfileForm.youtube}
                                                            onChange={(e) => setOrganizerProfileForm(prev => ({ ...prev, youtube: e.target.value }))}
                                                        />
                                                        {organizerProfileForm.youtube && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOrganizerProfileForm(prev => ({ ...prev, youtube: '' }))}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                                                                aria-label="Clear YouTube"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status messages */}
                                        {organizerProfileSaveStatus === 'success' && (
                                            <p className="text-sm text-green-600 flex items-center gap-1">
                                                <Check className="h-4 w-4" />
                                                Organizer profile updated successfully.
                                            </p>
                                        )}
                                        {organizerProfileSaveStatus === 'error' && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {organizerProfileError || 'Unable to save organizer profile.'}
                                            </p>
                                        )}

                                        {/* Save Button */}
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleSaveOrganizerProfile}
                                                disabled={isSavingOrganizerProfile || !organizerProfileHasChanges}
                                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
                                            >
                                                {isSavingOrganizerProfile ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : organizerProfileSaveStatus === 'success' ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Updated
                                                    </>
                                                ) : (
                                                    'Save Changes'
                                                )}
                                            </Button>
                                        </div>
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
                                                                        <img
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
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
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleSaveCurrency}
                                                disabled={isSaving || selectedCurrency === currentOrganizer?.defaultCurrency}
                                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
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
                            )}

                            {/* Marketing Tab */}
                            {activeTab === 'marketing' && hasActiveOrganizer && activeOrganizerId && (
                                <div className="space-y-6 animate-fade-up" style={{ '--fade-delay': '0s' } as React.CSSProperties}>
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-1">Meta Pixel Tracking</h2>
                                            <p className="text-muted-foreground text-sm">
                                                Track ad performance on your event pages
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
                                                                        <img
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
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
                                        {/* Info Box */}
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                            <p className="text-sm text-muted-foreground">
                                                Allow your Meta ads to measure views, checkouts, and purchases on your event + checkout pages (after attendees accept optional cookies).
                                            </p>
                                            <a
                                                href="https://www.facebook.com/business/help/952192354843755"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                                            >
                                                Learn how to verify events in Meta Events Manager
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
                                                We only load this pixel for your public event and checkout pages after attendees opt into marketing cookies.
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
                                                className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl px-8 rounded-xl disabled:opacity-50"
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
                                                                        <img
                                                                            src={org.avatarUrl}
                                                                            alt={org.name}
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
                                                    <p className="text-sm font-medium text-foreground">Organizer profile required</p>
                                                    <p className="text-sm mt-1">
                                                        Create an organizer profile first to set up payments.
                                                    </p>
                                                    <Button variant="outline" className="mt-3 rounded-xl" asChild>
                                                        <a href="/dashboard">Create Organizer Profile</a>
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
