# Deployment Guide

This guide covers deploying StatusWatch to production environments.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database provisioned
- Domain name configured (optional)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/statuswatch

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Email (optional)
RESEND_API_KEY=re_xxxxx

# Server
PORT=5555
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)

1. **Connect Repository**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add `NEXT_PUBLIC_API_URL` pointing to your backend

### Option 2: Docker

1. **Build Images**
   ```bash
   # Backend
   docker build -t statuswatch-backend -f Dockerfile.backend .

   # Frontend
   docker build -t statuswatch-frontend -f Dockerfile.frontend ./frontend
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     backend:
       image: statuswatch-backend
       ports:
         - "5555:5555"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/statuswatch
         - JWT_SECRET=${JWT_SECRET}
       depends_on:
         - db

     frontend:
       image: statuswatch-frontend
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_API_URL=http://backend:5555

     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=statuswatch
         - POSTGRES_PASSWORD=password
       volumes:
         - pgdata:/var/lib/postgresql/data

   volumes:
     pgdata:
   ```

3. **Run**
   ```bash
   docker-compose up -d
   ```

### Option 3: Traditional VPS

1. **Install Dependencies**
   ```bash
   # Clone repository
   git clone https://github.com/tbmobb813/statuswatch.git
   cd statuswatch

   # Install backend
   npm install

   # Install frontend
   cd frontend && npm install
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

3. **Start with PM2**
   ```bash
   # Install PM2
   npm install -g pm2

   # Start backend
   pm2 start npm --name "statuswatch-backend" -- run start

   # Start frontend
   cd frontend
   pm2 start npm --name "statuswatch-frontend" -- run start

   # Save PM2 config
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name statuswatch.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   server {
       listen 80;
       server_name api.statuswatch.yourdomain.com;

       location / {
           proxy_pass http://localhost:5555;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## SSL/TLS Setup

### Using Certbot (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d statuswatch.yourdomain.com -d api.statuswatch.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Database Migration

Run migrations before first deployment:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Health Checks

Configure your load balancer/monitoring to check:

- **Backend**: `GET /api/health` - Returns `{"status": "ok"}`
- **Frontend**: `GET /` - Returns 200 OK

## Scaling Considerations

### Horizontal Scaling

- Backend is stateless - can run multiple instances behind load balancer
- Use Redis for session storage if scaling beyond single instance
- Database connection pooling recommended (PgBouncer)

### Caching

- Enable Redis caching for frequently accessed data
- Use CDN for static frontend assets
- Configure browser caching headers

## Rollback Procedure

```bash
# List deployments (Vercel)
vercel ls

# Rollback to previous
vercel rollback

# Or with Git
git revert HEAD
git push origin main
```

## Monitoring Production

After deployment, set up monitoring as described in `MONITORING.md`.
