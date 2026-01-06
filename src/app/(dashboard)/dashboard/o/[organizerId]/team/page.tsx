'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Users,
    Mail,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Trash2,
    MoreVertical,
    UserPlus,
    Clock,
    ChevronDown,
    ChevronUp,
    Building2,
    Calendar,
    Shield,
    Crown,
    ShieldCheck,
    PenLine,
    QrCode,
    Check,
    AlertCircle,
    Send,
} from 'lucide-react';
import {
    fetchTeamMemberships,
    fetchTeamInvitations,
    createTeamInvitation,
    revokeTeamInvitation,
    updateTeamMembership,
    deleteTeamMembership,
    fetchOrganizerEventOptions,
    fetchOrganizerCollaborations,
    removeCollaboration,
    updateCollaborationStatus,
    eventScopeToInput,
    type CreateInvitationPayload,
    type EventScopeInput,
    type OrganizerEventOption,
    type HostedCollaboration,
    type PartnerCollaboration,
} from '@/lib/organizers-api';
import type { EventScope, TeamInvitation, TeamMember } from '@/types';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';
import { useOrganizers } from '@/context/organizer-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
    {
        value: 'co_owner',
        label: 'Co-owner',
        description: 'Full access to everything, same as the owner. Can manage billing, payouts, and all team settings.',
        shortDesc: 'Full access like owner',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    },
    {
        value: 'admin',
        label: 'Admin',
        description: 'Full access except payment settings. Can manage team, refunds, and all events.',
        shortDesc: 'Full access except payouts',
        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
    },
    {
        value: 'editor',
        label: 'Editor',
        description: 'Create and edit events, manage tickets. Cannot issue refunds or manage team members.',
        shortDesc: 'Manage events and tickets',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    },
    {
        value: 'check_in',
        label: 'Check-in',
        description: 'Access check-in tools only. Perfect for door staff and volunteers.',
        shortDesc: 'Check-in access only',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
];

const defaultEventScope: EventScopeInput = { mode: 'all' };

interface EventScopeSelectorProps {
    value: EventScopeInput;
    onChange: (value: EventScopeInput) => void;
    disabled?: boolean;
    events: OrganizerEventOption[];
}

function EventScopeSelector({ value, onChange, disabled, events }: EventScopeSelectorProps) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label className="text-sm font-medium">Event access</Label>
                <Select
                    value={value.mode}
                    onValueChange={(mode) => {
                        if (mode === 'all') {
                            onChange({ mode: 'all' });
                        } else {
                            onChange({ mode: 'limited', eventIds: value.mode === 'limited' ? value.eventIds : [] });
                        }
                    }}
                    disabled={disabled}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All current & future events</SelectItem>
                        <SelectItem value="limited">Limited to selected events</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {value.mode === 'limited' && (
                <div className="rounded-lg border border-dashed border-border/60 p-3">
                    {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No events found for this organizer yet. Create an event first to limit access.
                        </p>
                    ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {events.map((event) => {
                                const checked = value.eventIds?.includes(event.id);
                                return (
                                    <label
                                        key={event.id}
                                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(isChecked) => {
                                                if (isChecked) {
                                                    const nextIds = Array.from(new Set([...(value.eventIds ?? []), event.id]));
                                                    onChange({ mode: 'limited', eventIds: nextIds });
                                                } else {
                                                    const nextIds = (value.eventIds ?? []).filter((id) => id !== event.id);
                                                    onChange({ mode: 'limited', eventIds: nextIds });
                                                }
                                            }}
                                            disabled={disabled}
                                        />
                                        {event.bannerImageUrl ? (
                                            <div className="relative h-6 w-6 overflow-hidden rounded">
                                                <Image
                                                    src={event.bannerImageUrl}
                                                    alt=""
                                                    fill
                                                    sizes="24px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                {event.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm truncate">{event.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getRoleColor(role: string) {
    return ROLE_OPTIONS.find(r => r.value === role)?.color ?? 'bg-gray-100 text-gray-700';
}

function getRoleLabel(role: string) {
    return ROLE_OPTIONS.find(r => r.value === role)?.label ?? role.replace('_', ' ');
}

// Compact member card component
function MemberCard({
    member,
    eventsMap,
    onManage,
}: {
    member: TeamMember;
    eventsMap: Map<string, OrganizerEventOption>;
    onManage: () => void;
}) {
    const isOwner = member.role === 'owner';
    const scopeLabel = member.eventScope.mode === 'all'
        ? 'All events'
        : `${member.eventScope.eventIds.length} event${member.eventScope.eventIds.length !== 1 ? 's' : ''}`;

    return (
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:border-border transition-colors">
            <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-sm font-medium">
                    {member.user.name?.charAt(0).toUpperCase() ?? member.user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                        {member.user.name ?? member.user.email.split('@')[0]}
                    </p>
                    {member.status === 'suspended' && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                            Suspended
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
            </div>

            <div className="flex items-center gap-3">
                <Badge className={`text-xs font-medium ${getRoleColor(member.role)} border-0`}>
                    {isOwner ? 'Owner' : getRoleLabel(member.role)}
                </Badge>
                <span className="hidden md:inline text-xs text-muted-foreground">{scopeLabel}</span>
            </div>

            {!isOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onManage}>
                            Manage access
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

// Compact pending invite card
function InviteCard({
    invite,
    eventsMap,
    onRevoke,
}: {
    invite: TeamInvitation;
    eventsMap: Map<string, OrganizerEventOption>;
    onRevoke: () => void;
}) {
    const scopeLabel = invite.eventScope.mode === 'all'
        ? 'All events'
        : `${invite.eventScope.eventIds.length} event${invite.eventScope.eventIds.length !== 1 ? 's' : ''}`;

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{invite.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getRoleLabel(invite.role)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={onRevoke}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default function OrganizerTeamPage() {
    const router = useRouter();
    const organizerId = useOrganizerFromParams();
    const [memberships, setMemberships] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [events, setEvents] = useState<OrganizerEventOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite dialog
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [inviteForm, setInviteForm] = useState<CreateInvitationPayload & { eventScope: EventScopeInput }>({
        email: '',
        role: 'check_in',
        eventScope: defaultEventScope,
    });

    // Edit dialog
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editForm, setEditForm] = useState<{
        role: string;
        status: string;
        eventScope: EventScopeInput;
    } | null>(null);

    // Pending invites section
    const [showPendingInvites, setShowPendingInvites] = useState(true);

    // Collaborations
    const [hostedCollabs, setHostedCollabs] = useState<HostedCollaboration[]>([]);
    const [partnerCollabs, setPartnerCollabs] = useState<PartnerCollaboration[]>([]);
    const [showCollabs, setShowCollabs] = useState(true);
    const [collabActionId, setCollabActionId] = useState<string | null>(null);

    const { organizers } = useOrganizers();
    const activeRole = organizers.find((org) => org.id === organizerId)?.role;
    const canManageCollaborations = activeRole
        ? ['owner', 'co_owner', 'admin', 'editor'].includes(activeRole)
        : false;
    const canRespondToCollaborations = activeRole
        ? ['owner', 'co_owner', 'admin'].includes(activeRole)
        : false;

    const eventsMap = useMemo(() => new Map(events.map((evt) => [evt.id, evt])), [events]);

    const loadTeamData = useCallback(async () => {
        if (!organizerId) return;

        setIsLoading(true);
        try {
            const [membersResponse, invitationsResponse, collabsResponse] = await Promise.all([
                fetchTeamMemberships(organizerId),
                fetchTeamInvitations(organizerId),
                fetchOrganizerCollaborations(organizerId),
            ]);
            setMemberships(membersResponse.memberships);
            setInvitations(invitationsResponse.invitations);
            setHostedCollabs(collabsResponse.hostedCollaborations);
            setPartnerCollabs(collabsResponse.partnerCollaborations);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load team members');
        } finally {
            setIsLoading(false);
        }
    }, [organizerId]);

    const loadEvents = useCallback(async () => {
        if (!organizerId) return;
        try {
            const eventOptions = await fetchOrganizerEventOptions(organizerId);
            setEvents(eventOptions);
        } catch (err) {
            console.warn('Unable to fetch events for team scope selector', err);
        }
    }, [organizerId]);

    useEffect(() => {
        if (!organizerId) {
            setMemberships([]);
            setInvitations([]);
            return;
        }
        void loadTeamData();
        void loadEvents();
    }, [organizerId, loadEvents, loadTeamData]);

    const handleInviteSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!organizerId) return;

        setIsInviting(true);
        setInviteError(null);
        setInviteSuccess(null);

        try {
            const payload: CreateInvitationPayload = {
                email: inviteForm.email,
                role: inviteForm.role,
            };
            if (inviteForm.eventScope.mode === 'limited' && (inviteForm.eventScope.eventIds?.length ?? 0) > 0) {
                payload.eventScope = {
                    mode: 'limited',
                    eventIds: inviteForm.eventScope.eventIds,
                };
            } else {
                payload.eventScope = { mode: 'all' };
            }

            const response = await createTeamInvitation(organizerId, payload);
            setInviteSuccess(
                response.emailSent
                    ? 'Invitation sent!'
                    : response.token
                        ? `Send this link: ${response.acceptUrl}`
                        : 'Invitation created.'
            );
            setInviteForm({
                email: '',
                role: 'check_in',
                eventScope: defaultEventScope,
            });
            await loadTeamData();
            setTimeout(() => setIsInviteOpen(false), 1500);
        } catch (err) {
            console.error(err);
            setInviteError(err instanceof Error ? err.message : 'Failed to create invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        if (!organizerId) return;
        await revokeTeamInvitation(organizerId, invitationId);
        await loadTeamData();
    };

    const handleCollaborationDecision = async (
        collaboration: PartnerCollaboration,
        status: 'accepted' | 'declined'
    ) => {
        setCollabActionId(collaboration.id);
        try {
            await updateCollaborationStatus(collaboration.eventId, collaboration.id, status);
            await loadTeamData();
        } finally {
            setCollabActionId(null);
        }
    };

    const handleRemoveCollaboration = async (collaboration: HostedCollaboration) => {
        setCollabActionId(collaboration.id);
        try {
            await removeCollaboration(collaboration.eventId, collaboration.id);
            await loadTeamData();
        } finally {
            setCollabActionId(null);
        }
    };

    const openEditDialog = (member: TeamMember) => {
        if (member.role === 'owner') return;
        setEditingMember(member);
        setEditForm({
            role: member.role,
            status: member.status === 'suspended' ? 'suspended' : 'active',
            eventScope: eventScopeToInput(member.eventScope),
        });
    };

    const closeEditDialog = () => {
        setEditingMember(null);
        setEditForm(null);
        setEditSaving(false);
    };

    const handleSaveMembership = async () => {
        if (!organizerId || !editingMember || !editForm) return;

        setEditSaving(true);
        try {
            const payload = {
                role: editForm.role as CreateInvitationPayload['role'],
                status: editForm.status as 'active' | 'suspended',
                eventScope:
                    editForm.eventScope.mode === 'limited'
                        ? { mode: 'limited' as const, eventIds: editForm.eventScope.eventIds }
                        : { mode: 'all' as const },
            };
            await updateTeamMembership(organizerId, editingMember.id, payload);
            await loadTeamData();
            closeEditDialog();
        } catch (err) {
            console.error(err);
            setEditSaving(false);
            setError(err instanceof Error ? err.message : 'Failed to update membership');
        }
    };

    const handleRemoveMember = async () => {
        if (!organizerId || !editingMember) return;

        const memberName = editingMember.user.name || editingMember.user.email;
        const confirmed = confirm(
            `Remove ${memberName} from the team?\n\nThis cannot be undone. They will need to be re-invited to regain access.`
        );
        if (!confirmed) return;

        setEditSaving(true);
        try {
            await deleteTeamMembership(organizerId, editingMember.id);
            await loadTeamData();
            closeEditDialog();
        } catch (err) {
            console.error(err);
            setEditSaving(false);
            setError(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    if (!organizerId) {
        return (
            <div className="min-h-screen bg-muted/30">
                <div className="container py-16">
                    <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold">Select an organizer first</h2>
                        <p className="text-muted-foreground">
                            Use the organizer switcher to choose which team you want to manage.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard">Go to dashboard</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const pendingInvites = invitations.filter((invite) => invite.status === 'pending');

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-4 -ml-2"
                        onClick={() => router.push(buildDashboardPath(organizerId))}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-2xl font-bold">Team</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage who can access this organizer
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsInviteOpen(true)}
                            className="bg-gradient-to-r from-primary to-[var(--brand-teal)] hover:opacity-90 transition-opacity"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite
                        </Button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 mt-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">{memberships.length}</p>
                                <p className="text-xs text-muted-foreground">Members</p>
                            </div>
                        </div>
                        {pendingInvites.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-semibold">{pendingInvites.length}</p>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg border border-destructive/40 bg-destructive/5 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Members List */}
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground">Members</h2>

                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Loading team...</p>
                        </div>
                    ) : memberships.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed rounded-lg">
                            <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-muted-foreground">No team members yet</p>
                            <p className="text-sm text-muted-foreground/70">
                                Invite your first collaborator
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {memberships.map((member, index) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                >
                                    <MemberCard
                                        member={member}
                                        eventsMap={eventsMap}
                                        onManage={() => openEditDialog(member)}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Invitations */}
                {pendingInvites.length > 0 && (
                    <div className="mt-8 space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowPendingInvites(!showPendingInvites)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPendingInvites ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Pending invitations ({pendingInvites.length})
                        </button>

                        {showPendingInvites && (
                            <div className="space-y-2">
                                {pendingInvites.map((invite, index) => (
                                    <motion.div
                                        key={invite.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.2 }}
                                    >
                                        <InviteCard
                                            invite={invite}
                                            eventsMap={eventsMap}
                                            onRevoke={() => handleRevokeInvitation(invite.id)}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Collaborating Organizations */}
                {(hostedCollabs.length > 0 || partnerCollabs.length > 0) && (
                    <div className="mt-8 space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowCollabs(!showCollabs)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showCollabs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <Building2 className="h-4 w-4" />
                            Collaborating Organizations ({hostedCollabs.length + partnerCollabs.length})
                        </button>

                        {showCollabs && (
                            <div className="space-y-4">
                                {/* Partner orgs collaborating on OUR events */}
                                {hostedCollabs.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                                            Partners on your events
                                        </p>
                                        {hostedCollabs.map((collab, index) => (
                                            <motion.div
                                                key={collab.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05, duration: 0.2 }}
                                                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={collab.partnerOrg.avatarUrl || undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {collab.partnerOrg.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{collab.partnerOrg.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span className="truncate">{collab.eventTitle}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant={collab.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                                                        {collab.status}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {collab.accessLevel}
                                                    </Badge>
                                                    {canManageCollaborations && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCollaboration(collab)}
                                                            disabled={collabActionId === collab.id}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Events where WE are a partner */}
                                {partnerCollabs.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                                            Events you&apos;re collaborating on
                                        </p>
                                        {partnerCollabs.map((collab, index) => (
                                            <motion.div
                                                key={collab.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05, duration: 0.2 }}
                                                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={collab.hostOrg.avatarUrl || undefined} />
                                                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                        {collab.hostOrg.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{collab.eventTitle}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Hosted by</span>
                                                        <span className="font-medium text-foreground">{collab.hostOrg.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant={collab.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                                                        {collab.status}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {collab.accessLevel}
                                                    </Badge>
                                                    {collab.status === 'pending' && canRespondToCollaborations && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleCollaborationDecision(collab, 'accepted')}
                                                                disabled={collabActionId === collab.id}
                                                            >
                                                                Accept
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleCollaborationDecision(collab, 'declined')}
                                                                disabled={collabActionId === collab.id}
                                                            >
                                                                Decline
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
                    {/* Header with gradient accent */}
                    <div className="relative px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                        <DialogHeader className="relative">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                <DialogTitle className="text-xl">Invite team member</DialogTitle>
                            </div>
                            <DialogDescription className="text-muted-foreground">
                                Send an invitation to collaborate on your events
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleInviteSubmit} className="p-6 space-y-6">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <Label htmlFor="invite-email" className="text-sm font-medium flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Email address
                            </Label>
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="colleague@company.com"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                                required
                                className="h-11 rounded-xl"
                            />
                        </div>

                        {/* Role Selection - Card Grid */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                Select role
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLE_OPTIONS.map((option) => {
                                    const isSelected = inviteForm.role === option.value;
                                    const RoleIcon = option.value === 'co_owner' ? Crown :
                                        option.value === 'admin' ? ShieldCheck :
                                            option.value === 'editor' ? PenLine :
                                                QrCode;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setInviteForm((prev) => ({ ...prev, role: option.value as CreateInvitationPayload['role'] }))}
                                            className={cn(
                                                'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                                                'hover:shadow-md hover:scale-[1.02]',
                                                isSelected
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-border hover:border-primary/50'
                                            )}
                                        >
                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Icon */}
                                            <div className={cn(
                                                'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                                                option.color
                                            )}>
                                                <RoleIcon className="h-5 w-5" />
                                            </div>

                                            {/* Content */}
                                            <p className="font-semibold text-sm mb-1">{option.label}</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {option.shortDesc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Expanded description for selected role */}
                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        {ROLE_OPTIONS.find(r => r.value === inviteForm.role)?.label}:
                                    </span>{' '}
                                    {ROLE_OPTIONS.find(r => r.value === inviteForm.role)?.description}
                                </p>
                            </div>
                        </div>

                        {/* Event Access */}
                        <EventScopeSelector
                            value={inviteForm.eventScope}
                            onChange={(scope) => setInviteForm((prev) => ({ ...prev, eventScope: scope }))}
                            events={events}
                        />

                        {/* Status Messages */}
                        {inviteError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                <p className="text-sm text-destructive">{inviteError}</p>
                            </div>
                        )}
                        {inviteSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                                <p className="text-sm text-emerald-600">{inviteSuccess}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInviteOpen(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isInviting}
                                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 gap-2 px-6"
                            >
                                {isInviting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Send invitation
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            <Dialog open={Boolean(editingMember)} onOpenChange={(open) => !open && closeEditDialog()}>
                {editingMember && editForm && (
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Manage access</DialogTitle>
                            <DialogDescription>
                                Update {editingMember.user.name ?? editingMember.user.email}&apos;s permissions
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={editForm.role}
                                    onValueChange={(role) =>
                                        setEditForm((prev) => (prev ? { ...prev, role } : prev))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editForm.status}
                                    onValueChange={(status) =>
                                        setEditForm((prev) => (prev ? { ...prev, status } : prev))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <EventScopeSelector
                                value={editForm.eventScope}
                                onChange={(scope) =>
                                    setEditForm((prev) => (prev ? { ...prev, eventScope: scope } : prev))
                                }
                                events={events}
                            />
                        </div>

                        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => void handleRemoveMember()}
                                disabled={editSaving}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove from team
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={closeEditDialog}>
                                    Cancel
                                </Button>
                                <Button onClick={() => void handleSaveMembership()} disabled={editSaving}>
                                    {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save changes
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
