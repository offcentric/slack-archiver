'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import RecentMessages from '@/components/RecentMessages';
import RequireAuth from '@/components/RequireAuth';
import WorkspaceStats from '@/components/WorkspaceStats';
import {useSession} from '@/context/SessionContext';

export default function WorkspacePage() {
    const params = useParams<{workspace: string}>();
    const workspace = decodeURIComponent(params.workspace);
    const {user} = useSession();
    const allowed = user?.workspaces.some((item) => item.workspace === workspace);
    const base = `/w/${encodeURIComponent(workspace)}`;

    return (
        <RequireAuth>
            {!allowed ? (
                <p className="banner error" role="alert">You do not have access to this workspace.</p>
            ) : (
                <section className="panel">
                    <h1>{workspace}</h1>
                    <p className="muted">Choose what you want to look through.</p>
                    <div className="mode-grid">
                        <Link className="mode-card mode-messages" href={`${base}/messages`}>
                            <span className="mode-icon" aria-hidden="true">#</span>
                            <strong>Messages</strong>
                            <span className="muted">Browse one channel, or every channel at once.</span>
                        </Link>
                        <Link className="mode-card mode-search" href={`${base}/search`}>
                            <span className="mode-icon" aria-hidden="true">⌕</span>
                            <strong>Search</strong>
                            <span className="muted">Find messages across channels.</span>
                        </Link>
                        <Link className="mode-card mode-media" href={`${base}/media`}>
                            <span className="mode-icon" aria-hidden="true">▣</span>
                            <strong>Media</strong>
                            <span className="muted">Images and videos from the archive.</span>
                        </Link>
                    </div>
                    <WorkspaceStats workspace={workspace}/>
                    <RecentMessages workspace={workspace}/>
                </section>
            )}
        </RequireAuth>
    );
}
