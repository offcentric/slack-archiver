'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import {useSession} from '@/context/SessionContext';
import {onlyWorkspace} from '@/lib/types';

export default function HomePage() {
    const {user, loading} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (loading) {
            return;
        }
        if (!user) {
            router.replace('/login');
            return;
        }
        const only = onlyWorkspace(user);
        if (only) {
            router.replace(`/w/${encodeURIComponent(only)}`);
        }
    }, [loading, user, router]);

    if (loading || !user) {
        return <p className="status">Loading your archive…</p>;
    }
    if (user.workspaces.length === 0) {
        return <p className="status">This account is not assigned to a workspace yet.</p>;
    }
    if (user.workspaces.length === 1) {
        return <p className="status">Opening your workspace…</p>;
    }

    return (
        <section className="panel">
            <h1>Choose a workspace</h1>
            <p className="muted">These are the Slack teams your account can read.</p>
            <ul className="workspace-list">
                {user.workspaces.map((item) => (
                    <li key={item.workspace}>
                        <Link href={`/w/${encodeURIComponent(item.workspace)}`}>
                            <span className="avatar avatar-lg" aria-hidden="true">{item.workspace.charAt(0).toUpperCase()}</span>
                            <span>
                                <strong>{item.workspace}</strong>
                                <span className="muted">{item.real_name || item.name || 'No Slack profile linked'}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
