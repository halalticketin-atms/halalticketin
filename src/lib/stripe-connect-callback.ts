export type StripeConnectCallbackBanner = {
    organizerId: string;
    type: 'connected' | 'error';
    message?: string;
};

export const readStripeConnectCallbackBanner = (
    searchParams: URLSearchParams,
    organizerId: string
): StripeConnectCallbackBanner | null => {
    const stripeResult = searchParams.get('stripe');
    if (stripeResult !== 'connected' && stripeResult !== 'error') {
        return null;
    }

    const requestedOrganizerId = searchParams.get('organizerId');
    if (requestedOrganizerId && requestedOrganizerId !== organizerId) {
        return null;
    }

    const stripeError = searchParams.get('stripe_error');

    return {
        organizerId: requestedOrganizerId ?? organizerId,
        type: stripeResult,
        message: stripeError || undefined,
    };
};

export const clearStripeConnectCallbackParams = (searchParams: URLSearchParams) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('organizerId');
    nextParams.delete('stripe');
    nextParams.delete('stripe_error');
    return nextParams;
};
