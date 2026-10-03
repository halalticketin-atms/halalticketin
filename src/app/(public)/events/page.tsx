import BrowseEventsClient from '@/components/pages/BrowseEventsClient';
import { getPublicEventsSnapshot } from '@/lib/public-events-data';
import { connection } from 'next/server';

export default async function BrowseEventsPage() {
    await connection();
    const initialData = await getPublicEventsSnapshot();
    return <BrowseEventsClient initialData={initialData} />;
}
