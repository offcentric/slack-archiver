export interface WorkspaceIdentity {
    id?: number;
    uid: string | null;
    workspace: string;
    team_id?: string | null;
    name: string | null;
    real_name: string | null;
    is_bot?: boolean | null;
}

export interface UserResponse {
    id?: number;
    email?: string;
    role?: number;
    workspaces: WorkspaceIdentity[];
}

export interface UserSession extends UserResponse {
    session_id?: string;
}

export const getWorkspaceNames = (workspaces?: Array<string | WorkspaceIdentity> | null): string[] => {
    if (!workspaces || !workspaces.length) {
        return [];
    }
    return workspaces
        .map((item) => typeof item === 'string' ? item : item?.workspace)
        .filter((name): name is string => !!name);
};

export const getWorkspaceUid = (workspaces: Array<string | WorkspaceIdentity> | null | undefined, workspace: string): string | null => {
    if (!workspaces || !workspace) {
        return null;
    }
    for (const item of workspaces) {
        if (typeof item !== 'string' && item.workspace === workspace && item.uid) {
            return item.uid;
        }
    }
    return null;
};
