const { env } = require("process");

module.exports = {
    apps : [{
        name: 'Slack Archive Frontend',
        script: './node_modules/.bin/next dev -p 7979',
        instances: 1,
        max_memory_restart: '1024M'
    }]
};