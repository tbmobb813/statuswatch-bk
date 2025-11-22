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
  // Use `cwd` so pm2 runs the process from the intended working directory
  cwd: '/home/nixstation-remote/statuswatch',
      error_file: '/home/nixstation-remote/statuswatch/logs/backend.err.log',
      out_file: '/home/nixstation-remote/statuswatch/logs/backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    },
    {
      name: 'statuswatch-frontend',
  // Run the production frontend via npm to ensure correct cwd and env.
  // pm2 will run: npm run start -- -p 3001 inside the frontend folder.
      script: 'npm',
      args: 'run start -- -p 3001',
      interpreter: '/usr/bin/env',
      interpreter_args: 'bash',
      watch: false,
      autorestart: true,
      max_restarts: 5,
  // Run from the frontend directory so `npm run start` uses the right package.json
  cwd: '/home/nixstation-remote/statuswatch/frontend',
      error_file: '/home/nixstation-remote/statuswatch/logs/frontend.err.log',
      out_file: '/home/nixstation-remote/statuswatch/logs/frontend.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
}
