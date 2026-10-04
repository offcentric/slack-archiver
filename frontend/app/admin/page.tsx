'use client';

import AdminSync from '@/components/AdminSync';
import RequireAuth from '@/components/RequireAuth';
import {useSession} from '@/context/SessionContext';

export default function AdminPage() {
    const {user} = useSession();
    return (
        <RequireAuth>
            {user && <AdminSync user={user}/>}
        </RequireAuth>
    );
}
