/**
 * PM2 ecosystem file for running backend + frontend in development
 * Use: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'statuswatch-backend',
      script: '/home/nixstation-remote/statuswatch/scripts/start-backend.sh',
      interpreter: '/usr/bin/env',
      interpreter_args: 'bash',
      watch: false,
      autorestart: true,
      max_restarts: 5,
      pm_cwd: '/home/nixstation-remote/statuswatch',
      error_file: '/home/nixstation-remote/statuswatch/logs/backend.err.log',
      out_file: '/home/nixstation-remote/statuswatch/logs/backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    },
    {
      name: 'statuswatch-frontend',
      script: '/home/nixstation-remote/statuswatch/scripts/start-frontend.sh',
      interpreter: '/usr/bin/env',
      interpreter_args: 'bash',
      watch: false,
      autorestart: true,
      max_restarts: 5,
      pm_cwd: '/home/nixstation-remote/statuswatch',
      error_file: '/home/nixstation-remote/statuswatch/logs/frontend.err.log',
      out_file: '/home/nixstation-remote/statuswatch/logs/frontend.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
}
