'use client';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { usePathname, useRouter } from 'next/navigation';

export default function NavBar() {
    const { session, setSession } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const logout = () => {
        localStorage.removeItem('session');
        setSession({ sessionId: null, user: null, workspaces: [], workspace: null });
        router.push('/login');
    }

    if (!session.sessionId) return null;
    if (pathname === '/login') return null;

    return (<>
        Message List
        File List
        <button className="text-red-600" onClick={logout}>Logout</button>
    </>);
}