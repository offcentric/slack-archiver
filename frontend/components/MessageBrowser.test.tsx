import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PAGE_SIZE} from '@/lib/messages';
import MessageBrowser from './MessageBrowser';

const archive = vi.fn();
const push = vi.hoisted(() => vi.fn());

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({push, replace: vi.fn()}),
    usePathname: () => '/w/acme/messages',
    useSearchParams: () => ({get: () => '', toString: () => ''}),
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
    push.mockReset();
    vi.unstubAllGlobals();
});

describe('message browser', () => {
    it('loads the first channel and waits for Apply before filtering', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general', 'random']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: []}};
            }
            return {ok: true, status: 200, data: {items: [], totalitems: 0}};
        });

        const user = userEvent.setup();
        render(<MessageBrowser workspace="acme"/>);

        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith('message/listthreaded', expect.objectContaining({
                workspace: 'acme',
                channel: 'general',
            }));
        });
        const callsBeforeFilter = archive.mock.calls.filter((call) => call[0] === 'message/listthreaded').length;

        await user.type(screen.getByLabelText('Filter message text'), 'deploy');
        await user.selectOptions(screen.getByLabelText('Browse by year'), '2025');
        expect((screen.getByLabelText('From date') as HTMLInputElement).value).toBe('2025-01-01');
        expect((screen.getByLabelText('To date') as HTMLInputElement).value).toBe('2025-12-31');
        expect(archive.mock.calls.filter((call) => call[0] === 'message/listthreaded')).toHaveLength(callsBeforeFilter);

        await user.click(screen.getByRole('button', {name: 'Apply'}));
        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith('message/listthreaded', expect.objectContaining({
                channel: 'general',
                text: 'deploy',
                date_from: '2025-01-01',
                date_to: '2025-12-31',
                _page: 1,
            }));
        });
        expect(push).toHaveBeenCalledWith('/w/acme/messages?channel=general&text=deploy&from=2025-01-01&to=2025-12-31');
        expect(screen.getByRole('button', {name: '#general'}).getAttribute('aria-current')).toBe('true');
    });

    it('collapses thread replies under the parent until opened', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: []}};
            }
            return {
                ok: true,
                status: 200,
                data: {
                    totalitems: 1,
                    items: [{
                        id: 1,
                        ts: '1.0',
                        text: 'Parent post',
                        datetime: '2026-01-01T10:00:00Z',
                        files: [{id: 9, title: 'Whiteboard', mimetype: 'image/png'}],
                        replies: [
                            {id: 2, ts: '1.1', text: 'First reply', reply_to: '1.0', files: [{id: 10, title: 'Reply shot', mimetype: 'image/jpeg'}]},
                            {id: 3, ts: '1.2', text: 'Second reply', reply_to: '1.0'},
                        ],
                    }],
                },
            };
        });

        const user = userEvent.setup();
        render(<MessageBrowser workspace="acme"/>);

        const toggle = await screen.findByRole('button', {name: 'Show 2 replies'});
        expect(screen.getByRole('img', {name: 'Whiteboard'}).getAttribute('src')).toBe('/api/files/9');
        expect(screen.queryByText('First reply')).toBeNull();

        await user.click(toggle);
        expect(screen.getByText('First reply')).toBeTruthy();
        expect(screen.getByRole('img', {name: 'Reply shot'}).getAttribute('src')).toBe('/api/files/10');
        expect(screen.getByText('Second reply')).toBeTruthy();
        expect(screen.getByRole('button', {name: 'Hide 2 replies'})).toBeTruthy();
    });

    it('filters the list by the author when their name is clicked', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U1', real_name: 'Ada Lovelace'}]}};
            }
            return {
                ok: true,
                status: 200,
                data: {
                    totalitems: 1,
                    items: [{
                        id: 1,
                        ts: '1.0',
                        user: 'U1',
                        text: 'Parent post',
                        datetime: '2026-01-01T10:00:00Z',
                    }],
                },
            };
        });

        const user = userEvent.setup();
        render(<MessageBrowser workspace="acme"/>);
        await user.click(await screen.findByRole('button', {name: 'Ada Lovelace'}));
        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith('message/listthreaded', expect.objectContaining({
                user: ['U1'],
                _page: 1,
            }));
        });
        const author = screen.getByLabelText('Filter by author') as HTMLSelectElement;
        expect(author.value).toBe('U1');
        expect(author.options[author.selectedIndex].textContent).toBe('Ada Lovelace');
    });

    it('appends the next page when the bottom of the list is visible', async () => {
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
                        ts: `${page}.${index}`,
                        text: index === 0 ? `Message ${page}` : `Filler ${page}.${index}`,
                        datetime: '2026-01-01T10:00:00Z',
                    })),
                },
            };
        });

        render(<MessageBrowser workspace="acme"/>);

        expect(await screen.findByText('Message 1')).toBeTruthy();
        expect(await screen.findByText('Message 2')).toBeTruthy();
        expect(screen.queryByRole('button', {name: 'Next'})).toBeNull();
        expect(screen.queryByRole('button', {name: 'Previous'})).toBeNull();
    });
});
