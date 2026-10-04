import {NextResponse} from 'next/server';
import {sendCodeOutcome} from '@/lib/login';
import {apiBase} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const {email} = await req.json().catch(() => ({email: ''}));
    let status = 500;
    try {
        const upstream = await fetch(`${apiBase()}/user/sendlogincode`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email}),
            cache: 'no-store',
        });
        status = upstream.status;
    } catch {
        status = 500;
    }

    if (sendCodeOutcome(status) === 'unavailable') {
        return NextResponse.json(
            {error: true, message: 'The archive is unavailable right now. Try again in a moment.'},
            {status: 500},
        );
    }
    return NextResponse.json({ok: true});
}
