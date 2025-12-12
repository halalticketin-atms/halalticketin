'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeft,
    Users,
    Mail,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Trash2,
} from 'lucide-react';
import {
    fetchTeamMemberships,
    fetchTeamInvitations,
    createTeamInvitation,
    revokeTeamInvitation,
    updateTeamMembership,
    fetchOrganizerEventOptions,
    eventScopeToInput,
    type CreateInvitationPayload,
    type EventScopeInput,
    type OrganizerEventOption,
} from '@/lib/organizers-api';
import type { EventScope, TeamInvitation, TeamMember } from '@/types';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin', description: 'Full access except payouts' },
    { value: 'editor', label: 'Editor', description: 'Manage events and tickets' },
    { value: 'check_in', label: 'Check-in', description: 'Access check-in tools only' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only analytics' },
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
                        <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                            {events.map((event) => {
                                const checked = value.eventIds?.includes(event.id);
                                return (
                                    <label
                                        key={event.id}
                                        className="flex items-center gap-3 rounded-md border border-transparent p-2 hover:bg-muted/50"
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
                                            <div className="relative h-8 w-8 overflow-hidden rounded">
                                                <Image
                                                    src={event.bannerImageUrl}
                                                    alt=""
                                                    fill
                                                    sizes="32px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center text-xs text-muted-foreground">
                                                {event.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm">{event.name}</span>
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

const EventScopeBadge = ({
    scope,
    eventsMap,
}: {
    scope: EventScope;
    eventsMap: Map<string, OrganizerEventOption>;
}) => {
    if (scope.mode === 'all') {
        return <Badge variant="outline">All events</Badge>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">Limited access ({scope.eventIds.length})</Badge>
            {scope.eventIds.map((eventId) => {
                const event = eventsMap.get(eventId);
                return (
                    <Badge key={eventId} variant="outline">
                        {event?.name ?? eventId.slice(0, 6)}
                    </Badge>
                );
            })}
        </div>
    );
};

export default function OrganizerTeamPage() {
    const router = useRouter();
    const organizerId = useOrganizerFromParams();
    const [memberships, setMemberships] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [events, setEvents] = useState<OrganizerEventOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editForm, setEditForm] = useState<{
        role: string;
        status: string;
        eventScope: EventScopeInput;
    } | null>(null);
    const [inviteForm, setInviteForm] = useState<CreateInvitationPayload & { eventScope: EventScopeInput }>({
        email: '',
        role: 'viewer',
        eventScope: defaultEventScope,
    });

    const eventsMap = useMemo(() => new Map(events.map((evt) => [evt.id, evt])), [events]);

    const loadTeamData = useCallback(async () => {
        if (!organizerId) {
            return;
        }

        setIsLoading(true);
        try {
            const [membersResponse, invitationsResponse] = await Promise.all([
                fetchTeamMemberships(organizerId),
                fetchTeamInvitations(organizerId),
            ]);
            setMemberships(membersResponse.memberships);
            setInvitations(invitationsResponse.invitations);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load team members');
        } finally {
            setIsLoading(false);
        }
    }, [organizerId]);

    const loadEvents = useCallback(async () => {
        if (!organizerId) {
            return;
        }
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
        if (!organizerId) {
            return;
        }
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
                    ? 'Invitation sent via email.'
                    : response.token
                        ? `Send this link manually: ${response.acceptUrl}`
                        : 'Invitation created.'
            );
            setInviteForm({
                email: '',
                role: 'viewer',
                eventScope: defaultEventScope,
            });
            await loadTeamData();
        } catch (err) {
            console.error(err);
            setInviteError(err instanceof Error ? err.message : 'Failed to create invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        if (!organizerId) {
            return;
        }
        await revokeTeamInvitation(organizerId, invitationId);
        await loadTeamData();
    };

    const openEditDialog = (member: TeamMember) => {
        if (member.role === 'owner') {
            return;
        }
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
        if (!organizerId || !editingMember || !editForm) {
            return;
        }
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

    if (!organizerId) {
        return (
            <div className="min-h-screen bg-muted/30">
                <div className="container py-16">
                    <Card>
                        <CardContent className="py-12 text-center space-y-3">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                            <h2 className="text-xl font-semibold">Select an organizer first</h2>
                            <p className="text-muted-foreground">
                                Use the organiser switcher to choose which team you want to manage.
                            </p>
                            <Button asChild>
                                <Link href="/dashboard">Go to dashboard</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const pendingInvites = invitations.filter((invite) => invite.status === 'pending');
    const inactiveInvites = invitations.filter((invite) => invite.status !== 'pending');

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 space-y-8">
                <div className="flex flex-col gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => router.push(buildDashboardPath(organizerId))}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to overview
                    </Button>
                    <div>
                        <h1 className="font-display text-2xl font-bold">Team & Permissions</h1>
                        <p className="text-muted-foreground">
                            Control who can access this organizer and limit access to specific events.
                        </p>
                    </div>
                </div>

                {error && (
                    <Card className="border-destructive/40 bg-destructive/5">
                        <CardContent className="py-4 flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <p className="text-sm text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Invite Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Invite a team member
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleInviteSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email address</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="team@company.com"
                                    value={inviteForm.email}
                                    onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={inviteForm.role}
                                    onValueChange={(role) => setInviteForm((prev) => ({ ...prev, role: role as CreateInvitationPayload['role'] }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div>
                                                    <p className="font-medium">{option.label}</p>
                                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <EventScopeSelector
                                    value={inviteForm.eventScope}
                                    onChange={(scope) => setInviteForm((prev) => ({ ...prev, eventScope: scope }))}
                                    events={events}
                                />
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-2">
                                <Button type="submit" className="w-full md:w-auto" disabled={isInviting}>
                                    {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send invitation
                                </Button>
                                {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                                {inviteSuccess && <p className="text-sm text-emerald-600">{inviteSuccess}</p>}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Current Team */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Current team ({memberships.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading team members...
                            </div>
                        ) : memberships.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <p className="text-muted-foreground">No team members yet.</p>
                                <p className="text-sm text-muted-foreground">
                                    Invite your first collaborator using the form above.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Scope</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {memberships.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={member.user.avatarUrl ?? undefined} />
                                                            <AvatarFallback>
                                                                {member.user.name?.charAt(0).toUpperCase() ??
                                                                    member.user.email.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{member.user.name ?? member.user.email}</p>
                                                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {member.role.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={member.status === 'active' ? 'secondary' : 'outline'}
                                                        className="capitalize"
                                                    >
                                                        {member.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <EventScopeBadge scope={member.eventScope} eventsMap={eventsMap} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(member)}
                                                        disabled={member.role === 'owner'}
                                                    >
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Invitations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending invitations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {pendingInvites.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending invites.</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex flex-col gap-2 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div>
                                            <p className="font-medium">{invite.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Role: {invite.role.replace('_', ' ')} • Expires{' '}
                                                {new Date(invite.expiresAt).toLocaleDateString()}
                                            </p>
                                            <EventScopeBadge scope={invite.eventScope} eventsMap={eventsMap} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleRevokeInvitation(invite.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Revoke
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {inactiveInvites.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Completed invitations</p>
                                <div className="grid gap-2">
                                    {inactiveInvites.map((invite) => (
                                        <div
                                            key={invite.id}
                                            className="flex items-center justify-between rounded-md border border-dashed border-border/60 px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                                <span>{invite.email}</span>
                                            </div>
                                            <Badge variant="outline" className="capitalize">
                                                {invite.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={Boolean(editingMember)} onOpenChange={(open) => !open && closeEditDialog()}>
                {editingMember && editForm && (
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Manage access for {editingMember.user.name ?? editingMember.user.email}</DialogTitle>
                            <DialogDescription>
                                Update their role, status, or limit them to specific events.
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

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={closeEditDialog}>
                                Cancel
                            </Button>
                            <Button onClick={() => void handleSaveMembership()} disabled={editSaving}>
                                {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
