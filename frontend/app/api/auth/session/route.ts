import {NextResponse} from 'next/server';
import {sessionOutcome} from '@/lib/login';
import {apiBase, logUpstream, readSessionId, SESSION_COOKIE, sessionCookieOptions} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function GET() {
    const sessionId = await readSessionId();
    if (!sessionId) {
        return NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
    }

    const url = `${apiBase()}/user/getuserdata`;
    let upstream: Response;
    try {
        upstream = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionId}`,
            },
            body: '{}',
            cache: 'no-store',
        });
    } catch (err) {
        logUpstream('session', url, 0, err instanceof Error ? err.message : String(err));
        return NextResponse.json({error: true, message: 'archive_api_unreachable', upstream_status: 0}, {status: 502});
    }

    const text = await upstream.text();
    let data: unknown = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }

    const outcome = sessionOutcome(upstream.status, data);
    if (outcome === 'ok') {
        return NextResponse.json(data, {status: 200});
    }
    if (outcome === 'unauthenticated') {
        const res = NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
        res.cookies.set(SESSION_COOKIE, '', {...sessionCookieOptions(), maxAge: 0});
        return res;
    }

    logUpstream('session', url, upstream.status, text.slice(0, 300));
    return NextResponse.json(
        {error: true, message: 'archive_api_unavailable', upstream_status: upstream.status},
        {status: 502},
    );
}
