import { NextResponse } from 'next/server';

export function proxy() {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*', '/settings', '/profile', '/admin',
        '/events/new/:path*', '/events/create/:path*',
        '/events/:id/edit', '/events/:id/preview', '/events/preview/:path*',
        '/events/published', '/api/web-session',
    ],
};
