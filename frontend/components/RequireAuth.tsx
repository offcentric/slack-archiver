'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';
import {useSession} from '@/context/SessionContext';

export default function RequireAuth({children}: {children: React.ReactNode}) {
    const {user, loading, error} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user && !error) {
            router.replace('/login');
        }
    }, [loading, user, error, router]);

    if (loading) {
        return <p className="status">Loading your archive…</p>;
    }
    if (!user) {
        return error ? <p className="banner error status" role="alert">{error}</p> : null;
    }
    return <>{children}</>;
}
