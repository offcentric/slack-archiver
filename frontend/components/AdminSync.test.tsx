import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {UserProfile} from '@/lib/types';
import AdminSync from './AdminSync';

const archive = vi.fn();

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

const admin: UserProfile = {
    id: 1,
    email: 'a@b.c',
    role: 100,
    workspaces: [{workspace: 'acme', uid: null, name: null, real_name: null}],
};

afterEach(() => {
    cleanup();
    archive.mockReset();
});

describe('admin sync', () => {
    it('asks the archive to backfill video thumbnails for the selected workspace', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'admin/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'admin/thumbnails') {
                return {ok: true, status: 200, data: {generated: 2, skipped: 1, failed: 0}};
            }
            return {ok: false, status: 500, data: {}};
        });

        render(<AdminSync user={admin}/>);
        await userEvent.click(await screen.findByRole('button', {name: 'Generate video thumbnails'}));

        expect(archive).toHaveBeenCalledWith('admin/thumbnails', {workspace: 'acme'});
        expect((await screen.findByRole('status')).textContent).toContain('2 created, 1 already present, 0 failed');
    });
});
