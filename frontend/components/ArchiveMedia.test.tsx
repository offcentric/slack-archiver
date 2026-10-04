import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import ArchiveMedia, {PLACEHOLDER_SRC, VIDEO_PLACEHOLDER_SRC} from './ArchiveMedia';

afterEach(cleanup);

describe('archive media', () => {
    it('shows the archived image first and swaps to the placeholder when it fails to load', () => {
        render(<ArchiveMedia file={{id: 7, title: 'Team photo', mimetype: 'image/png'}}/>);
        const img = screen.getByRole('img', {name: 'Team photo'}) as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('/api/files/7');

        fireEvent.error(img);

        const fallback = screen.getByRole('img', {name: 'Team photo (no preview)'});
        expect(fallback.getAttribute('src')).toBe(PLACEHOLDER_SRC);
    });

    it('uses a generated thumbnail for a video and falls back when that thumbnail is missing', () => {
        render(<ArchiveMedia file={{id: 8, title: 'Clip', mimetype: 'video/mp4'}}/>);
        const img = screen.getByRole('img', {name: 'Clip (video)'});
        expect(img.getAttribute('src')).toBe('/api/files/8/thumbnail');

        fireEvent.error(img);
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
