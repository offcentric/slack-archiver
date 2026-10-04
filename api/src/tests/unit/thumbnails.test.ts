import fs from 'fs';
import os from 'os';
import path from 'path';
import {describe, expect, it} from 'vitest';
import {generateThumbnailForFile, isVideoFile, thumbnailPathForId} from '../../helpers/thumbnails';

describe('video thumbnails', () => {
    it('recognises video mime types and file types', () => {
        expect(isVideoFile({mimetype: 'video/mp4', filetype: 'mp4'})).toBe(true);
        expect(isVideoFile({mimetype: 'application/octet-stream', filetype: 'mov'})).toBe(true);
        expect(isVideoFile({mimetype: 'image/png', filetype: 'png'})).toBe(false);
    });

    it('stores a thumbnail as a jpg named with the file id', () => {
        const directory = path.join(os.tmpdir(), 'sa-thumbs');
        expect(thumbnailPathForId(42, directory)).toBe(path.join(directory, '42.jpg'));
        expect(thumbnailPathForId(0, directory)).toBeNull();
        expect(thumbnailPathForId(1.5, directory)).toBeNull();
    });

    it('writes a thumbnail from the archived video and skips one that already exists', async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-thumbs-'));
        const sourceDir = path.join(process.cwd(), 'files');
        const source = path.join(sourceDir, 'thumb-test-clip.mp4');
        const createdSourceDir = !fs.existsSync(sourceDir);
        fs.mkdirSync(sourceDir, {recursive: true});
        fs.writeFileSync(source, 'video');
        const extracted: string[] = [];
        const row = {id: 7, savepath: source, mimetype: 'video/mp4', filetype: 'mp4'};

        try {
            const first = await generateThumbnailForFile(row, {
                directory,
                extract: async (_input, output) => {
                    extracted.push(output);
                    fs.writeFileSync(output, 'jpg');
                },
            });
            const second = await generateThumbnailForFile(row, {
                directory,
                extract: async () => {
                    throw new Error('should not run');
                },
            });

            expect(first).toBe('generated');
            expect(second).toBe('skipped');
            expect(fs.readFileSync(path.join(directory, '7.jpg'), 'utf8')).toBe('jpg');
            expect(extracted).toHaveLength(1);
            expect(extracted[0].endsWith('.jpg')).toBe(true);
        } finally {
            fs.rmSync(source, {force: true});
            if (createdSourceDir) {
                fs.rmSync(sourceDir, {recursive: true, force: true});
            }
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });
});
