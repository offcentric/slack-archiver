import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import WorkspaceStats from './WorkspaceStats';

const archive = vi.fn();

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

const stats = {
    periods: [
        {
            key: 'week',
            label: 'Past 7 days',
            count: 12,
            channels: [
                {channel: 'general', count: 8},
                {channel: 'random', count: 3},
                {channel: 'ops', count: 1},
                {channel: 'hidden', count: 1},
            ],
            users: [{uid: 'U1', name: 'Ada Lovelace', count: 9}],
        },
        {key: 'month', label: 'Past 30 days', count: 340, channels: [], users: []},
        {key: 'year', label: 'Past year', count: 5000, channels: [], users: []},
    ],
};

afterEach(() => {
    cleanup();
    archive.mockReset();
});

describe('workspace stats', () => {
    it('shows three periods with the top three names and a link to the full page', async () => {
        archive.mockResolvedValue({ok: true, status: 200, data: stats});
        render(<WorkspaceStats workspace="acme"/>);

        expect(await screen.findByText('12')).toBeTruthy();
        expect(screen.getByText('340')).toBeTruthy();
        expect(screen.getByText('5,000')).toBeTruthy();
        expect(screen.getByRole('link', {name: '#general'}).getAttribute('href')).toBe('/w/acme/messages?channel=general');
        expect(screen.getByRole('link', {name: 'Ada Lovelace'}).getAttribute('href')).toBe('/w/acme/messages?channel=*&user=U1');
        expect(screen.queryByRole('link', {name: '#hidden'})).toBeNull();
        expect(screen.getByRole('link', {name: 'Full statistics'}).getAttribute('href')).toBe('/w/acme/stats');
    });

    it('shows the top ten on the full page', async () => {
        archive.mockResolvedValue({ok: true, status: 200, data: stats});
        render(<WorkspaceStats workspace="acme" variant="full"/>);

        const hidden = await screen.findByRole('link', {name: '#hidden'});
        expect(hidden.closest('li')?.querySelector('.stat-fill')?.getAttribute('style')).toBe('width: 12.5%;');
        expect(screen.getByRole('link', {name: '#general'}).closest('li')?.querySelector('.stat-fill')?.getAttribute('style')).toBe('width: 100%;');
        expect(document.querySelector('.stat-compare')).toBeNull();
        expect(screen.queryByRole('link', {name: 'Full statistics'})).toBeNull();
    });

    it('reports a failed load', async () => {
        archive.mockResolvedValue({ok: false, status: 500, data: {}});
        render(<WorkspaceStats workspace="acme"/>);
        expect((await screen.findByRole('alert')).textContent).toBe('Could not load workspace statistics.');
    });
});
