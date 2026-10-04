import {NextResponse} from 'next/server';
import {sendCodeOutcome} from '@/lib/login';
import {apiBase, logUpstream} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const {email} = await req.json().catch(() => ({email: ''}));
    let status = 500;
    try {
        const url = `${apiBase()}/user/sendlogincode`;
        const upstream = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email}),
            cache: 'no-store',
        });
        status = upstream.status;
        if (status >= 400) {
            const data = await upstream.json().catch(() => ({})) as {message?: unknown; detail?: unknown};
            if (status === 429) {
                const retryAfter = Math.max(1, Number(data.detail) || 60);
                return NextResponse.json(
                    {error: true, message: 'rate_limited', retry_after: retryAfter},
                    {status: 429, headers: {'Retry-After': String(retryAfter)}},
                );
            }
            if (status >= 500) {
                logUpstream('send-code', url, status, typeof data.message === 'string' ? data.message : 'failed');
            }
        }
    } catch (err) {
        status = 500;
        logUpstream('send-code', `${apiBase()}/user/sendlogincode`, 0, err instanceof Error ? err.message : 'request failed');
    }

    if (sendCodeOutcome(status) === 'unavailable') {
        return NextResponse.json(
            {error: true, message: 'The archive is unavailable right now. Try again in a moment.'},
            {status: 500},
        );
    }
    return NextResponse.json({ok: true});
}
