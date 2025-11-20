# StatusWatch - Complete Testing Guide

This guide will help you set up, test, and validate all the new features added to StatusWatch.

---

## 🚀 Quick Start (5 Minutes)

### 1. Start the Database

**Option A: Using Docker (Recommended)**
```bash
docker compose up -d db
```

**Option B: External PostgreSQL**
- Ensure PostgreSQL is running
- Update `DATABASE_URL` in `.env` if needed

### 2. Setup Database & Run Migrations

```bash
./scripts/setup-database.sh
```

This script will:
- ✅ Check database connection
- ✅ Apply all migrations (password/role + custom services)
- ✅ Generate Prisma client
- ✅ Seed predefined services (GitHub, AWS, Vercel, Stripe, OpenAI)

### 3. Start the Backend Server

```bash
npm run dev:backend
```

Server will start on `http://localhost:5555`

### 4. Run All Tests

```bash
# Test authentication
./scripts/test-auth.sh

# Test custom services
./scripts/test-custom-services.sh

# Test analytics
./scripts/test-analytics.sh
```

---

## 📋 Detailed Testing Steps

### Phase 1: Authentication & Security

#### Test Authentication Flow

```bash
./scripts/test-auth.sh
```

**What it tests:**
- ✅ User registration with password hashing
- ✅ Login with correct password
- ✅ Login rejection with wrong password
- ✅ JWT token generation and validation
- ✅ Input validation (Zod schemas)
- ✅ Get current user endpoint

**Expected Results:**
- All tests should pass with ✅
- Token saved to `/tmp/statuswatch_token.txt`
- New user created in database

#### Create Admin User

**Option 1: Using Prisma Studio**
```bash
npx prisma studio
```
- Open browser at `http://localhost:5555`
- Find the user
- Change `role` from `USER` to `ADMIN`

**Option 2: Using SQL**
```bash
npx prisma db execute --stdin <<< "UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

**Option 3: Programmatically**
```typescript
// In Node.js or a script
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.user.update({
  where: { email: 'your@email.com' },
  data: { role: 'ADMIN' }
});
```

#### Test Admin Routes

```bash
export TOKEN=$(cat /tmp/statuswatch_token.txt)

# This should fail (403 Forbidden) if user is not admin
curl -X POST http://localhost:5555/api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "SERVICE_ID_HERE",
    "title": "Test Incident",
    "status": "investigating",
    "impact": "minor"
  }'
```

After making the user an admin, the same request should succeed (201 Created).

---

### Phase 2: Custom Service Monitoring

#### Test Custom Services

```bash
./scripts/test-custom-services.sh
```

**What it tests:**
- ✅ Service limit checking (Free tier: 3 services)
- ✅ Connectivity testing before creation
- ✅ Creating custom service
- ✅ Listing all custom services with uptime
- ✅ Getting single service details
- ✅ Updating service configuration
- ✅ Deleting service
- ✅ Input validation
- ✅ Limit enforcement

**Expected Results:**
- Service created successfully
- Uptime tracking begins immediately
- Service limits enforced correctly

#### Manual Testing: Create Custom Service

```bash
export TOKEN=$(cat /tmp/statuswatch_token.txt)

# Test connectivity first
curl -X POST http://localhost:5555/api/custom-services/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/status",
    "checkType": "https",
    "expectedStatusCode": 200,
    "timeout": 10000
  }'

# Create the service
curl -X POST http://localhost:5555/api/custom-services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API",
    "statusUrl": "https://api.github.com/status",
    "category": "API",
    "checkInterval": 5,
    "expectedStatusCode": 200,
    "responseTimeThreshold": 3000,
    "checkType": "https",
    "color": "#10B981"
  }'
```

#### Wait for Monitoring

Custom services are checked by the cron service (every 2 minutes). Wait 2-5 minutes, then check:

```bash
# List services with uptime data
curl http://localhost:5555/api/custom-services \
  -H "Authorization: Bearer $TOKEN"
```

---

### Phase 3: Advanced Analytics

#### Test Analytics

```bash
./scripts/test-analytics.sh
```

**What it tests:**
- ✅ Summary analytics overview
- ✅ MTTR (Mean Time To Resolution)
- ✅ MTTD (Mean Time To Detection)
- ✅ Reliability Score calculation
- ✅ Incident trends over time
- ✅ SLA compliance tracking
- ✅ Service comparison
- ✅ Different time periods
- ✅ Service-specific analytics

**Expected Results:**
- Analytics endpoints return data
- Metrics calculated correctly
- Different time periods work

**Note:** Analytics require historical data. If you just set up the database:
- Run the monitoring service for a few hours
- Create some test incidents
- Then analytics will be more meaningful

#### Generate Test Data (Optional)

To get meaningful analytics, you can:

**1. Let it run naturally**
- Start backend server
- Wait 24 hours
- Analytics will populate with real data

**2. Create test incidents manually**

```bash
export ADMIN_TOKEN=$(cat /tmp/statuswatch_token.txt)

# Get a service ID
SERVICE_ID=$(curl -s http://localhost:5555/api/status | jq -r '.data[0].id')

# Create test incident
curl -X POST http://localhost:5555/api/incidents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"serviceId\": \"$SERVICE_ID\",
    \"title\": \"Test Outage\",
    \"description\": \"Testing analytics\",
    \"status\": \"investigating\",
    \"severity\": \"major\"
  }"
```

**3. Use the seed script with status checks**

```javascript
// scripts/seed-analytics-data.js
// This would create realistic historical data for testing
```

---

## 🧪 Complete Test Checklist

### Authentication ✅
- [ ] User can register with email and password
- [ ] Passwords are hashed (check database - should NOT be plain text)
- [ ] User can login with correct password
- [ ] Login fails with wrong password
- [ ] JWT tokens are generated correctly
- [ ] Token includes user role
- [ ] Protected routes require authentication
- [ ] Admin routes require ADMIN role

### Custom Services ✅
- [ ] Can test service connectivity
- [ ] Can create custom service
- [ ] Service gets auto-generated slug
- [ ] Service is added to monitored services
- [ ] Can list all custom services
- [ ] Uptime is calculated correctly
- [ ] Can update service configuration
- [ ] Can delete service
- [ ] Service limits are enforced (3 for free tier)
- [ ] Input validation works
- [ ] Custom services are monitored by cron

### Analytics ✅
- [ ] Summary endpoint returns overview
- [ ] MTTR is calculated for resolved incidents
- [ ] MTTD is calculated correctly
- [ ] Reliability score is between 0-100
- [ ] Reliability score components are weighted correctly
- [ ] SLA compliance is calculated
- [ ] Incident trends show daily counts
- [ ] Service comparison works
- [ ] Different time periods work (7, 30, 90 days)
- [ ] Service-specific analytics work

### Security ✅
- [ ] Rate limiting is active (100 req/15min)
- [ ] Auth rate limiting is stricter (5 req/15min)
- [ ] Input validation rejects invalid data
- [ ] CORS is configured correctly
- [ ] Admin routes are protected
- [ ] Email notifications work (if Resend API key configured)

---

## 🔍 Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server at localhost:5432`

**Solutions:**
1. Start Docker database: `docker compose up -d db`
2. Check PostgreSQL is running: `pg_isready -h localhost -p 5432`
3. Verify `DATABASE_URL` in `.env` is correct
4. Check firewall isn't blocking port 5432

### Migration Errors

**Error:** `Migration failed`

**Solutions:**
1. Reset database: `npx prisma migrate reset` (⚠️ deletes all data)
2. Check migration files in `prisma/migrations/`
3. Ensure database is empty before first migration
4. Try: `npx prisma migrate dev` instead of `deploy`

### Authentication Not Working

**Issue:** Cannot login / token invalid

**Check:**
1. Password field exists in User model
2. Migrations have been applied
3. JWT_SECRET is set in `.env`
4. Token is being sent in Authorization header
5. Token format: `Bearer <token>`

### Custom Services Not Being Monitored

**Issue:** Uptime not updating

**Check:**
1. Backend server is running
2. Cron service is started (automatically on server start)
3. Service `isActive` is `true`
4. Check backend logs for cron execution
5. Wait at least 2 minutes for first check

### Analytics Showing No Data

**Issue:** All analytics return empty or null

**Possible Causes:**
1. No status checks yet (need to wait for monitoring)
2. No incidents created
3. Time period too narrow (try `days=90`)
4. Services just created (need historical data)

**Solution:** Let the system run for a few hours to collect data

---

## 📊 Understanding Analytics

### MTTR (Mean Time To Resolution)

**What it means:**
- Average time from incident start to resolution
- Measured in minutes
- Lower is better

**Good values:**
- Critical: < 15 minutes
- Major: < 60 minutes
- Minor: < 240 minutes

**Example:**
```json
{
  "serviceName": "GitHub",
  "mttr": 45.5,
  "totalIncidents": 10,
  "resolvedIncidents": 10
}
```

This means GitHub incidents took an average of 45.5 minutes to resolve.

### MTTD (Mean Time To Detection)

**What it means:**
- Average time from incident occurrence to creation in system
- How fast you detect problems
- Lower is better

**Good values:**
- Automated: < 5 minutes
- Manual: < 15 minutes

**Example:**
```json
{
  "serviceName": "AWS",
  "mttd": 3.2,
  "totalIncidents": 8
}
```

This means AWS incidents were detected in an average of 3.2 minutes.

### Reliability Score (0-100)

**Components:**
- 40% Uptime
- 30% Incident Frequency
- 30% Avg Resolution Time

**Interpretation:**
- 90-100: Excellent
- 75-89: Good
- 50-74: Fair
- < 50: Poor

**Example:**
```json
{
  "serviceName": "Vercel",
  "score": 96.5,
  "uptime": 99.8,
  "incidentFrequency": 1.2,
  "avgResolutionTime": 42
}
```

This is an excellent score with high uptime and quick resolution.

---

## 🎯 Next Steps

### After Testing

1. **Review Results**
   - Check all tests passed
   - Review any warnings or errors
   - Verify data in Prisma Studio

2. **Configure Production**
   - Update `.env` with production values
   - Set strong `JWT_SECRET`
   - Configure `RESEND_API_KEY` for emails
   - Update `FRONTEND_URL`

3. **Deploy**
   - Push code to repository
   - Deploy backend to Railway/Render/Fly.io
   - Deploy frontend to Vercel/Netlify
   - Run migrations on production database

4. **Monitor**
   - Check cron jobs are running
   - Verify notifications are sent
   - Review analytics for insights

---

## 📝 Test Coverage Summary

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|-----------|-------------------|-----------|
| Authentication | ✅ Manual | ✅ Script | ⬜ TODO |
| Custom Services | ✅ Manual | ✅ Script | ⬜ TODO |
| Analytics | ✅ Manual | ✅ Script | ⬜ TODO |
| Rate Limiting | ⬜ Manual | ⬜ TODO | ⬜ TODO |
| Email Notifications | ⬜ Manual | ⬜ TODO | ⬜ TODO |

**Future Improvements:**
- Add Playwright E2E tests
- Add unit tests for services
- Add integration tests for all endpoints
- Add load testing for rate limits

---

## 🙋 FAQ

**Q: Do I need to restart the server after adding custom services?**
A: No, custom services are picked up by the cron service automatically.

**Q: How often are custom services checked?**
A: Based on the `checkInterval` you set (1-60 minutes). Default is every 2 minutes.

**Q: Can I monitor services behind authentication?**
A: Not yet. Custom headers support is planned for a future release.

**Q: Why are my analytics empty?**
A: Analytics require historical data. Wait for the monitoring service to collect status checks and create incidents.

**Q: How do I upgrade from free to pro tier?**
A: Update the user's `stripePriceId` field to include "pro". Limits will automatically adjust.

**Q: Can I export analytics data?**
A: Currently via API only. CSV/PDF export is planned for a future release.

---

**Happy Testing! 🎉**

For issues or questions, check the documentation:
- [CHANGES.md](./CHANGES.md) - Security fixes
- [docs/CUSTOM_SERVICES.md](./docs/CUSTOM_SERVICES.md) - Custom monitoring
- [docs/ANALYTICS.md](./docs/ANALYTICS.md) - Analytics metrics
