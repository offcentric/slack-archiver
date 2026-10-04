import {NextResponse} from 'next/server';
import {apiBase, logUpstream, readSessionId} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, context: { params: Promise<{ path: string[] }> }) {
    const {path} = await context.params;
    if (!path?.length || path.some((part) => !part || part === '.' || part === '..')) {
        return NextResponse.json({error: true, message: 'invalid_path'}, {status: 400});
    }

    const sessionId = await readSessionId();
    if (!sessionId) {
        return NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
    }

    const body = await req.text();
    const upstream = await fetch(`${apiBase()}/${path.join('/')}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionId}`,
        },
        body: body || '{}',
        cache: 'no-store',
    });
    if (!upstream.ok) {
        logUpstream('archive', `${apiBase()}/${path.join('/')}`, upstream.status, 'upstream error');
        return NextResponse.json({error: true, message: 'backend_error'}, {status: upstream.status});
    }
    const text = await upstream.text();
    return new NextResponse(text, {
        status: upstream.status,
        headers: {'Content-Type': upstream.headers.get('content-type') || 'application/json'},
    });
}
