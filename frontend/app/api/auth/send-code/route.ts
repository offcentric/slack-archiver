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
        if (status >= 500) {
            const data = await upstream.json().catch(() => ({}));
            logUpstream('send-code', url, status, typeof data?.message === 'string' ? data.message : 'failed');
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
