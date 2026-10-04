import {NextResponse} from 'next/server';
import {apiBase, readSessionId} from '@/lib/server/upstream';

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

    const upstream = await fetch(`${apiBase()}/file/content/${id}`, {
        headers: {Authorization: `Bearer ${sessionId}`},
        cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text();
        return new NextResponse(text, {
            status: upstream.status,
            headers: {'Content-Type': upstream.headers.get('content-type') || 'application/json'},
        });
    }
    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
            'Cache-Control': 'private, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
