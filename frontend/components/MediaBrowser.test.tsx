import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PAGE_SIZE} from '@/lib/messages';
import MediaBrowser from './MediaBrowser';

const archive = vi.fn();

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

class ImmediateObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() {
        this.callback([{isIntersecting: true} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
}

afterEach(() => {
    cleanup();
    archive.mockReset();
    vi.unstubAllGlobals();
});

describe('media browser', () => {
    it('appends the next page when the bottom of the album is visible', async () => {
        vi.stubGlobal('IntersectionObserver', ImmediateObserver);
        archive.mockImplementation(async (path: string, body?: {_page?: number}) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: []}};
            }
            const page = body?._page || 1;
            const count = page === 1 ? PAGE_SIZE : 1;
            return {
                ok: true,
                status: 200,
                data: {
                    totalitems: PAGE_SIZE + 1,
                    items: Array.from({length: count}, (_, index) => ({
                        id: page * 1000 + index,
                        title: index === 0 ? `Clip ${page}` : `Still ${page}.${index}`,
                        mimetype: 'image/png',
                        created_at: '2026-01-01T10:00:00Z',
                    })),
                },
            };
        });

        render(<MediaBrowser workspace="acme"/>);

        expect(await screen.findByRole('button', {name: 'Clip 1'})).toBeTruthy();
        expect(await screen.findByRole('button', {name: 'Clip 2'})).toBeTruthy();
        expect(screen.queryByRole('button', {name: 'Next'})).toBeNull();
    });

    it('waits for Apply before reloading with the chosen filters', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general', 'random']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U1', real_name: 'Ada'}]}};
            }
            return {ok: true, status: 200, data: {items: [], totalitems: 0}};
        });

        const user = userEvent.setup();
        render(<MediaBrowser workspace="acme"/>);
        await screen.findByRole('button', {name: 'Apply'});
        await waitFor(() => {
            expect(archive.mock.calls.some((call) => call[0] === 'file/list')).toBe(true);
        });
        const callsBefore = archive.mock.calls.filter((call) => call[0] === 'file/list').length;

        await user.selectOptions(screen.getByLabelText('Channel'), 'random');
        await user.selectOptions(screen.getByLabelText('User'), 'U1');
        expect(archive.mock.calls.filter((call) => call[0] === 'file/list')).toHaveLength(callsBefore);

        await user.click(screen.getByRole('button', {name: 'Apply'}));
        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith('file/list', expect.objectContaining({
                channel: 'random',
                user: 'U1',
                _page: 1,
            }));
        });
    });

    it('filters the album by the person when their name is clicked', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U1', real_name: 'Ada'}]}};
            }
            return {
                ok: true,
                status: 200,
                data: {
                    totalitems: 1,
                    items: [{id: 4, title: 'Clip', user: 'U1', real_name: 'Ada', mimetype: 'image/png', created_at: '2026-01-01T10:00:00Z'}],
                },
            };
        });

        const user = userEvent.setup();
        render(<MediaBrowser workspace="acme"/>);
        await user.click(await screen.findByRole('button', {name: 'Ada'}));
        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith('file/list', expect.objectContaining({user: 'U1', _page: 1}));
        });
        expect((screen.getByLabelText('User') as HTMLSelectElement).value).toBe('U1');
    });
});
