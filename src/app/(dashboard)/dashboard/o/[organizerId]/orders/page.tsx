import OrdersPageClient from './OrdersPageClient';
import { getOrdersPageQueryKey } from '@/lib/orders-page-data';
import { getOrdersPageSeed } from '@/lib/orders-page-server';

export default async function OrdersPage({ params, searchParams }: {
    params: Promise<{ organizerId: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const [{ organizerId }, query] = await Promise.all([params, searchParams]);
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) value.forEach(entry => urlParams.append(key, entry));
        else if (value !== undefined) urlParams.set(key, value);
    }
    const initialData = await getOrdersPageSeed(organizerId, getOrdersPageQueryKey(urlParams));
    return <OrdersPageClient initialData={initialData} />;
}
