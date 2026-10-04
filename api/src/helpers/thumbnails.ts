import {spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {Knex} from 'knex';
import {getEnvConfig} from './config';
import {archiveRoots, expandHome, resolveArchiveFile} from './fileAccess';
import Exception from '../models/exception';
import {status} from './status';

export const VIDEO_FILETYPES = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'];

export interface VideoFileRow {
    id: number;
    uid?: string | null;
    savepath?: string | null;
    mimetype?: string | null;
    filetype?: string | null;
    workspace?: string | null;
}

export type ThumbnailResult = 'generated' | 'skipped' | 'failed';

export interface ThumbnailSummary {
    total: number;
    generated: number;
    skipped: number;
    failed: number;
}

type FrameExtractor = (input: string, output: string) => Promise<void>;

export function isVideoFile(file: {mimetype?: string | null; filetype?: string | null} | null | undefined): boolean {
    if (!file) {
        return false;
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.startsWith('video/')) {
        return true;
    }
    return VIDEO_FILETYPES.includes((file.filetype || '').toLowerCase());
}

export function thumbnailDirectory(): string {
    const configured = getEnvConfig('THUMBNAIL_DIRECTORY', '');
    if (configured) {
        return path.resolve(expandHome(String(configured)));
    }
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, '../../../static/thumbnails');
}

export function thumbnailPathForId(id: number, directory = thumbnailDirectory()): string | null {
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }
    const root = path.resolve(directory);
    const dest = path.resolve(root, `${id}.jpg`);
    const relative = path.relative(root, dest);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }
    return dest;
}

function runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', args, {stdio: ['ignore', 'ignore', 'pipe']});
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('ffmpeg_timeout'));
        }, 60_000);
        child.stderr?.on('data', (chunk) => {
            stderr = (stderr + chunk.toString()).slice(-2000);
        });
        child.on('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr || `ffmpeg_exit_${code}`));
        });
    });
}

async function extractFrameWithFfmpeg(input: string, output: string): Promise<void> {
    const args = (offset: string) => [
        '-hide_banner', '-loglevel', 'error',
        '-y', '-ss', offset, '-i', input,
        '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3',
        output,
    ];
    try {
        await runFfmpeg(args('1'));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw error;
        }
        await runFfmpeg(args('0'));
    }
}

export function ffmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const child = spawn('ffmpeg', ['-version'], {stdio: 'ignore'});
        child.on('error', () => resolve(false));
        child.on('close', (code) => resolve(code === 0));
    });
}

export async function generateThumbnailForFile(
    row: VideoFileRow,
    options: {force?: boolean; directory?: string; extract?: FrameExtractor} = {},
): Promise<ThumbnailResult> {
    if (!isVideoFile(row)) {
        return 'skipped';
    }
    const dest = thumbnailPathForId(Number(row.id), options.directory);
    if (!dest) {
        return 'failed';
    }
    if (!options.force && fs.existsSync(dest)) {
        return 'skipped';
    }
    const source = resolveArchiveFile(archiveRoots(getEnvConfig('FILES_DOWNLOAD_DIRECTORY', '../files')), row.savepath);
    if (!source || !fs.existsSync(source)) {
        return 'failed';
    }
    const extract = options.extract ?? extractFrameWithFfmpeg;
    // The temp name has to end in .jpg. ffmpeg picks the image format from the extension, and `.part` makes it refuse to write.
    const tmp = `${dest.slice(0, -'.jpg'.length)}.${process.pid}.part.jpg`;
    try {
        await fs.promises.mkdir(path.dirname(dest), {recursive: true});
        await extract(source, tmp);
        await fs.promises.rename(tmp, dest);
        return 'generated';
    } catch (error) {
        await fs.promises.rm(tmp, {force: true}).catch(() => undefined);
        console.error('[thumbnails]', row.id, error instanceof Error ? error.message : error);
        return 'failed';
    }
}

export function videoFileQuery(database: Knex, workspace?: string) {
    const query = database('file')
        .select('id', 'uid', 'savepath', 'mimetype', 'filetype', 'workspace')
        .where(function () {
            this.where('mimetype', 'ilike', 'video/%').orWhereIn('filetype', VIDEO_FILETYPES);
        });
    if (workspace) {
        query.andWhere('workspace', workspace);
    }
    return query;
}

export async function backfillThumbnails(
    database: Knex,
    workspace?: string,
    options: {force?: boolean; onProgress?: (event: {id: number; result: ThumbnailResult}) => void} = {},
): Promise<ThumbnailSummary> {
    if (!(await ffmpegAvailable())) {
        throw new Exception('ffmpeg_not_available', status.error);
    }
    const rows = await videoFileQuery(database, workspace);
    const summary: ThumbnailSummary = {total: rows.length, generated: 0, skipped: 0, failed: 0};
    for (const row of rows) {
        const result = await generateThumbnailForFile(row, {force: options.force});
        summary[result] += 1;
        options.onProgress?.({id: Number(row.id), result});
    }
    return summary;
}

export async function generateThumbnailsForSlackFiles(
    database: Knex,
    files: Array<{id?: string; mimetype?: string | null; filetype?: string | null}> | null | undefined,
    workspace: string,
): Promise<void> {
    const videos = (Array.isArray(files) ? files : []).filter((file) => file?.id && isVideoFile(file));
    if (!videos.length) {
        return;
    }
    if (!(await ffmpegAvailable())) {
        console.error('[thumbnails] ffmpeg_not_available');
        return;
    }
    for (const video of videos) {
        const row = await database('file').where({uid: String(video.id), workspace}).first();
        if (!row) {
            continue;
        }
        await generateThumbnailForFile(row);
    }
}
