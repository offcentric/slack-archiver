import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import MediaDetail from './MediaDetail';

const archive = vi.fn();

vi.mock('@/lib/client', () => ({
    archive: (...args: unknown[]) => archive(...args),
}));

afterEach(() => {
    cleanup();
    archive.mockReset();
});

describe('media detail', () => {
    it('links to the message that contains the file', async () => {
        archive.mockResolvedValue({
            ok: true,
            status: 200,
            data: {
                id: 4,
                title: 'Clip',
                mimetype: 'image/png',
                workspace: 'acme',
                message: {ts: '1700000000.000100', channel: 'general'},
            },
        });

        render(<MediaDetail workspace="acme" id="4"/>);

        const link = await screen.findByRole('link', {name: 'View message in #general'});
        expect(link.getAttribute('href')).toBe('/w/acme/messages/1700000000.000100');
        expect(archive).toHaveBeenCalledWith('file/get', {id: 4});
    });
});
