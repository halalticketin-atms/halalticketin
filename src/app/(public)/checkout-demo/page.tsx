'use client';

import { CheckoutModal } from '@/components/checkout/CheckoutModal';

export default function CheckoutDemoPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 md:p-8">
            <CheckoutModal />
        </div>
    );
}
