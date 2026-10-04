'use client';

import {Suspense} from 'react';
import {useParams} from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import SearchBrowser from '@/components/SearchBrowser';

export default function SearchPage() {
    const params = useParams<{workspace: string}>();
    return (
        <RequireAuth>
            <Suspense fallback={<p className="status">Loading search…</p>}>
                <SearchBrowser workspace={decodeURIComponent(params.workspace)}/>
            </Suspense>
        </RequireAuth>
    );
}
