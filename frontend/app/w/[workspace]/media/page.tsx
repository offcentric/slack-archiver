'use client';

import {useParams} from 'next/navigation';
import MediaBrowser from '@/components/MediaBrowser';
import RequireAuth from '@/components/RequireAuth';

export default function MediaPage() {
    const params = useParams<{workspace: string}>();
    return (
        <RequireAuth>
            <MediaBrowser workspace={decodeURIComponent(params.workspace)}/>
        </RequireAuth>
    );
}
