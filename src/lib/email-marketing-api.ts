import api from './api';

export type EmailContactSource = 'csv' | 'manual';

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface EmailMarketingContact {
    id: string;
    email: string;
    emailNormalized: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    source: EmailContactSource;
    createdAt: string;
    updatedAt: string;
}

export interface EmailMarketingGroup {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    memberCount?: number;
}

export interface EmailMarketingCampaign {
    id: string;
    organizerId: string;
    name: string;
    subject: string;
    message: string;
    status: EmailCampaignStatus;
    scheduledAt: string | null;
    sentAt: string | null;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
    groupCount?: number;
    recipientCount?: number;
}

interface ContactsResponse {
    data: EmailMarketingContact[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

interface GroupsResponse {
    data: EmailMarketingGroup[];
}

interface CampaignsResponse {
    data: EmailMarketingCampaign[];
}

export interface ImportContactsResponse {
    inserted: number;
    updated: number;
    skippedInvalid: number;
    deduped: number;
    total: number;
}

export const importEmailMarketingContactsCsv = async (organizerId: string, csvText: string) => {
    return api.post<ImportContactsResponse>(
        `/api/v1/organizers/${organizerId}/email-marketing/contacts/import-csv`,
        { csvText }
    );
};

export const fetchEmailMarketingContacts = async (
    organizerId: string,
    params?: { search?: string; page?: number; pageSize?: number; groupId?: string }
) => {
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.groupId) queryParams.groupId = params.groupId;

    return api.get<ContactsResponse>(
        `/api/v1/organizers/${organizerId}/email-marketing/contacts`,
        Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
    );
};

export const updateEmailMarketingContact = async (
    organizerId: string,
    contactId: string,
    payload: { firstName?: string | null; lastName?: string | null; fullName?: string | null }
) => {
    return api.patch<{ data: EmailMarketingContact }>(
        `/api/v1/organizers/${organizerId}/email-marketing/contacts/${contactId}`,
        payload
    );
};

export const deleteEmailMarketingContact = async (organizerId: string, contactId: string) => {
    return api.delete<{ success: boolean }>(
        `/api/v1/organizers/${organizerId}/email-marketing/contacts/${contactId}`
    );
};

export const fetchEmailMarketingGroups = async (organizerId: string) => {
    return api.get<GroupsResponse>(`/api/v1/organizers/${organizerId}/email-marketing/groups`);
};

export const createEmailMarketingGroup = async (
    organizerId: string,
    payload: { name: string; description?: string | null }
) => {
    return api.post<{ data: EmailMarketingGroup }>(
        `/api/v1/organizers/${organizerId}/email-marketing/groups`,
        payload
    );
};

export const updateEmailMarketingGroup = async (
    organizerId: string,
    groupId: string,
    payload: { name?: string; description?: string | null }
) => {
    return api.patch<{ data: EmailMarketingGroup }>(
        `/api/v1/organizers/${organizerId}/email-marketing/groups/${groupId}`,
        payload
    );
};

export const deleteEmailMarketingGroup = async (organizerId: string, groupId: string) => {
    return api.delete<{ success: boolean }>(
        `/api/v1/organizers/${organizerId}/email-marketing/groups/${groupId}`
    );
};

export const addContactsToEmailMarketingGroup = async (
    organizerId: string,
    groupId: string,
    contactIds: string[]
) => {
    return api.post<{ success: boolean; added: number }>(
        `/api/v1/organizers/${organizerId}/email-marketing/groups/${groupId}/contacts`,
        { contactIds }
    );
};

export const removeContactFromEmailMarketingGroup = async (
    organizerId: string,
    groupId: string,
    contactId: string
) => {
    return api.delete<{ success: boolean }>(
        `/api/v1/organizers/${organizerId}/email-marketing/groups/${groupId}/contacts/${contactId}`
    );
};

export const createEmailMarketingCampaign = async (
    organizerId: string,
    payload: {
        name: string;
        subject: string;
        message: string;
        groupIds: string[];
        scheduleAt?: string;
    }
) => {
    return api.post<{ data: EmailMarketingCampaign }>(
        `/api/v1/organizers/${organizerId}/email-marketing/campaigns`,
        payload
    );
};

export const fetchEmailMarketingCampaigns = async (organizerId: string) => {
    return api.get<CampaignsResponse>(`/api/v1/organizers/${organizerId}/email-marketing/campaigns`);
};

export const estimateEmailMarketingRecipients = async (organizerId: string, groupIds: string[]) => {
    return api.post<{ recipientCount: number }>(
        `/api/v1/organizers/${organizerId}/email-marketing/campaigns/estimate`,
        { groupIds }
    );
};

export const sendEmailMarketingCampaign = async (organizerId: string, campaignId: string) => {
    return api.post<{ sent: number; skipped: number; failed: number; recipientCount: number }>(
        `/api/v1/organizers/${organizerId}/email-marketing/campaigns/${campaignId}/send`
    );
};
