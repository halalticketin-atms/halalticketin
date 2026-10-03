import 'server-only';

import { WEB_SESSION_NONCE_PATTERN } from './web-session-types';

export interface WebSessionCookie {
    accessToken: string;
    nonce: string;
}

export function isWebSessionCookie(value: unknown): value is WebSessionCookie {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<WebSessionCookie>;
    return typeof session.accessToken === 'string'
        && session.accessToken.length <= 2048
        && /^[\x21-\x7e]+$/.test(session.accessToken)
        && typeof session.nonce === 'string'
        && WEB_SESSION_NONCE_PATTERN.test(session.nonce);
}

export function encodeWebSessionCookie(session: WebSessionCookie): string {
    return Buffer.from(JSON.stringify(session)).toString('base64url');
}

export function decodeWebSessionCookie(value?: string, activation?: string): WebSessionCookie | null {
    if (!value || value.length > 3800 || !activation || !WEB_SESSION_NONCE_PATTERN.test(activation)) return null;
    try {
        const session: unknown = JSON.parse(Buffer.from(value, 'base64url').toString());
        return isWebSessionCookie(session) && session.nonce === activation ? session : null;
    } catch {
        return null;
    }
}
