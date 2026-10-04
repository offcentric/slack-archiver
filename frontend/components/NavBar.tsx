'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import Logo from '@/components/Logo';
import {useSession} from '@/context/SessionContext';
import {identityForWorkspace, isAdmin} from '@/lib/types';

export default function NavBar() {
    const {user, logout} = useSession();
    const pathname = usePathname();
    const router = useRouter();

    if (!user || pathname === '/login') {
        return null;
    }

    const match = pathname.match(/^\/w\/([^/]+)/);
    const workspace = match ? decodeURIComponent(match[1]) : null;
    const identity = identityForWorkspace(user, workspace);
    const realName = identity?.real_name || identity?.name || '';
    const base = workspace ? `/w/${encodeURIComponent(workspace)}` : '';

    const onLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <header className="topbar">
            <Link className="brand" href="/"><Logo size={30}/></Link>
            {workspace && (
                <nav className="topnav" aria-label="Workspace">
                    <span className="workspace-chip">{workspace}</span>
                    <Link href={base} aria-current={pathname === base ? 'page' : undefined}>Home</Link>
                    <Link href={`${base}/messages`} aria-current={pathname.startsWith(`${base}/messages`) ? 'page' : undefined}>Messages</Link>
                    <Link href={`${base}/search`} aria-current={pathname.startsWith(`${base}/search`) ? 'page' : undefined}>Search</Link>
                    <Link href={`${base}/media`} aria-current={pathname.startsWith(`${base}/media`) ? 'page' : undefined}>Media</Link>
                </nav>
            )}
            <div className="topbar-user">
                {realName && (
                    <span className="real-name">
                        <span className="avatar" aria-hidden="true">{realName.trim().charAt(0).toUpperCase()}</span>
                        {realName}
                    </span>
                )}
                {isAdmin(user) && <Link className="admin-link" href="/admin">Admin</Link>}
                <button type="button" className="ghost" onClick={onLogout}>Log out</button>
            </div>
        </header>
    );
}
