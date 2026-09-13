export interface CheckoutProof {
    accessToken?: string;
    sessionId?: string;
}

// Capture before purchase tracking; fragments also keep new free-order proof out of HTTP logs.
export function captureCheckoutProof(orderId: string): CheckoutProof {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const proof: CheckoutProof = {
        accessToken: fragment.get('access') ?? url.searchParams.get('access') ?? undefined,
        sessionId: fragment.get('session_id') ?? url.searchParams.get('session_id') ?? undefined,
    };
    const storageKey = `ht-checkout-proof:${orderId}`;
    try {
        if (proof.accessToken || proof.sessionId) {
            window.sessionStorage.setItem(storageKey, JSON.stringify(proof));
        } else {
            const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null');
            if (saved && typeof saved.accessToken === 'string') proof.accessToken = saved.accessToken;
            if (saved && typeof saved.sessionId === 'string') proof.sessionId = saved.sessionId;
        }
    } catch {
        // Storage may be disabled; the in-memory proof still supports this visit.
    }
    for (const key of ['access', 'session_id']) {
        url.searchParams.delete(key);
        fragment.delete(key);
    }
    url.hash = fragment.toString();
    window.history.replaceState(window.history.state, '', url.toString());
    return proof;
}
