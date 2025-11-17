# StatusWatch - Quick Start Guide 🚀

## What You Have

All your StatusWatch project files are ready in the `statuswatch` folder!

```
✅ Backend API (Express + TypeScript)
✅ Frontend Dashboard (Next.js 16 (App Router) + React + Tailwind)
✅ Automated Monitoring (Cron jobs every 2 minutes)
✅ Notification System (Email, Discord, Slack)
✅ User Authentication (JWT)
✅ Database Schema (Prisma + SQLite)
```

## 3-Minute Setup

### Step 1: Copy Files to Your Project

```bash
# If files are in 'statuswatch' folder, you're all set!
# Otherwise, copy them to your project directory
cd /path/to/your/project
```

### Step 2: Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### Step 3: Create Environment Files

**Create `.env` in root (recommended using Postgres via docker-compose):**

```bash
docker compose up -d db
echo 'DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/statuswatch"' > .env
echo 'JWT_SECRET="change-this-to-a-random-secret"' >> .env
echo 'PORT=5555' >> .env
```

**Create `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5555
```

### Step 4: Set Up Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Step 5: Start Both Servers

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Step 6: Open Dashboard

Visit: **<http://localhost:3000>**

You should see:

- 5 services (GitHub, AWS, Vercel, Stripe, OpenAI)
- Real-time status indicators
- Uptime charts
- Incidents section

## OR Use the Automated Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This does everything automatically!

## Testing the API

```bash
# Health check
curl http://localhost:5555/health

# Get all service statuses
curl http://localhost:5555/api/status

# Get specific service
curl http://localhost:5555/api/status/github

# Get incidents
curl http://localhost:5555/api/incidents

# Get uptime
curl http://localhost:5555/api/uptime
```

## What Happens Automatically

Once running, the system will:

1. **Every 2 minutes**: Check status of all services
2. **Every 5 minutes**: Monitor unresolved incidents  
3. **Daily at 2 AM**: Clean up old status checks
4. **On status change**: Send notifications to users

## Next Steps

### 1. Add More Services

Edit `prisma/seed.ts` to add more services to monitor.

### 2. Set Up Notifications

Get API keys for:

- **Email**: Resend or SendGrid
- **Discord**: Create webhook in Discord server
- **Slack**: Create webhook in Slack workspace

Add to `.env`:

```env
RESEND_API_KEY=your_key
```

### 3. Customize Parsers

Edit `src/services/parsers/status-parser.ts` to improve status detection for each service.

### 4. Build User Features

The authentication system is ready. Build:

- Login/register pages
- User dashboard
- Alert preferences UI
- Notification center

### 5. Deploy to Production

- Backend: Railway, Render, or Fly.io
- Frontend: Vercel or Netlify
- Database: Switch to PostgreSQL

## File Overview

| File/Folder | What It Does |
|------------|--------------|
| `src/server.ts` | Main Express server |
| `src/routes/` | All API endpoints |
| `src/services/` | Business logic & monitoring |
| `src/middleware/` | Authentication |
| `frontend/app/page.tsx` | Main dashboard UI |
| `frontend/components/` | React components |
| `prisma/schema.prisma` | Database models |
| `README.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | Detailed implementation guide |

## Common Commands

```bash
# Start development
npm run dev

# Build for production
npm run build
npm start

# View database
npx prisma studio

# Reset database
npx prisma migrate reset

# Add new migration
npx prisma migrate dev --name your_migration_name
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5555
lsof -ti:5555 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Prisma Errors

```bash
npx prisma generate
npx prisma migrate reset
```

### Frontend Won't Connect

Check that:

1. Backend is running on port 5555
2. `.env.local` has correct API URL
3. CORS is enabled (already configured)

## Documentation

- **README.md** - Complete project documentation
- **IMPLEMENTATION_SUMMARY.md** - What was built, troubleshooting
- **FILE_LISTING.md** - Every file explained

## Support

- Check the README for detailed API documentation
- All code is commented and follows best practices
- Each service/component is modular and easy to modify

## You're All Set! 🎉

Your status monitoring platform is ready to go. The cron jobs will start automatically when you run the server, and you'll see status checks being performed every 2 minutes.

Happy monitoring! 🚦

---

**Pro Tips:**

- Use Prisma Studio (`npx prisma studio`) to view data in real-time
- Check server logs to see cron job activity
- Test webhooks with Discord/Slack free tiers
- The frontend auto-refreshes every 30 seconds
