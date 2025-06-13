// types/express-session.d.ts
import session from 'express-session';

declare module 'express-session' {
    interface SessionData {
        user?: { id: string; email: string }; // adjust to your actual session shape
    }
}

declare module 'express-serve-static-core' {
    interface Request {
        session: session.Session & Partial<session.SessionData>;
        sessionID?: string;
        sessionStore: session.MemoryStore;
    }
}