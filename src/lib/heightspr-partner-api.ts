import api from './api';

export type HeightsPrPartnerOrganizer = {
    id: string;
    name: string;
    organizerType: 'individual' | 'organization' | 'charity';
    country: string | null;
    city: string | null;
    replyToEmail: string | null;
    website: string | null;
    heightsprReferredAt: string;
    createdAt: string;
};

export type HeightsPrPartnerOrganizersResponse = {
    data: HeightsPrPartnerOrganizer[];
    total: number;
};

export const getHeightsPrPartnerOrganizers =
    async (): Promise<HeightsPrPartnerOrganizersResponse> =>
        api.get<HeightsPrPartnerOrganizersResponse>('/api/v1/partners/heightspr/organizers');
