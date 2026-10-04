import {UserRoles} from './user';

export const MESSAGE_SORT_COLUMNS = ['datetime', 'ts', 'user', 'channel', 'text', 'id'] as const;
export const FILE_SORT_COLUMNS = ['created_at', 'title', 'user', 'id'] as const;

export const isAdminRole = (role: unknown): boolean => Number(role) === UserRoles.ROLE_ADMIN;

export function textIlikeFilter(text: string): { ilike: string } {
    const escaped = text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    return {ilike: `%${escaped}%`};
}

export function sanitizeOrderBy(
    orderBy: unknown,
    allowed: readonly string[],
    fallback: [string, 'asc' | 'desc'],
): [string, 'asc' | 'desc'] {
    let column = fallback[0];
    let direction: 'asc' | 'desc' = fallback[1];
    if (typeof orderBy === 'string' && allowed.includes(orderBy)) {
        column = orderBy;
    } else if (Array.isArray(orderBy) && typeof orderBy[0] === 'string' && allowed.includes(orderBy[0])) {
        column = orderBy[0];
        const dir = String(orderBy[1] ?? '').toLowerCase();
        if (dir === 'asc' || dir === 'desc') {
            direction = dir;
        }
    }
    return [column, direction];
}

export function contentDispositionFilename(name: string | null | undefined): string {
    const cleaned = (name || 'file').replace(/[\r\n"]/g, '').slice(0, 180);
    return cleaned || 'file';
}
