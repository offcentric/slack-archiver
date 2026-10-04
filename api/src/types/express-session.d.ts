// types/express-session.d.ts
import session from 'express-session';

declare module 'express-session' {
    interface SessionData {
        email?: string;
        user_id?: number;
        workspaces?: import('../interfaces/user').WorkspaceIdentity[];
        ip_address?: string;
        session_id?: string;
        user?: { id: string; email: string };
    }
}

declare module 'express-serve-static-core' {
    interface Request {
        session: session.Session & Partial<session.SessionData>;
        sessionID?: string;
        sessionStore: session.MemoryStore;
    }
}