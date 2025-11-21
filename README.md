# StatusWatch 🚦

Real-time status monitoring for popular developer tools and services. Get instant notifications when your favorite services go down or experience issues.

## Features

- ✅ **Real-time Monitoring**: Automated checks every 2 minutes
- 📊 **Beautiful Dashboard**: Clean, responsive UI showing service status
- 🔔 **Multi-channel Notifications**: Email, Discord, and Slack webhooks
- 📈 **Uptime Tracking**: 90-day historical uptime charts
- 🔐 **User Authentication**: Secure JWT-based authentication
- 👤 **Personal Preferences**: Monitor only the services you care about
- 🚨 **Incident Management**: Track and resolve service incidents
- ⚡ **Fast & Lightweight**: Built with Express and Next.js

## Monitored Services

- GitHub
- AWS
- Vercel
- Stripe
- OpenAI
- (Easily extensible to add more)

## Tech Stack

### Backend

- **Node.js** + **Express**: REST API server
-- **Prisma**: Type-safe database ORM
-- **PostgreSQL**: Default development database (docker-compose included)
- **node-cron**: Scheduled status checks
- **cheerio**: HTML parsing for status pages
- **JWT**: Authentication
- **bcrypt**: Password hashing

### Frontend

- **Next.js (16.x)**: React framework with App Router
- **TailwindCSS**: Utility-first CSS
- **TypeScript**: Type safety

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Backend Setup

. **Clone and navigate to the project**

```bash
cd statuswatch
```

. **Install dependencies**

```bash
npm install
```

. **Set up environment variables**

```bash
# Recommended: use local Postgres (see docker-compose.yml)
# Example: start Postgres and create .env
docker compose up -d db
echo 'DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/statuswatch"' > .env
echo 'JWT_SECRET="your-super-secret-key-change-this"' >> .env
echo 'PORT=5555' >> .env

# Optional: Add email service (Resend, SendGrid, etc.)
# echo 'RESEND_API_KEY="your-resend-key"' >> .env
```

. **Generate Prisma client and run migrations**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

. **Seed the database with services**

```bash
npx tsx prisma/seed.ts
```

. **Start the development server**

```bash
npm run dev
```

Server will be running at `http://localhost:5555`

### Frontend Setup

. **Navigate to frontend directory**

```bash
cd frontend
```

. **Install dependencies**

```bash
npm install
```

. **Create .env.local**

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:5555' > .env.local
```

. **Start the development server**

```bash
npm run dev
```

Frontend will be running at `http://localhost:3000`

## API Endpoints

### Public Endpoints

#### Status

- `GET /api/status` - Get all service statuses
- `GET /api/status/:slug` - Get specific service status
- `POST /api/status/:slug/refresh` - Force refresh a service

#### Incidents

- `GET /api/incidents` - Get recent incidents
- `GET /api/incidents/:id` - Get specific incident

#### Uptime

- `GET /api/uptime` - Get uptime data for all services (90 days)
- `GET /api/uptime/:slug` - Get uptime for specific service

### Authentication Required

#### Auth

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### User Preferences

- `GET /api/user/services` - Get monitored services
- `POST /api/user/services/:slug` - Add service to monitoring
- `DELETE /api/user/services/:slug` - Remove service
- `GET /api/user/alerts` - Get alert preferences
- `PUT /api/user/alerts` - Update alert preferences
- `GET /api/user/notifications` - Get notifications
- `PATCH /api/user/notifications/:id/read` - Mark as read

## Configuration

### Adding New Services

. Add service to database:

```typescript
await prisma.service.create({
  data: {
    name: 'New Service',
    slug: 'new-service',
    category: 'Category',
    statusUrl: 'https://status.newservice.com',
    logoUrl: 'https://logo-url.png',
    color: '#hexcolor',
    isActive: true
  }
});
```

. Add parser in `src/services/parsers/status-parser.ts`:

```typescript
private parseNewService($: cheerio.CheerioAPI): ParsedStatus {
  // Your custom parsing logic
  return {
    status: 'operational',
    message: 'All systems operational'
  };
}
```

### Notification Setup

#### Email (Resend)

```bash
# Add to .env
RESEND_API_KEY=your_key
```

#### Discord Webhook

Users can add their Discord webhook URL in alert preferences

#### Slack Webhook

Users can add their Slack webhook URL in alert preferences

## Database Schema

### Key Models

- **Service**: Services being monitored
- **StatusCheck**: Historical status check results
- **Incident**: Service incidents/outages
- **User**: Registered users
- **MonitoredService**: User's watched services
- **AlertPreference**: User notification preferences
- **Notification**: In-app notifications

## Cron Jobs

- **Status Monitoring**: Every 2 minutes
- **Incident Checking**: Every 5 minutes  
- **Cleanup Old Checks**: Daily at 2 AM (keeps 7 days)

## Project Structure

statuswatch/
├── src/
│   ├── routes/
│   │   ├── status.routes.ts
│   │   ├── incidents.routes.ts
│   │   ├── uptime.routes.ts
│   │   ├── auth.routes.ts
│   │   └── user.routes.ts
│   ├── services/
│   │   ├── status.service.ts
│   │   ├── cron.service.ts
│   │   ├── notification.service.ts
│   │   └── parsers/
│   │       └── status-parser.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   └── components/
│       ├── ServiceCard.tsx
│       ├── IncidentList.tsx
│       └── UptimeChart.tsx
└── package.json

## Development

### Run Tests

There are no automated tests included yet. You can add a test script to `package.json` or run your own test runner.

### Build for Production

```bash
npm run build
npm start
```

### Database Commands

```bash
# View database in Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"
PORT=5555
RESEND_API_KEY="optional-email-service-key"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5555
```

## Deployment

### Backend (Railway, Render, Fly.io)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy!

### Frontend (Vercel, Netlify)

1. Push code to GitHub
2. Import project
3. Set NEXT_PUBLIC_API_URL
4. Deploy!

## CI / GitHub Actions: Monitoring workflow

If you run the monitoring job in CI (GitHub Actions), ensure the runner has a non-empty `DATABASE_URL`.

1. Add a repository secret named `DATABASE_URL` (Settings → Secrets → Actions) with your Postgres connection string.

2. The repository includes a sample workflow at `.github/workflows/monitor.yml` which uses that secret:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '22'
  - run: npm ci
  - run: npm run monitor:run
```

Notes:

- The workflow injects `DATABASE_URL` so Prisma's `env("DATABASE_URL")` resolves correctly.
- If you prefer not to store the DB URL as a secret, you can write it into a `.env` file in a job step from another secret and use `dotenv-cli`, but using Secrets is recommended for security.

## Contributing

## Run the monitor locally with tmux

If you want the monitoring job to keep running detached from your terminal, use `tmux` so it survives disconnects and accidental Ctrl-C.

1. Create a detached tmux session that runs the monitor:

```bash
# start a detached session named 'statuswatch' and run the monitor
tmux new-session -d -s statuswatch "npm run monitor:run"

2. Attach to the session to watch logs or interact:

```bash
tmux attach -t statuswatch
# Detach without stopping: Ctrl-B then D

3. When finished, stop the session (kills the monitor):

```bash
tmux kill-session -t statuswatch

Notes:
- `monitor:run` already loads `.env` via `dotenv-cli` (see `package.json`), so ensure your `.env` contains `DATABASE_URL` before starting tmux.
- For long-term runs consider using a process manager like `pm2` or a system service instead of tmux.

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

---

## Linting (ESLint v9)

This repository uses ESLint v9 with flat configurations. We run linting per-package to avoid scanning build artifacts. Key files:

- Root flat config: `eslint.config.js`
- Frontend flat config: `frontend/eslint.config.js`

Recommended commands:

```bash
# Lint backend (server)
npx eslint src --ext .js,.ts,.tsx

# Lint frontend (from repo root)
cd frontend && npx eslint . --ext .js,.ts,.tsx
```

Notes:

- `frontend/.eslintignore` excludes `.next` build artifacts so they are not linted.
- If you encounter unexpected rules or config resolution, run ESLint with `--debug` to inspect which config is used.

Built with ❤️ for developers who rely on these amazing tools.
