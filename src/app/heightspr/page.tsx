import type { Metadata } from 'next';

import { HeightsPrSignupPage } from '@/components/auth/HeightsPrSignupPage';

export const metadata: Metadata = {
    title: 'HeightsPR organiser signup | Halal Ticketin',
    description: 'Create your Halal Ticketin organiser account through HeightsPR.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function HeightsPrPage() {
    return <HeightsPrSignupPage />;
}
