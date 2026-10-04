'use client';

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {sessionUnavailableMessage} from '@/lib/login';
import {UserProfile} from '@/lib/types';

export type SessionRefreshResult = {user: UserProfile | null; error: string | null};

type SessionValue = {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    setUser: (user: UserProfile | null) => void;
    refresh: () => Promise<SessionRefreshResult>;
    logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
    user: null,
    loading: true,
    error: null,
    setUser: () => undefined,
    refresh: async () => ({user: null, error: null}),
    logout: async () => undefined,
});

export const useSession = () => useContext(SessionContext);

export function SessionProvider({children}: {children: React.ReactNode}) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const requestId = useRef(0);

    const refresh = useCallback(async (): Promise<SessionRefreshResult> => {
        const id = ++requestId.current;
        let result: SessionRefreshResult;
        try {
            const res = await fetch('/api/auth/session', {cache: 'no-store'});
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                result = {user: data.userData ?? null, error: null};
            } else if (res.status === 401) {
                result = {user: null, error: null};
            } else {
                result = {user: null, error: sessionUnavailableMessage(Number(data.upstream_status) || res.status)};
            }
        } catch {
            result = {user: null, error: sessionUnavailableMessage()};
        }
        if (id !== requestId.current) {
            return result;
        }
        setUser(result.user);
        setError(result.error);
        setLoading(false);
        return result;
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const logout = useCallback(async () => {
        await fetch('/api/auth/logout', {method: 'POST'});
        setUser(null);
        setError(null);
    }, []);

    return (
        <SessionContext.Provider value={{user, loading, error, setUser, refresh, logout}}>
            {children}
        </SessionContext.Provider>
    );
}
