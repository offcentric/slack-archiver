import {NextResponse} from 'next/server';
import {loginErrorMessage} from '@/lib/login';
import {apiBase, SESSION_COOKIE, sessionCookieOptions} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const {email, code} = await req.json().catch(() => ({email: '', code: ''}));
    let upstream: Response;
    try {
        upstream = await fetch(`${apiBase()}/user/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, code}),
            cache: 'no-store',
        });
    } catch {
        return NextResponse.json(
            {error: true, message: loginErrorMessage(500)},
            {status: 500},
        );
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.session_id) {
        return NextResponse.json(
            {error: true, message: loginErrorMessage(upstream.status, data.message)},
            {status: upstream.ok ? 500 : upstream.status},
        );
    }

    const {session_id, ...user} = data;
    const res = NextResponse.json({user});
    res.cookies.set(SESSION_COOKIE, session_id, sessionCookieOptions());
    return res;
}
