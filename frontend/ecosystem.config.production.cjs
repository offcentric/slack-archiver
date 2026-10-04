module.exports = {
    apps : [{
        name: 'Slack Archive Frontend',
        cwd: __dirname,
        script: [
            'mkdir -p .next/standalone/.next',
            'rm -rf .next/standalone/public .next/standalone/.next/static',
            'cp -R public .next/standalone/public',
            'cp -R .next/static .next/standalone/.next/static',
            'node .next/standalone/server.js',
        ].join(' && '),
        env: {
            NODE_ENV: 'production',
            PORT: 7979,
            HOSTNAME: '0.0.0.0',
        },
        instances: 1,
        max_memory_restart: '1024M',
    }],
};
