const { env } = require("process");

module.exports = {
    apps : [{
        name: 'SLACK_ARCHIVER',
        script: 'tsx watch src/server.ts',
        env: {
            COMMON_VARIABLE: 'true',
            PORT: 6969,
            NODE_ENV: 'development'
        },
        instances: 1,
        max_memory_restart: '256M'
    }]
};