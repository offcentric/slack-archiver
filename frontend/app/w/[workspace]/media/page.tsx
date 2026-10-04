'use client';

import {Suspense} from 'react';
import {useParams} from 'next/navigation';
import MediaBrowser from '@/components/MediaBrowser';
import RequireAuth from '@/components/RequireAuth';

export default function MediaPage() {
    const params = useParams<{workspace: string}>();
    return (
        <RequireAuth>
            <Suspense fallback={<p className="status">Loading media…</p>}>
                <MediaBrowser workspace={decodeURIComponent(params.workspace)}/>
            </Suspense>
        </RequireAuth>
    );
}
