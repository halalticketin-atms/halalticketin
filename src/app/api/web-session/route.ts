import { NextResponse } from 'next/server';
import { encodeWebSessionCookie, isWebSessionCookie } from '@/lib/web-session-cookie';
import { WEB_SESSION_COOKIE } from '@/lib/web-session-types';

const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

function isSameOrigin(request: Request): boolean {
    const url = new URL(request.url);
    const origin = `${url.protocol}//${request.headers.get('host') ?? url.host}`;
    return request.headers.get('origin') === origin
        && (!request.headers.get('sec-fetch-site') || request.headers.get('sec-fetch-site') === 'same-origin');
}

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return new Response(null, { status: 415, headers: privateHeaders });
    }
    if (Number(request.headers.get('content-length')) > 8192) {
        return new Response(null, { status: 413, headers: privateHeaders });
    }
    try {
        const body = await request.text();
        if (body.length > 8192) return new Response(null, { status: 413, headers: privateHeaders });
        const session: unknown = JSON.parse(body);
        if (!isWebSessionCookie(session)) return new Response(null, { status: 400, headers: privateHeaders });
        const response = new NextResponse(null, { status: 204, headers: privateHeaders });
        response.cookies.set(WEB_SESSION_COOKIE, encodeWebSessionCookie(session), { ...cookieOptions, maxAge: 3600 });
        return response;
    } catch {
        return new Response(null, { status: 400, headers: privateHeaders });
    }
}

export async function DELETE(request: Request) {
    if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
    const response = new NextResponse(null, { status: 204, headers: privateHeaders });
    response.cookies.set(WEB_SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
}
