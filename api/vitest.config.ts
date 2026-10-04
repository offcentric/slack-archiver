import path from 'path';
import {defineConfig} from 'vitest/config';

const src = path.resolve(__dirname, 'src');

export default defineConfig({
    test: {
        environment: 'node',
        env: {
            NODE_ENV: 'test',
            VITEST: '1',
            ENABLE_IP_BLACKLIST: 'false',
            ENABLE_RATE_LIMIT: 'false',
        },
        fileParallelism: false,
    },
    resolve: {
        alias: {
            helpers: path.join(src, 'helpers'),
            models: path.join(src, 'models'),
            controllers: path.join(src, 'controllers'),
            routes: path.join(src, 'routes'),
            providers: path.join(src, 'providers'),
            interfaces: path.join(src, 'interfaces'),
            payload: path.join(src, 'payload'),
            middleware: path.join(src, 'middleware'),
            db: path.join(src, 'db'),
        },
    },
});
