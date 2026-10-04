import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import SearchBrowser from './SearchBrowser';

const archive = vi.fn();
const push = vi.hoisted(() => vi.fn());
const params = vi.hoisted(() => ({q: '', channel: '', user: '', page: ''}));

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({push, replace: vi.fn()}),
    usePathname: () => '/w/acme/search',
    useSearchParams: () => ({
        get: (key: string) => params[key as 'q' | 'channel' | 'user' | 'page'] || '',
        toString: () => new URLSearchParams(
            Object.entries(params).filter(([, value]) => value),
        ).toString(),
    }),
}));

afterEach(() => {
    cleanup();
    archive.mockReset();
    push.mockReset();
    params.q = '';
    params.channel = '';
    params.user = '';
    params.page = '';
});

describe('search browser', () => {
    it('runs a search that is already in the address bar', async () => {
        params.q = 'deploy';
        params.channel = 'general';
        params.user = 'U1';
        archive.mockImplementation(async (path: string) => {
            if (path === 'message/channels') {
                return {ok: true, status: 200, data: {items: ['general']}};
            }
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U1', real_name: 'Ada Lovelace', name: 'ada'}]}};
            }
            return {ok: true, status: 200, data: [{ts: '1.0', user: 'U1', text: 'please deploy today', channel: 'general', datetime: '2026-01-01T10:00:00Z'}]};
        });

        render(<SearchBrowser workspace="acme"/>);

        expect(await screen.findByText('please')).toBeTruthy();
        expect(screen.getByText('deploy').tagName).toBe('MARK');
        expect(document.querySelector('.result-author')?.textContent).toBe('Ada Lovelace');
        expect(screen.getByRole('link', {name: '#general'}).getAttribute('href')).toBe('/w/acme/messages?channel=general');
        expect(screen.getByRole('link', {name: /2026/}).getAttribute('href')).toBe('/w/acme/messages/1.0');
        expect(archive).toHaveBeenCalledWith('message/search', expect.objectContaining({
            q: 'deploy',
            channel: 'general',
            user: 'U1',
            page: 1,
        }));
    });

    it('writes the query and channel into the address bar', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U1', real_name: 'Ada Lovelace', name: 'ada'}]}};
            }
            return {ok: true, status: 200, data: {items: ['general']}};
        });
        const user = userEvent.setup();
        render(<SearchBrowser workspace="acme"/>);
        await screen.findByRole('option', {name: '#general'});
        await screen.findByRole('option', {name: 'Ada Lovelace'});

        await user.type(screen.getByLabelText('Search query'), 'outage');
        await user.selectOptions(screen.getByLabelText('Limit search to a channel'), 'general');
        await user.selectOptions(screen.getByLabelText('Limit search to an author'), 'U1');
        await user.click(screen.getByRole('button', {name: 'Search'}));

        expect(push).toHaveBeenCalledWith('/w/acme/search?q=outage&channel=general&user=U1');
    });
});
