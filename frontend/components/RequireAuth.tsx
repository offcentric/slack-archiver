'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import {useSession} from '@/context/SessionContext';

export default function RequireAuth({children}: {children: React.ReactNode}) {
    const {user, loading} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return <p className="status">Loading your archive…</p>;
    }
    if (!user) {
        return null;
    }
    return <>{children}</>;
}
