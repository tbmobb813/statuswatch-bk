# Rotating JWT_SECRET and other secrets

This document outlines safe steps to rotate the `JWT_SECRET` used by the backend and common deployment scenarios.

## Key points

- Never commit the real secret to git. Keep `.env` in `.gitignore` and use secure platform env vars in production.
- Use a high-entropy secret (at least 32 bytes). Example generation: `openssl rand -hex 32`.
- Rotation requires restarting the backend so the new env var is picked up.
- Decide whether existing tokens should be invalidated. If tokens are long-lived you may want to force re-login.

## Local / development

1. Generate a new secret (locally):

```bash
openssl rand -hex 32

2. Update your `.env` (or run the helper script included in this repo):

```bash
# Writes a new secret to .env without printing it
npm run gen:jwt

3. Restart the backend:

```bash
# development (repo scripts)
npm run dev:backend:log
# or for foreground logs
npm run dev:backend
```

## Docker Compose

1. Update your environment file or `docker-compose.yml` (where you set env vars).
2. Recreate the container:

```bash
docker compose up -d --no-deps --build web

3. Confirm the new env var is used and restart workers if any.

## PM2

1. Update the env file or PM2 ecosystem file with the new `JWT_SECRET`.
2. Reload with zero-downtime:

```bash
pm2 reload ecosystem.config.cjs --env production
```

## Vercel / Netlify / Render / Railway

1. Go to your project settings in the hosting provider dashboard.
2. Update the environment variable `JWT_SECRET` with the new value.
3. Trigger a redeploy (or deploy a new release) so the runtime picks up the new secret.

## Systemd (self-hosted)

1. Update the systemd unit environment or `/etc/environment` where your secret is defined.
2. Reload and restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart my-backend.service
```

## Invalidation strategy

- Short lived tokens: if tokens are short-lived (e.g., 15m) rotating the secret can be handled without additional work — existing tokens will expire quickly.
- Long lived tokens: if you must force immediate logout, the server must track a token blacklist or a `tokenVersion` field per user, and issue new tokens only when the version matches. Implementing that is an application change.

## Rollback plan

If the new secret causes authentication failures and you need to rollback quickly, set the env var back to the previous secret in your provider and restart/redeploy.

## Audit

After rotation, confirm via logs and a smoke test that `/api/auth/login` issues tokens and that protected endpoints accept them.
