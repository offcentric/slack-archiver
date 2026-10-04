'use client';

import {useParams} from 'next/navigation';
import MessageDetail from '@/components/MessageDetail';
import RequireAuth from '@/components/RequireAuth';

export default function MessagePage() {
    const params = useParams<{workspace: string; ts: string}>();
    const workspace = decodeURIComponent(params.workspace);
    const ts = decodeURIComponent(params.ts);
    return (
        <RequireAuth>
            <MessageDetail workspace={workspace} ts={ts}/>
        </RequireAuth>
    );
}
