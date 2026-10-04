export const ADMIN_ROLE = 100;

export interface WorkspaceIdentity {
    id?: number;
    uid: string | null;
    workspace: string;
    name: string | null;
    real_name: string | null;
}

export interface UserProfile {
    id: number;
    email: string;
    role: number;
    workspaces: WorkspaceIdentity[];
}

export interface SlackUser {
    uid: string;
    workspace?: string;
    name: string | null;
    real_name: string | null;
}

export interface ArchiveFile {
    id: number;
    title?: string | null;
    name?: string | null;
    mimetype?: string | null;
    filetype?: string | null;
    user?: string | null;
    real_name?: string | null;
    slack_name?: string | null;
    created_at?: string | null;
    workspace?: string | null;
    message?: {ts: string; channel?: string | null} | null;
}

export interface ArchiveMessage {
    id: number;
    ts: string;
    text?: string | null;
    user?: string | null;
    datetime?: string | null;
    channel?: string | null;
    workspace?: string | null;
    reply_to?: string | null;
    parent?: { ts: string; text?: string | null; channel?: string | null; user?: string | null } | null;
    slackuser?: Array<{ uid?: string; name?: string | null; real_name?: string | null }> | null;
    files?: ArchiveFile[] | null;
    replies?: ArchiveMessage[] | null;
}

export const isAdmin = (user: UserProfile | null | undefined) => Number(user?.role) === ADMIN_ROLE;

export const onlyWorkspace = (user: UserProfile | null | undefined): string | null => {
    if (user?.workspaces?.length === 1) {
        return user.workspaces[0].workspace;
    }
    return null;
};

export const identityForWorkspace = (user: UserProfile | null | undefined, workspace: string | null) => {
    if (!user || !workspace) {
        return null;
    }
    return user.workspaces.find((item) => item.workspace === workspace) ?? null;
};
