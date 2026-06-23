module.exports = {
  apps: [{
    name: 'delivery-admin',
    script: './backend/index.js',
    cwd: '/var/www/fodek-admin',
    env: {
      NODE_ENV: 'production',
      PORT: 3010,
    },
    watch: false,
    instances: 1,
    autorestart: true,
  }]
};
