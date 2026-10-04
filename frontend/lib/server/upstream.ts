import {cookies} from 'next/headers';

export const SESSION_COOKIE = 'sa_session';

export function apiBase(): string {
    return (process.env.API_BASE_URL || 'http://localhost:6969').replace(/\/$/, '');
}

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 3,
    };
}

export function logUpstream(scope: string, url: string, status: number, detail: string) {
    console.error(`[slack-archive] ${scope}: archive API ${url} answered ${status || 'network error'}: ${detail}`);
}

export async function readSessionId(): Promise<string | undefined> {
    const jar = await cookies();
    return jar.get(SESSION_COOKIE)?.value;
}
