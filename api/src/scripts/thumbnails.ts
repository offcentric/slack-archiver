import process from 'node:process';
import {db} from '../db/knex';
import {backfillThumbnails, thumbnailDirectory} from '../helpers/thumbnails';

const args = process.argv.slice(2);
let workspace: string | undefined;
let force = false;

for (const arg of args) {
    if (arg === '--force') {
        force = true;
    } else if (!workspace) {
        workspace = arg;
    } else {
        console.error('Usage: npm run thumbnails -- [workspace] [--force]');
        process.exit(1);
    }
}

try {
    console.log(`Writing thumbnails to ${thumbnailDirectory()}`);
    const summary = await backfillThumbnails(db, workspace, {
        force,
        onProgress: ({id, result}) => {
            if (result !== 'skipped') {
                console.log(`${result} ${id}`);
            }
        },
    });
    console.log(JSON.stringify(summary));
    await db.destroy();
    process.exit(0);
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await db.destroy();
    process.exit(1);
}
