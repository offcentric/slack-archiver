'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type SessionData = {
    sessionId: string | null;
    user: any;
    workspaces: string[];
    workspace: string | null;
};

const defaultSession: SessionData = {
    sessionId: null,
    user: null,
    workspaces: [],
    workspace: null,
};

const SessionContext = createContext<{
    session: SessionData;
    setSession: React.Dispatch<React.SetStateAction>;
}>({ session: defaultSession, setSession: () => {} });

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState(() => {
        if (typeof window !== 'undefined') {onths
            const local = localStorage.getItem('session');
            return local ? JSON.parse(local) : defaultSession;
        }
        return defaultSession;
    });

    useEffect(() => {
        localStorage.setItem('session', JSON.stringify(session));
    }, [session]);

    return (
        <SessionContext.Provider value={{ session, setSession }}>
            {children}
        </SessionContext.Provider>
    );
};