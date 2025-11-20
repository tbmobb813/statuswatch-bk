# Database Setup Guide

This guide covers setting up and managing the PostgreSQL database for StatusWatch.

## Prerequisites

- PostgreSQL 14+ installed
- Prisma CLI (`npx prisma`)

## Local Development Setup

### 1. Install PostgreSQL

**macOS (Homebrew)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**
Download from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE statuswatch;
CREATE USER statuswatch_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE statuswatch TO statuswatch_user;

# Exit
\q
```

### 3. Configure Connection

Create `.env` in project root:

```bash
DATABASE_URL="postgresql://statuswatch_user:your_password@localhost:5432/statuswatch"
```

### 4. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

## Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `User` | User accounts with authentication |
| `Service` | Services being monitored |
| `CustomService` | User-defined custom services |
| `Incident` | Service incidents and outages |
| `UptimeRecord` | Historical uptime data |
| `IncidentUpdate` | Timeline updates for incidents |

### Key Relationships

```
User (1) ──< (N) CustomService
Service (1) ──< (N) Incident
Service (1) ──< (N) UptimeRecord
Incident (1) ──< (N) IncidentUpdate
```

## Common Operations

### Viewing Data

```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Or use psql
psql $DATABASE_URL
```

### Creating Migrations

```bash
# After modifying schema.prisma
npx prisma migrate dev --name your_migration_name
```

### Reset Database

```bash
# WARNING: Destroys all data
npx prisma migrate reset
```

### Backup Database

```bash
# Create backup
pg_dump -U statuswatch_user -h localhost statuswatch > backup.sql

# Restore backup
psql -U statuswatch_user -h localhost statuswatch < backup.sql
```

## Production Database

### Managed Services (Recommended)

- **Supabase** - Free tier available, Postgres compatible
- **Neon** - Serverless Postgres, generous free tier
- **Railway** - Simple deployment with database
- **AWS RDS** - Enterprise-grade, auto-scaling
- **DigitalOcean** - Managed databases with backups

### Connection Pooling

For production, use connection pooling:

```bash
# With PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/statuswatch?pgbouncer=true"
```

### SSL Configuration

```bash
# Enable SSL for production
DATABASE_URL="postgresql://user:pass@host:5432/statuswatch?sslmode=require"
```

## Performance Optimization

### Indexes

The schema includes indexes for common queries:

```sql
-- Add custom index if needed
CREATE INDEX idx_uptime_service_date ON "UptimeRecord"("serviceId", "date");
```

### Query Optimization

```bash
# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM "Service" WHERE status = 'operational';
```

### Connection Limits

```bash
# Check current connections
SELECT count(*) FROM pg_stat_activity;

# Set in postgresql.conf
max_connections = 100
```

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check port
sudo netstat -plnt | grep 5432
```

### Permission Denied

```bash
# Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO statuswatch_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO statuswatch_user;
```

### Migration Conflicts

```bash
# Check migration status
npx prisma migrate status

# Force resolve (use with caution)
npx prisma migrate resolve --applied "migration_name"
```

### Database Full

```bash
# Check size
SELECT pg_size_pretty(pg_database_size('statuswatch'));

# Vacuum to reclaim space
VACUUM FULL;
```

## Data Retention

### Cleanup Old Records

```sql
-- Delete uptime records older than 1 year
DELETE FROM "UptimeRecord"
WHERE date < NOW() - INTERVAL '1 year';

-- Archive old incidents
INSERT INTO "ArchivedIncident"
SELECT * FROM "Incident"
WHERE "resolvedAt" < NOW() - INTERVAL '6 months';
```

### Automated Cleanup

Add to cron:

```bash
0 2 * * 0 psql $DATABASE_URL -c "DELETE FROM \"UptimeRecord\" WHERE date < NOW() - INTERVAL '1 year';"
```

## Security Best Practices

1. **Use strong passwords** - Minimum 16 characters, mixed case, numbers, symbols
2. **Enable SSL** - Always use `sslmode=require` in production
3. **Limit access** - Use firewall rules to restrict database access
4. **Regular backups** - Automated daily backups with retention policy
5. **Audit logs** - Enable PostgreSQL audit logging for compliance
6. **Encrypt at rest** - Use encrypted storage volumes

## Monitoring Database Health

See `MONITORING.md` for setting up database monitoring with:
- Connection pool metrics
- Query performance tracking
- Disk usage alerts
- Replication lag monitoring
