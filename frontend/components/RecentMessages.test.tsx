import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import RecentMessages from './RecentMessages';

const archive = vi.fn();

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

afterEach(() => {
    cleanup();
    archive.mockReset();
});

describe('recent messages', () => {
    it('lists the 25 newest messages from every channel', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: [{uid: 'U01DGEKUFBJ', name: 'mark', real_name: null}]}};
            }
            return {
                ok: true,
                status: 200,
                data: {
                    items: [
                        {
                            ts: '2.0',
                            text: 'newest across channels',
                            channel: 'random',
                            datetime: '2026-09-24T16:09:00Z',
                            slackuser: [{real_name: 'Ada Lovelace', name: 'ada'}],
                        },
                        {
                            ts: '1.0',
                            text: 'yes, <@U01DGEKUFBJ> this is what happened',
                            channel: 'general',
                            datetime: '2026-01-01T10:00:00Z',
                            slackuser: [{name: 'grace'}],
                        },
                    ],
                },
            };
        });

        render(<RecentMessages workspace="acme"/>);

        expect(await screen.findByText('newest across channels')).toBeTruthy();
        const mention = screen.getByRole('link', {name: 'mark'});
        expect(mention.getAttribute('href')).toBe('/w/acme/messages?channel=general&user=U01DGEKUFBJ');
        expect(screen.getByRole('link', {name: '#random'}).getAttribute('href')).toBe('/w/acme/messages?channel=random');
        expect(screen.getByRole('link', {name: '#general'}).getAttribute('href')).toBe('/w/acme/messages?channel=general');
        expect(screen.getByText('Ada Lovelace')).toBeTruthy();
        expect(screen.getByText('grace')).toBeTruthy();
        const timestamps = screen.getAllByRole('link', {name: /2026/}).map((link) => link.getAttribute('href'));
        expect(timestamps).toEqual(['/w/acme/messages/2.0', '/w/acme/messages/1.0']);
        expect(archive).toHaveBeenCalledWith('message/list', {
            workspace: 'acme',
            _limit: 25,
            _page: 1,
            _orderby: ['ts', 'desc'],
        });
    });

    it('says when the workspace has no messages', async () => {
        archive.mockResolvedValue({ok: true, status: 200, data: {items: []}});
        render(<RecentMessages workspace="acme"/>);
        expect(await screen.findByText('No messages in this workspace yet.')).toBeTruthy();
    });

    it('still renders when the people list fails', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'slackuser/list') {
                return {ok: false, status: 500, data: {}};
            }
            return {ok: true, status: 200, data: {items: []}};
        });
        render(<RecentMessages workspace="acme"/>);
        expect(await screen.findByText('No messages in this workspace yet.')).toBeTruthy();
    });

    it('reports a failed load', async () => {
        archive.mockImplementation(async (path: string) => {
            if (path === 'slackuser/list') {
                return {ok: true, status: 200, data: {items: []}};
            }
            return {ok: false, status: 500, data: {}};
        });
        render(<RecentMessages workspace="acme"/>);
        expect((await screen.findByRole('alert')).textContent).toBe('Could not load recent messages.');
    });
});
