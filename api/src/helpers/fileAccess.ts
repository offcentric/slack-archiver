import os from 'os';
import path from 'path';

export function expandHome(value: string): string {
    if (value === '~') {
        return os.homedir();
    }
    if (value.startsWith('~/') || value.startsWith('~\\')) {
        return path.join(os.homedir(), value.slice(2));
    }
    return value;
}

export function archiveRoots(configured?: string | null): string[] {
    const candidates = [
        configured?.trim() || '',
        path.join(process.cwd(), '../files'),
        path.join(process.cwd(), 'files'),
    ].filter(Boolean);
    const roots: string[] = [];
    for (const candidate of candidates) {
        const resolved = path.resolve(expandHome(candidate));
        if (!roots.includes(resolved)) {
            roots.push(resolved);
        }
    }
    return roots;
}

export function resolveArchiveFile(root: string | readonly string[], savepath: string | null | undefined): string | null {
    if (!savepath || savepath.includes('\0')) {
        return null;
    }
    const target = path.resolve(expandHome(savepath));
    const roots = (Array.isArray(root) ? root : [root]).map((item) => path.resolve(expandHome(item)));
    for (const rootResolved of roots) {
        const relative = path.relative(rootResolved, target);
        if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
            return target;
        }
    }
    return null;
}
