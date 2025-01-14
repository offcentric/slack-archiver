const { env } = require("process");

module.exports = {
    apps : [{
        name: 'SLACK_ARCHIVER',
        script: './node_modules/.bin/nodemon --exec node --import tsx src/server.ts -p 6969',
        // script: 'node --experimental-specifier-resolution=node --import  ./dist/server.js',
        env: {
            COMMON_VARIABLE: 'true',
            PORT: 6969,
            NODE_ENV: 'production'
        },
        instances: 1,
        max_memory_restart: '256M'
    }]
};