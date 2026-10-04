import {NextResponse} from 'next/server';
import {apiBase, logUpstream, readSessionId} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
    const {id} = await context.params;
    if (!/^\d+$/.test(id)) {
        return NextResponse.json({error: true, message: 'invalid_file_id'}, {status: 400});
    }
    const sessionId = await readSessionId();
    if (!sessionId) {
        return NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
    }

    const upstream = await fetch(`${apiBase()}/file/thumbnail/${id}`, {
        headers: {Authorization: `Bearer ${sessionId}`},
        cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
        logUpstream('thumbnail', `${apiBase()}/file/thumbnail/${id}`, upstream.status, 'upstream error');
        return NextResponse.json({error: true, message: 'backend_error'}, {status: upstream.status || 502});
    }
    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'private, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
