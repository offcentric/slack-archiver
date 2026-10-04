import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ArchiveMedia, {MAX_MEDIA_RETRIES, PLACEHOLDER_SRC, retryDelay, VIDEO_PLACEHOLDER_SRC} from './ArchiveMedia';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const failAndWait = (name: RegExp) => {
    fireEvent.error(screen.getByRole('img', {name}));
    act(() => {
        vi.advanceTimersByTime(10_000);
    });
};

describe('archive media', () => {
    it('backs off between retries', () => {
        expect(retryDelay(0, () => 0)).toBe(1000);
        expect(retryDelay(1, () => 0)).toBe(2000);
        expect(retryDelay(2, () => 0.5)).toBe(4250);
        expect(retryDelay(6, () => 0)).toBe(8000);
    });

    it('retries a failed image with a fresh URL before giving up', () => {
        render(<ArchiveMedia file={{id: 7, title: 'Team photo', mimetype: 'image/png'}}/>);
        const img = screen.getByRole('img', {name: 'Team photo'}) as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('/api/files/7');

        fireEvent.error(img);
        expect(screen.getByRole('img', {name: 'Team photo (loading)'})).toBeTruthy();
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(screen.getByRole('img', {name: 'Team photo'}).getAttribute('src')).toBe('/api/files/7?retry=1');
    });

    it('shows the placeholder only after the retries are used up', () => {
        render(<ArchiveMedia file={{id: 7, title: 'Team photo', mimetype: 'image/png'}}/>);
        for (let attempt = 0; attempt < MAX_MEDIA_RETRIES; attempt += 1) {
            failAndWait(/^Team photo$/);
        }
        expect(screen.getByRole('img', {name: 'Team photo'}).getAttribute('src')).toBe(`/api/files/7?retry=${MAX_MEDIA_RETRIES}`);

        fireEvent.error(screen.getByRole('img', {name: 'Team photo'}));
        const fallback = screen.getByRole('img', {name: 'Team photo (no preview)'});
        expect(fallback.getAttribute('src')).toBe(PLACEHOLDER_SRC);
    });

    it('uses a generated thumbnail for a video and falls back to the video placeholder', () => {
        render(<ArchiveMedia file={{id: 8, title: 'Clip', mimetype: 'video/mp4'}} lazy/>);
        const img = screen.getByRole('img', {name: 'Clip (video)'});
        expect(img.getAttribute('src')).toBe('/api/files/8/thumbnail');
        expect(img.getAttribute('loading')).toBe('lazy');

        for (let attempt = 0; attempt <= MAX_MEDIA_RETRIES; attempt += 1) {
            failAndWait(/^Clip \(video\)$/);
        }
        const fallback = screen.getByRole('img', {name: 'Clip (video unavailable)'});
        expect(fallback.getAttribute('src')).toBe(VIDEO_PLACEHOLDER_SRC);
        expect(fallback.getAttribute('src')).not.toBe(PLACEHOLDER_SRC);
    });

    it('plays a video with its thumbnail as the poster', () => {
        const {container} = render(<ArchiveMedia file={{id: 8, title: 'Clip', mimetype: 'video/mp4'}} controls/>);
        const video = container.querySelector('video');
        expect(video?.getAttribute('src')).toBe('/api/files/8');
        expect(video?.getAttribute('poster')).toBe('/api/files/8/thumbnail');
    });
});
