import os from 'os';
import path from 'path';
import {describe, expect, it} from 'vitest';
import {contentDispositionFilename, isAdminRole, sanitizeOrderBy, textIlikeFilter} from '../../helpers/archiveQuery';
import {archiveRoots, resolveArchiveFile} from '../../helpers/fileAccess';
import {buildSearchQuery, searchReturnsNothing} from '../../helpers/search';
import {UserRoles} from '../../helpers/user';

describe('archive query helpers', () => {
    it('escapes like wildcards in message text filters', () => {
        expect(textIlikeFilter('100%_done')).toEqual({ilike: '%100\\%\\_done%'});
    });

    it('only allows known sort columns', () => {
        expect(sanitizeOrderBy(['text', 'ASC'], ['text', 'ts'], ['ts', 'desc'])).toEqual(['text', 'asc']);
        expect(sanitizeOrderBy(['users.email; drop', 'asc'], ['text', 'ts'], ['ts', 'desc'])).toEqual(['ts', 'desc']);
    });

    it('treats only the admin role as admin', () => {
        expect(isAdminRole(UserRoles.ROLE_ADMIN)).toBe(true);
        expect(isAdminRole(UserRoles.ROLE_SUPERUSER)).toBe(false);
        expect(isAdminRole(UserRoles.ROLE_USER)).toBe(false);
        expect(isAdminRole('100')).toBe(true);
    });

    it('strips header-breaking characters from download names', () => {
        expect(contentDispositionFilename('a\r\n"b.png')).toBe('ab.png');
    });
});

describe('archive file paths', () => {
    const root = path.resolve('/var/archive/files');

    it('allows files stored under the archive root', () => {
        expect(resolveArchiveFile(root, path.join(root, 'acme', 'general', 'photo.png')))
            .toBe(path.join(root, 'acme', 'general', 'photo.png'));
    });

    it('rejects paths that leave the archive root', () => {
        expect(resolveArchiveFile(root, '/etc/passwd')).toBeNull();
        expect(resolveArchiveFile(root, path.join(root, '..', 'secrets.txt'))).toBeNull();
        expect(resolveArchiveFile(root, root)).toBeNull();
        expect(resolveArchiveFile(root, 'photo.png\0.jpg')).toBeNull();
    });

    it('expands a leading ~ before the containment check', () => {
        expect(resolveArchiveFile('~/library/files', '~/library/files/acme/a.png'))
            .toBe(path.join(os.homedir(), 'library/files/acme/a.png'));
    });

    it('accepts savepaths stored relative to the api directory', () => {
        const savepath = '../files/acme/general/photo.png';
        expect(resolveArchiveFile(archiveRoots('~/Projects/missing/files'), savepath))
            .toBe(path.resolve(process.cwd(), savepath));
    });

    it('maps legacy files/ savepaths onto the archive directory', () => {
        const savepath = 'files/acme/general/photo.png';
        expect(resolveArchiveFile(archiveRoots('~/Projects/missing/files'), savepath))
            .toBe(path.resolve(process.cwd(), '../files/acme/general/photo.png'));
        expect(resolveArchiveFile(archiveRoots('~/Projects/missing/files'), 'files/../../secrets.txt')).toBeNull();
    });
});

describe('message search scope', () => {
    it('limits full-text search to the caller workspaces and channel', () => {
        const {sql, bindings} = buildSearchQuery('message', ['text'], 'deploy', 20, 2, {
            workspace: ['acme'],
            channel: 'general',
        });
        expect(sql).toContain('"workspace" = ANY(?::varchar[])');
        expect(sql).toContain('"channel" = ?');
        expect(bindings[0]).toBe('deploy');
        expect(bindings[2]).toEqual(['acme']);
        expect(bindings[3]).toBe('general');
        expect(bindings.at(-2)).toBe(20);
        expect(bindings.at(-1)).toBe(20);
    });

    it('returns nothing when the session has no workspaces', () => {
        expect(searchReturnsNothing({workspace: []})).toBe(true);
        expect(searchReturnsNothing({workspace: ['acme']})).toBe(false);
        expect(searchReturnsNothing(undefined)).toBe(false);
    });
});
