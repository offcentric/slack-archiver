import {getEnvConfig} from './config';

export function ignoredSlackUserIds(workspace: string): Set<string> {
    const key = `SLACK_IGNORED_USERS_${workspace.toUpperCase()}`;
    const raw = getEnvConfig(key, []);
    const values = Array.isArray(raw) ? raw : String(raw).split(',');
    return new Set(values.map((id) => String(id).trim()).filter(Boolean));
}

export function isIgnoredSlackUser(workspace: string, userId?: string | null): boolean {
    if (!userId) {
        return false;
    }
    return ignoredSlackUserIds(workspace).has(userId);
}
