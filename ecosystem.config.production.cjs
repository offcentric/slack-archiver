const { env } = require("process");

module.exports = {
    apps : [{
        name: 'SLACK_ARCHIVER',
        script: 'node --import ./register-ts-loader.js ./dist/server.js',
        env: {
            COMMON_VARIABLE: 'true',
            PORT: 6969,
            NODE_ENV: 'production'
        },
        instances: 1,
        max_memory_restart: '256M'
    }]
};