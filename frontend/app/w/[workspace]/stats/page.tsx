'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import WorkspaceStats from '@/components/WorkspaceStats';

export default function WorkspaceStatsPage() {
    const params = useParams<{workspace: string}>();
    const workspace = decodeURIComponent(params.workspace);
    return (
        <RequireAuth>
            <section className="panel">
                <p className="crumb">
                    <Link href={`/w/${encodeURIComponent(workspace)}`}>Back to {workspace}</Link>
                </p>
                <WorkspaceStats workspace={workspace} variant="full"/>
            </section>
        </RequireAuth>
    );
}
