import type { Metadata } from 'next';

import { HeightsPrPartnerAdminPage } from '@/components/partners/HeightsPrPartnerAdminPage';

export const metadata: Metadata = {
    title: 'HeightsPR admin | Halal Ticketin',
    description: 'View organisations referred through the HeightsPR signup portal.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function HeightsPrAdminPage() {
    return <HeightsPrPartnerAdminPage />;
}
