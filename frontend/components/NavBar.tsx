'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import Logo from '@/components/Logo';
import {useSession} from '@/context/SessionContext';
import {identityForWorkspace, isAdmin} from '@/lib/types';

export default function NavBar() {
    const {user, logout} = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const account = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointer = (event: MouseEvent) => {
            if (!account.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', onPointer);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onPointer);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!user || pathname === '/login') {
        return null;
    }

    const match = pathname.match(/^\/w\/([^/]+)/);
    const workspace = match ? decodeURIComponent(match[1]) : null;
    const identity = identityForWorkspace(user, workspace);
    const realName = identity?.real_name || identity?.name || '';
    const accountLabel = realName || user.email;
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
                <div className="account" ref={account}>
                    <button
                        type="button"
                        className="account-trigger"
                        aria-expanded={open}
                        aria-haspopup="menu"
                        aria-controls="account-menu"
                        onClick={() => setOpen((current) => !current)}
                    >
                        <span className="avatar" aria-hidden="true">{accountLabel.trim().charAt(0).toUpperCase()}</span>
                        <span className="account-name">{accountLabel}</span>
                    </button>
                    {open && (
                        <div className="account-menu" id="account-menu" role="menu">
                            {workspace && (
                                <Link className="account-item" role="menuitem" href={`${base}/stats`} aria-current={pathname.startsWith(`${base}/stats`) ? 'page' : undefined} onClick={() => setOpen(false)}>Statistics</Link>
                            )}
                            {isAdmin(user) && (
                                <Link className="account-item" role="menuitem" href="/admin" onClick={() => setOpen(false)}>Admin</Link>
                            )}
                            <button type="button" className="account-item" role="menuitem" onClick={onLogout}>Log out</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
