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

    it('marks videos with a video poster instead of the missing-image placeholder', () => {
        const {container} = render(<ArchiveMedia file={{id: 8, title: 'Clip', mimetype: 'video/mp4'}}/>);
        const video = container.querySelector('video');
        expect(video?.getAttribute('poster')).toBe(VIDEO_PLACEHOLDER_SRC);
        expect(video?.getAttribute('poster')).not.toBe(PLACEHOLDER_SRC);

        fireEvent.error(video!);
        const fallback = screen.getByRole('img', {name: 'Clip (video unavailable)'});
        expect(fallback.getAttribute('src')).toBe(VIDEO_PLACEHOLDER_SRC);
    });
});
