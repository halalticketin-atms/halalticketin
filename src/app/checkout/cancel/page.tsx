'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutCancelPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');

    return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
            <div className="max-w-2xl mx-auto px-4 py-16">
                {/* Cancel Icon */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                        <XCircle className="w-12 h-12 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Payment Cancelled
                    </h1>
                    <p className="text-gray-600">
                        Your payment was not completed. No charges have been made.
                    </p>
                </div>

                {/* Info Box */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">What happened?</h3>
                    <p className="text-gray-600 mb-4">
                        You cancelled the checkout process before completing payment.
                        Your tickets have not been reserved.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> Popular events sell out quickly.
                            If you still want to attend, we recommend completing your purchase soon.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/events">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Browse Events
                        </Link>
                    </Button>
                    {orderId && (
                        <Button asChild size="lg">
                            <Link href={`/events`}>
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Try Again
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Help text */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    Having trouble checking out?{' '}
                    <a href="mailto:support@halalticketing.com" className="text-primary hover:underline">
                        Contact our support team
                    </a>
                </p>
            </div>
        </div>
    );
}
