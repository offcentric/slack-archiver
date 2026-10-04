'use client';

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {UserProfile} from '@/lib/types';

type SessionValue = {
    user: UserProfile | null;
    loading: boolean;
    setUser: (user: UserProfile | null) => void;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
    user: null,
    loading: true,
    setUser: () => undefined,
    refresh: async () => undefined,
    logout: async () => undefined,
});

export const useSession = () => useContext(SessionContext);

export function SessionProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const requestId = useRef(0);

    const refresh = useCallback(async () => {
        const id = ++requestId.current;
        const res = await fetch('/api/auth/session');
        if (id !== requestId.current) {
            return;
        }
        if (!res.ok) {
            setUser(null);
            setLoading(false);
            return;
        }
        const data = await res.json();
        setUser(data.userData ?? null);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const logout = useCallback(async () => {
        await fetch('/api/auth/logout', {method: 'POST'});
        setUser(null);
    }, []);

    return (
        <SessionContext.Provider value={{user, loading, setUser, refresh, logout}}>
            {children}
        </SessionContext.Provider>
    );
}
