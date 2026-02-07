'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Loader2, Mail, Send, Upload, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import {
    addContactsToEmailMarketingGroup,
    createEmailMarketingCampaign,
    createEmailMarketingGroup,
    deleteEmailMarketingContact,
    deleteEmailMarketingGroup,
    estimateEmailMarketingRecipients,
    fetchEmailMarketingCampaigns,
    fetchEmailMarketingContacts,
    fetchEmailMarketingGroups,
    importEmailMarketingContactsCsv,
    removeContactFromEmailMarketingGroup,
    sendEmailMarketingCampaign,
    updateEmailMarketingContact,
    updateEmailMarketingGroup,
    type EmailMarketingCampaign,
    type EmailMarketingContact,
    type EmailMarketingGroup,
} from '@/lib/email-marketing-api';
import { toast } from '@/lib/notifications';
import { buildDashboardPath } from '@/lib/organizer-path';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CsvPreview = {
    rows: number;
    uniqueValid: number;
    invalid: number;
    duplicates: number;
};

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
    const emailHeaderIndex = firstRow.findIndex((cell) => ['email', 'email address', 'e-mail', 'e-mail address'].includes(cell));
    const hasHeader = emailHeaderIndex >= 0;
    const startRow = hasHeader ? 1 : 0;
    const resolvedEmailIndex = emailHeaderIndex >= 0 ? emailHeaderIndex : 0;

    const deduped = new Set<string>();
    let invalid = 0;
    let duplicates = 0;

    for (let i = startRow; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const emailRaw = (row[resolvedEmailIndex] ?? row[0] ?? '').trim();
        if (!emailRaw) {
            continue;
        }

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

export default function EmailMarketingPage() {
    const organizerId = useOrganizerFromParams();

    const [activeTab, setActiveTab] = useState<'contacts' | 'groups' | 'campaigns'>('contacts');

    const [contacts, setContacts] = useState<EmailMarketingContact[]>([]);
    const [contactSearchInput, setContactSearchInput] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [contactPage, setContactPage] = useState(1);
    const [contactTotalPages, setContactTotalPages] = useState(1);
    const [contactTotal, setContactTotal] = useState(0);
    const [contactsLoading, setContactsLoading] = useState(false);

    const [csvFileName, setCsvFileName] = useState('');
    const [csvText, setCsvText] = useState('');
    const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
    const [importingCsv, setImportingCsv] = useState(false);

    const [groups, setGroups] = useState<EmailMarketingGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupDescription, setEditGroupDescription] = useState('');
    const [updatingGroup, setUpdatingGroup] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState(false);

    const [groupMembers, setGroupMembers] = useState<EmailMarketingContact[]>([]);
    const [groupMembersLoading, setGroupMembersLoading] = useState(false);
    const [groupMembersPage, setGroupMembersPage] = useState(1);
    const [groupMembersTotalPages, setGroupMembersTotalPages] = useState(1);
    const [groupMembersTotal, setGroupMembersTotal] = useState(0);
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [addingMembers, setAddingMembers] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
    const [editingContact, setEditingContact] = useState<EmailMarketingContact | null>(null);
    const [editContactFirstName, setEditContactFirstName] = useState('');
    const [editContactLastName, setEditContactLastName] = useState('');
    const [editContactFullName, setEditContactFullName] = useState('');
    const [savingContact, setSavingContact] = useState(false);

    const [campaigns, setCampaigns] = useState<EmailMarketingCampaign[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [campaignMessage, setCampaignMessage] = useState('');
    const [campaignGroupIds, setCampaignGroupIds] = useState<Set<string>>(new Set());
    const [estimating, setEstimating] = useState(false);
    const [recipientEstimate, setRecipientEstimate] = useState<number | null>(null);
    const [creatingCampaign, setCreatingCampaign] = useState(false);
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);

    const selectedGroup = useMemo(
        () => groups.find((group) => group.id === selectedGroupId) ?? null,
        [groups, selectedGroupId]
    );

    const attendeeEmailPath = organizerId ? buildDashboardPath(organizerId, '/email-attendees') : '/dashboard';

    const loadContacts = useCallback(
        async ({ page, search }: { page: number; search: string }) => {
            if (!organizerId) {
                return;
            }
            setContactsLoading(true);
            try {
                const response = await fetchEmailMarketingContacts(organizerId, {
                    page,
                    pageSize: 25,
                    search: search.trim() || undefined,
                });
                setContacts(response.data);
                setContactPage(response.pagination.page);
                setContactTotal(response.pagination.total);
                setContactTotalPages(response.pagination.totalPages);
            } catch (error) {
                toast.error(error, 'Failed to load contacts');
            } finally {
                setContactsLoading(false);
            }
        },
        [organizerId]
    );

    const loadGroups = useCallback(async () => {
        if (!organizerId) {
            return;
        }
        setGroupsLoading(true);
        try {
            const response = await fetchEmailMarketingGroups(organizerId);
            setGroups(response.data);
            if (response.data.length === 0) {
                setSelectedGroupId(null);
                setEditGroupName('');
                setEditGroupDescription('');
                return;
            }
            if (!selectedGroupId || !response.data.some((group) => group.id === selectedGroupId)) {
                const firstGroup = response.data[0];
                setSelectedGroupId(firstGroup.id);
                setEditGroupName(firstGroup.name);
                setEditGroupDescription(firstGroup.description ?? '');
            }
        } catch (error) {
            toast.error(error, 'Failed to load groups');
        } finally {
            setGroupsLoading(false);
        }
    }, [organizerId, selectedGroupId]);

    const loadCampaigns = useCallback(async () => {
        if (!organizerId) {
            return;
        }
        setCampaignsLoading(true);
        try {
            const response = await fetchEmailMarketingCampaigns(organizerId);
            setCampaigns(response.data);
        } catch (error) {
            toast.error(error, 'Failed to load campaigns');
        } finally {
            setCampaignsLoading(false);
        }
    }, [organizerId]);

    const loadGroupMembers = useCallback(
        async (groupId: string, page = 1) => {
            if (!organizerId) {
                return;
            }
            setGroupMembersLoading(true);
            try {
                const response = await fetchEmailMarketingContacts(organizerId, {
                    page,
                    pageSize: 50,
                    groupId,
                });
                setGroupMembers(response.data);
                setGroupMembersPage(response.pagination.page);
                setGroupMembersTotal(response.pagination.total);
                setGroupMembersTotalPages(response.pagination.totalPages);
            } catch (error) {
                toast.error(error, 'Failed to load group members');
            } finally {
                setGroupMembersLoading(false);
            }
        },
        [organizerId]
    );

    useEffect(() => {
        if (!organizerId) {
            return;
        }

        void Promise.all([
            loadContacts({ page: 1, search: '' }),
            loadGroups(),
            loadCampaigns(),
        ]);
        // Intentionally initialize once per organizer to avoid reloading all tabs on local selection changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizerId]);

    useEffect(() => {
        if (!selectedGroupId) {
            setGroupMembers([]);
            setGroupMembersPage(1);
            setGroupMembersTotalPages(1);
            setGroupMembersTotal(0);
            return;
        }

        void loadGroupMembers(selectedGroupId, 1);
    }, [selectedGroupId, loadGroupMembers]);

    const handleSearchSubmit = async () => {
        setContactSearch(contactSearchInput);
        await loadContacts({ page: 1, search: contactSearchInput });
    };

    const handleCsvFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error('Only .csv files are supported');
            return;
        }

        try {
            const text = await file.text();
            setCsvFileName(file.name);
            setCsvText(text);
            setCsvPreview(buildCsvPreview(text));
        } catch (error) {
            toast.error(error, 'Failed to read CSV file');
        }
    };

    const handleImportCsv = async () => {
        if (!organizerId) {
            return;
        }
        if (!csvText.trim()) {
            toast.error('Please upload a CSV file first');
            return;
        }

        setImportingCsv(true);
        try {
            const result = await importEmailMarketingContactsCsv(organizerId, csvText);
            toast.success('Contacts imported', {
                description: `${result.inserted} inserted, ${result.updated} updated, ${result.skippedInvalid} invalid skipped`,
            });
            await Promise.all([
                loadContacts({ page: 1, search: contactSearch }),
                loadGroups(),
                selectedGroupId ? loadGroupMembers(selectedGroupId, 1) : Promise.resolve(),
            ]);
            setCsvText('');
            setCsvFileName('');
            setCsvPreview(null);
        } catch (error) {
            toast.error(error, 'CSV import failed');
        } finally {
            setImportingCsv(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!organizerId) {
            return;
        }
        if (!newGroupName.trim()) {
            toast.error('Group name is required');
            return;
        }

        setCreatingGroup(true);
        try {
            const response = await createEmailMarketingGroup(organizerId, {
                name: newGroupName.trim(),
                description: newGroupDescription.trim() || null,
            });
            toast.success('Group created');
            setNewGroupName('');
            setNewGroupDescription('');
            await loadGroups();
            setSelectedGroupId(response.data.id);
            setEditGroupName(response.data.name);
            setEditGroupDescription(response.data.description ?? '');
        } catch (error) {
            toast.error(error, 'Failed to create group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleUpdateSelectedGroup = async () => {
        if (!organizerId || !selectedGroupId) {
            return;
        }
        if (!editGroupName.trim()) {
            toast.error('Group name is required');
            return;
        }

        setUpdatingGroup(true);
        try {
            await updateEmailMarketingGroup(organizerId, selectedGroupId, {
                name: editGroupName.trim(),
                description: editGroupDescription.trim() || null,
            });
            toast.success('Group updated');
            await loadGroups();
        } catch (error) {
            toast.error(error, 'Failed to update group');
        } finally {
            setUpdatingGroup(false);
        }
    };

    const handleDeleteSelectedGroup = async () => {
        if (!organizerId || !selectedGroupId) {
            return;
        }

        setDeletingGroup(true);
        try {
            await deleteEmailMarketingGroup(organizerId, selectedGroupId);
            toast.success('Group deleted');
            setSelectedContactIds(new Set());
            setGroupMembers([]);
            setGroupMembersPage(1);
            setGroupMembersTotalPages(1);
            setGroupMembersTotal(0);
            await loadGroups();
        } catch (error) {
            toast.error(error, 'Failed to delete group');
        } finally {
            setDeletingGroup(false);
        }
    };

    const toggleContactSelection = (contactId: string, checked: boolean) => {
        setSelectedContactIds((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(contactId);
            } else {
                next.delete(contactId);
            }
            return next;
        });
    };

    const handleAddSelectedContacts = async () => {
        if (!organizerId || !selectedGroupId) {
            return;
        }
        if (selectedContactIds.size === 0) {
            toast.error('Select at least one contact');
            return;
        }

        setAddingMembers(true);
        try {
            const response = await addContactsToEmailMarketingGroup(
                organizerId,
                selectedGroupId,
                Array.from(selectedContactIds)
            );
            toast.success('Contacts added to group', {
                description: `${response.added} new members added`,
            });
            setSelectedContactIds(new Set());
            await Promise.all([loadGroups(), loadGroupMembers(selectedGroupId, groupMembersPage)]);
        } catch (error) {
            toast.error(error, 'Failed to add contacts to group');
        } finally {
            setAddingMembers(false);
        }
    };

    const handleRemoveGroupMember = async (contactId: string) => {
        if (!organizerId || !selectedGroupId) {
            return;
        }

        try {
            await removeContactFromEmailMarketingGroup(organizerId, selectedGroupId, contactId);
            toast.success('Contact removed from group');
            await Promise.all([loadGroups(), loadGroupMembers(selectedGroupId, groupMembersPage)]);
        } catch (error) {
            toast.error(error, 'Failed to remove member');
        }
    };

    const openEditContactDialog = (contact: EmailMarketingContact) => {
        setEditingContact(contact);
        setEditContactFirstName(contact.firstName ?? '');
        setEditContactLastName(contact.lastName ?? '');
        setEditContactFullName(contact.fullName ?? '');
    };

    const closeEditContactDialog = () => {
        setEditingContact(null);
        setEditContactFirstName('');
        setEditContactLastName('');
        setEditContactFullName('');
    };

    const handleSaveContact = async () => {
        if (!organizerId || !editingContact) {
            return;
        }

        setSavingContact(true);
        try {
            await updateEmailMarketingContact(organizerId, editingContact.id, {
                firstName: editContactFirstName.trim() || null,
                lastName: editContactLastName.trim() || null,
                fullName: editContactFullName.trim() || null,
            });
            toast.success('Contact updated');
            closeEditContactDialog();
            await Promise.all([
                loadContacts({ page: contactPage, search: contactSearch }),
                selectedGroupId ? loadGroupMembers(selectedGroupId, groupMembersPage) : Promise.resolve(),
            ]);
        } catch (error) {
            toast.error(error, 'Failed to update contact');
        } finally {
            setSavingContact(false);
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        if (!organizerId) {
            return;
        }
        const confirmed = window.confirm('Delete this contact from Email Marketing?');
        if (!confirmed) {
            return;
        }

        setDeletingContactId(contactId);
        try {
            await deleteEmailMarketingContact(organizerId, contactId);
            toast.success('Contact deleted');
            await Promise.all([
                loadContacts({ page: contactPage, search: contactSearch }),
                loadGroups(),
                selectedGroupId ? loadGroupMembers(selectedGroupId, groupMembersPage) : Promise.resolve(),
            ]);
        } catch (error) {
            toast.error(error, 'Failed to delete contact');
        } finally {
            setDeletingContactId(null);
        }
    };

    const toggleCampaignGroup = (groupId: string, checked: boolean) => {
        setCampaignGroupIds((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(groupId);
            } else {
                next.delete(groupId);
            }
            return next;
        });
    };

    const handleEstimateRecipients = async () => {
        if (!organizerId) {
            return;
        }

        const selectedIds = Array.from(campaignGroupIds);
        if (selectedIds.length === 0) {
            toast.error('Select at least one group');
            return;
        }

        setEstimating(true);
        try {
            const response = await estimateEmailMarketingRecipients(organizerId, selectedIds);
            setRecipientEstimate(response.recipientCount);
        } catch (error) {
            toast.error(error, 'Failed to estimate recipients');
        } finally {
            setEstimating(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!organizerId) {
            return;
        }

        const groupIds = Array.from(campaignGroupIds);
        if (!campaignName.trim() || !campaignSubject.trim() || !campaignMessage.trim()) {
            toast.error('Campaign name, subject and message are required');
            return;
        }
        if (groupIds.length === 0) {
            toast.error('Select at least one group');
            return;
        }

        setCreatingCampaign(true);
        try {
            await createEmailMarketingCampaign(organizerId, {
                name: campaignName.trim(),
                subject: campaignSubject.trim(),
                message: campaignMessage.trim(),
                groupIds,
            });
            toast.success('Campaign created');
            setCampaignName('');
            setCampaignSubject('');
            setCampaignMessage('');
            setCampaignGroupIds(new Set());
            setRecipientEstimate(null);
            await loadCampaigns();
        } catch (error) {
            toast.error(error, 'Failed to create campaign');
        } finally {
            setCreatingCampaign(false);
        }
    };

    const handleSendCampaign = async (campaignId: string) => {
        if (!organizerId) {
            return;
        }

        setSendingCampaignId(campaignId);
        try {
            const response = await sendEmailMarketingCampaign(organizerId, campaignId);
            toast.success('Campaign sent', {
                description: `${response.sent} sent, ${response.failed} failed`,
            });
            await loadCampaigns();
        } catch (error) {
            toast.error(error, 'Failed to send campaign');
        } finally {
            setSendingCampaignId(null);
        }
    };

    if (!organizerId) {
        return (
            <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Email Marketing</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage marketing contacts, reusable groups, and campaigns in one place.
                    </p>
                </div>
                <Link href={attendeeEmailPath} className="text-sm text-primary hover:underline">
                    Email Attendees (Event Updates)
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Boundary Reminder</CardTitle>
                    <CardDescription>
                        Email marketing uses contact groups only. Event attendee updates stay in Email Attendees.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'contacts' | 'groups' | 'campaigns')}>
                <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
                    <TabsTrigger value="contacts" className="gap-2">
                        <Users className="h-4 w-4" />
                        Contacts
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Groups
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="gap-2">
                        <Send className="h-4 w-4" />
                        Campaigns
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Import Contacts from CSV</CardTitle>
                            <CardDescription>
                                Supported columns: <code>email</code>, <code>first_name</code>, <code>last_name</code>, <code>name</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="csv-upload">CSV File</Label>
                                <Input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleCsvFileSelected} />
                            </div>

                            {csvFileName && csvPreview && (
                                <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                                    <p className="font-medium">{csvFileName}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="outline">Rows: {csvPreview.rows}</Badge>
                                        <Badge variant="outline">Valid unique: {csvPreview.uniqueValid}</Badge>
                                        <Badge variant="outline">Invalid: {csvPreview.invalid}</Badge>
                                        <Badge variant="outline">Duplicates: {csvPreview.duplicates}</Badge>
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleImportCsv} disabled={importingCsv || !csvText.trim()}>
                                {importingCsv ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import Contacts
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contact List</CardTitle>
                            <CardDescription>{contactTotal} total contacts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    placeholder="Search by email or name"
                                    value={contactSearchInput}
                                    onChange={(event) => setContactSearchInput(event.target.value)}
                                />
                                <Button onClick={handleSearchSubmit}>Search</Button>
                            </div>

                            {contactsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : contacts.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No contacts found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {contacts.map((contact) => (
                                        <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{contact.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'No name'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{contact.source}</Badge>
                                                <Button size="sm" variant="outline" onClick={() => openEditContactDialog(contact)}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={deletingContactId === contact.id}
                                                    onClick={() => void handleDeleteContact(contact.id)}
                                                >
                                                    {deletingContactId === contact.id ? 'Deleting...' : 'Delete'}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Page {contactPage} of {contactTotalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={contactPage <= 1 || contactsLoading}
                                        onClick={() => void loadContacts({ page: contactPage - 1, search: contactSearch })}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={contactPage >= contactTotalPages || contactsLoading}
                                        onClick={() => void loadContacts({ page: contactPage + 1, search: contactSearch })}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="groups" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Create Group</CardTitle>
                            <CardDescription>Create reusable groups for campaign targeting.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="group-name">Name</Label>
                                <Input id="group-name" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="group-description">Description (optional)</Label>
                                <Textarea
                                    id="group-description"
                                    rows={3}
                                    value={newGroupDescription}
                                    onChange={(event) => setNewGroupDescription(event.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateGroup} disabled={creatingGroup}>
                                {creatingGroup ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Group'
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Groups</CardTitle>
                            <CardDescription>Select a group to edit members and details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {groupsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : groups.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No groups created yet.</p>
                            ) : (
                                <div className="grid gap-2">
                                    {groups.map((group) => (
                                        <button
                                            key={group.id}
                                            type="button"
                                            className={`rounded-lg border p-3 text-left transition ${group.id === selectedGroupId ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                                            onClick={() => {
                                                setSelectedGroupId(group.id);
                                                setEditGroupName(group.name);
                                                setEditGroupDescription(group.description ?? '');
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-medium">{group.name}</span>
                                                <Badge variant="outline">{group.memberCount ?? 0} members</Badge>
                                            </div>
                                            {group.description && (
                                                <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedGroup && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Edit Group: {selectedGroup.name}</CardTitle>
                                <CardDescription>Update details and manage contacts in this group.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={editGroupName} onChange={(event) => setEditGroupName(event.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input value={editGroupDescription} onChange={(event) => setEditGroupDescription(event.target.value)} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleUpdateSelectedGroup} disabled={updatingGroup}>
                                        {updatingGroup ? 'Saving...' : 'Save Group'}
                                    </Button>
                                    <Button variant="destructive" onClick={handleDeleteSelectedGroup} disabled={deletingGroup}>
                                        {deletingGroup ? 'Deleting...' : 'Delete Group'}
                                    </Button>
                                </div>

                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-sm font-medium">Add Contacts</h3>
                                            <p className="text-xs text-muted-foreground">Select contacts and add them to this group.</p>
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
                                            {contacts.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No contacts loaded yet.</p>
                                            ) : (
                                                contacts.map((contact) => (
                                                    <label key={contact.id} className="flex items-center gap-3 rounded p-2 hover:bg-muted/30">
                                                        <Checkbox
                                                            checked={selectedContactIds.has(contact.id)}
                                                            onCheckedChange={(checked) => toggleContactSelection(contact.id, checked === true)}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">{contact.email}</p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'No name'}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        <Button onClick={handleAddSelectedContacts} disabled={addingMembers || selectedContactIds.size === 0}>
                                            {addingMembers ? 'Adding...' : `Add ${selectedContactIds.size} selected`}
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-sm font-medium">Current Members</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Remove members directly from this group. {groupMembersTotal} total in this group.
                                            </p>
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
                                            {groupMembersLoading ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : groupMembers.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No members in this group yet.</p>
                                            ) : (
                                                groupMembers.map((member) => (
                                                    <div key={member.id} className="flex items-center justify-between gap-3 rounded border p-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">{member.email}</p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {member.fullName || [member.firstName, member.lastName].filter(Boolean).join(' ') || 'No name'}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => void handleRemoveGroupMember(member.id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Page {groupMembersPage} of {groupMembersTotalPages}
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!selectedGroupId || groupMembersLoading || groupMembersPage <= 1}
                                                    onClick={() => selectedGroupId && void loadGroupMembers(selectedGroupId, groupMembersPage - 1)}
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!selectedGroupId || groupMembersLoading || groupMembersPage >= groupMembersTotalPages}
                                                    onClick={() => selectedGroupId && void loadGroupMembers(selectedGroupId, groupMembersPage + 1)}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="campaigns" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Create Campaign</CardTitle>
                            <CardDescription>Select one or more groups. Recipients are deduped by email.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="campaign-name">Campaign Name</Label>
                                    <Input
                                        id="campaign-name"
                                        value={campaignName}
                                        onChange={(event) => setCampaignName(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="campaign-subject">Subject</Label>
                                    <Input
                                        id="campaign-subject"
                                        value={campaignSubject}
                                        onChange={(event) => setCampaignSubject(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="campaign-message">Message</Label>
                                <Textarea
                                    id="campaign-message"
                                    rows={6}
                                    value={campaignMessage}
                                    onChange={(event) => setCampaignMessage(event.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Plain text only. HTML tags are not supported in campaigns.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Target Groups</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {groups.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Create groups first to build campaigns.</p>
                                    ) : (
                                        groups.map((group) => (
                                            <label key={group.id} className="flex items-center gap-2 rounded border p-2">
                                                <Checkbox
                                                    checked={campaignGroupIds.has(group.id)}
                                                    onCheckedChange={(checked) => toggleCampaignGroup(group.id, checked === true)}
                                                />
                                                <span className="text-sm">{group.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" onClick={handleEstimateRecipients} disabled={estimating || campaignGroupIds.size === 0}>
                                    {estimating ? 'Estimating...' : 'Estimate Recipients'}
                                </Button>
                                {recipientEstimate !== null && (
                                    <Badge variant="secondary">Estimated recipients: {recipientEstimate}</Badge>
                                )}
                            </div>

                            <Button onClick={handleCreateCampaign} disabled={creatingCampaign || groups.length === 0}>
                                {creatingCampaign ? 'Creating campaign...' : 'Create Campaign'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Campaigns</CardTitle>
                            <CardDescription>Send created campaigns and track status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {campaignsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : campaigns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No campaigns yet.</p>
                            ) : (
                                campaigns.map((campaign) => {
                                    const canSend = campaign.status !== 'sending' && campaign.status !== 'sent';
                                    return (
                                        <div key={campaign.id} className="rounded-lg border p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{campaign.name}</p>
                                                    <p className="truncate text-sm text-muted-foreground">{campaign.subject}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Groups: {campaign.groupCount ?? 0} | Recipients: {campaign.recipientCount ?? 0}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{campaign.status}</Badge>
                                                    <Button
                                                        size="sm"
                                                        disabled={!canSend || sendingCampaignId === campaign.id}
                                                        onClick={() => void handleSendCampaign(campaign.id)}
                                                    >
                                                        {sendingCampaignId === campaign.id ? 'Sending...' : 'Send'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={Boolean(editingContact)} onOpenChange={(open) => !open && closeEditContactDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={editingContact?.email ?? ''} disabled />
                        </div>
                        <div className="space-y-1">
                            <Label>First Name</Label>
                            <Input value={editContactFirstName} onChange={(event) => setEditContactFirstName(event.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Last Name</Label>
                            <Input value={editContactLastName} onChange={(event) => setEditContactLastName(event.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Full Name</Label>
                            <Input value={editContactFullName} onChange={(event) => setEditContactFullName(event.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditContactDialog} disabled={savingContact}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveContact} disabled={savingContact}>
                            {savingContact ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
