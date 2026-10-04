import {NextResponse} from 'next/server';
import {apiBase, logUpstream, readSessionId} from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

// Video seeking and iOS playback depend on byte ranges reaching the API and
// the 206 answer (with its range headers) reaching the browser unchanged.
const PASSTHROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition'];

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const {id} = await context.params;
    if (!/^\d+$/.test(id)) {
        return NextResponse.json({error: true, message: 'invalid_file_id'}, {status: 400});
    }
    const sessionId = await readSessionId();
    if (!sessionId) {
        return NextResponse.json({error: true, message: 'auth_fail'}, {status: 401});
    }

    const headers: Record<string, string> = {Authorization: `Bearer ${sessionId}`};
    const range = req.headers.get('range');
    if (range) {
        headers.Range = range;
    }
    const upstream = await fetch(`${apiBase()}/file/content/${id}`, {headers, cache: 'no-store'});
    if (upstream.status === 416) {
        return new NextResponse(null, {
            status: 416,
            headers: {'Content-Range': upstream.headers.get('content-range') || 'bytes */0'},
        });
    }
    if (!upstream.ok || !upstream.body) {
        logUpstream('file', `${apiBase()}/file/content/${id}`, upstream.status, 'upstream error');
        return NextResponse.json({error: true, message: 'backend_error'}, {status: upstream.status || 502});
    }
    const out = new Headers({
        'Content-Type': 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
    });
    for (const name of PASSTHROUGH_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) {
            out.set(name, value);
        }
    }
    return new NextResponse(upstream.body, {status: upstream.status, headers: out});
}
