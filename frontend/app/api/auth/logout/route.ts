import {NextResponse} from 'next/server';
import {apiBase, readSessionId, SESSION_COOKIE, sessionCookieOptions} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function POST() {
    const sessionId = await readSessionId();
    if (sessionId) {
        await fetch(`${apiBase()}/user/logout`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${sessionId}`},
            cache: 'no-store',
        }).catch(() => undefined);
    }
    const res = NextResponse.json({ok: true});
    res.cookies.set(SESSION_COOKIE, '', {...sessionCookieOptions(), maxAge: 0});
    return res;
}
