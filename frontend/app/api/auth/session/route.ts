import {NextResponse} from 'next/server';
import {apiBase, readSessionId, SESSION_COOKIE, sessionCookieOptions} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function GET() {
    const sessionId = await readSessionId();
    if (!sessionId) {
        return NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
    }

    const upstream = await fetch(`${apiBase()}/user/getuserdata`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionId}`,
        },
        body: '{}',
        cache: 'no-store',
    });
    const data = await upstream.json().catch(() => ({}));
    const res = NextResponse.json(data, {status: upstream.status});
    if (upstream.status === 401) {
        res.cookies.set(SESSION_COOKIE, '', {...sessionCookieOptions(), maxAge: 0});
    }
    return res;
}
