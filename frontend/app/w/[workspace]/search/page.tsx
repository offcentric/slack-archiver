'use client';

import {useParams} from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import SearchBrowser from '@/components/SearchBrowser';

export default function SearchPage() {
    const params = useParams<{workspace: string}>();
    return (
        <RequireAuth>
            <SearchBrowser workspace={decodeURIComponent(params.workspace)}/>
        </RequireAuth>
    );
}
