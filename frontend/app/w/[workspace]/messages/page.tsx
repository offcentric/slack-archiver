'use client';

import {Suspense} from 'react';
import {useParams} from 'next/navigation';
import MessageBrowser from '@/components/MessageBrowser';
import RequireAuth from '@/components/RequireAuth';

export default function MessagesPage() {
    const params = useParams<{workspace: string}>();
    const workspace = decodeURIComponent(params.workspace);
    return (
        <RequireAuth>
            <Suspense fallback={<p className="status">Loading messages…</p>}>
                <MessageBrowser workspace={workspace}/>
            </Suspense>
        </RequireAuth>
    );
}
