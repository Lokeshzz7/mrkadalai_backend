// PM2 Ecosystem Configuration
module.exports = {
  apps: [{
    name: 'mrkadalai-backend',
    script: 'app.js',
    instances: 1, // Use 'max' for cluster mode
    exec_mode: 'fork', // Use 'cluster' for load balancing
    env: {
      NODE_ENV: 'development',
      PORT: 5500
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5500
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false, // Set to true for development
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};

