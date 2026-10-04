'use client';

import {useParams} from 'next/navigation';
import MediaDetail from '@/components/MediaDetail';
import RequireAuth from '@/components/RequireAuth';

export default function MediaItemPage() {
    const params = useParams<{workspace: string; id: string}>();
    return (
        <RequireAuth>
            <MediaDetail workspace={decodeURIComponent(params.workspace)} id={decodeURIComponent(params.id)}/>
        </RequireAuth>
    );
}
