import fs from 'fs';
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

function insideRoot(rootResolved: string, target: string): boolean {
    const relative = path.relative(rootResolved, target);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function resolveArchiveFile(root: string | readonly string[], savepath: string | null | undefined): string | null {
    if (!savepath || savepath.includes('\0')) {
        return null;
    }
    const roots = (Array.isArray(root) ? root : [root]).map((item) => path.resolve(expandHome(item)));
    const expanded = expandHome(savepath);
    const candidates: string[] = [];
    const add = (target: string) => {
        if (roots.some((rootResolved) => insideRoot(rootResolved, target)) && !candidates.includes(target)) {
            candidates.push(target);
        }
    };

    add(path.resolve(expanded));
    if (!path.isAbsolute(expanded)) {
        const legacy = expanded.replace(/^files[/\\]/, '');
        if (legacy !== expanded) {
            for (const rootResolved of roots) {
                add(path.resolve(rootResolved, legacy));
            }
        }
    }

    const present = candidates.find((target) => fs.existsSync(target));
    if (present) {
        return present;
    }
    const underExistingRoot = candidates.find((target) => roots.some((rootResolved) => insideRoot(rootResolved, target) && fs.existsSync(rootResolved)));
    return underExistingRoot ?? candidates[0] ?? null;
}
