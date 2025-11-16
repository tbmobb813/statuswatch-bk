# This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database & Prisma

This project uses Prisma with a PostgreSQL datasource. Prisma expects a DATABASE_URL environment variable.

1. Copy the example env file:

```bash
cp .env.example .env```

2. Open `.env` and set `DATABASE_URL` with your credentials. For local development you can use a local Postgres server or switch to SQLite (note: if you switch to SQLite, also update `provider` in `prisma/schema.prisma`).

3. Run Prisma to push your schema and generate the client:

```bash
npx prisma db push # creates database tables from prisma/schema.prisma
npx prisma generate # generates prisma client
```

If `npx prisma db push` fails with `Environment variable not found: DATABASE_URL`, ensure your `.env` file exists and contains a valid `DATABASE_URL` before running the command.

### Using .env.local (Next.js) with Prisma

Next.js projects often keep local environment variables in `.env.local`. Prisma reads `.env` by default, so if your DB config lives in `.env.local` you have three choices:

- Copy `.env.local` to `.env` so Prisma reads it automatically:

```bash
cp .env.local .env
```

- Export the variables from `.env.local` into your current shell and then run Prisma (works on Linux/macOS):

```bash
set -a && . .env.local && set +a
npx prisma db push
```

- Use the convenience npm scripts below which will source `.env.local` for the command in a cross-platform way (via `dotenv-cli`):
Before using the helper `prisma:*:envlocal` scripts, install dependencies so `dotenv-cli` is available:

```bash
npm install
```

- Use the convenience npm scripts below which will source `.env.local` for the command in a cross-platform way (via `dotenv-cli`):

```bash
npm run prisma:db:push:envlocal
npm run prisma:generate:envlocal
```

Under the hood these scripts call `dotenv -e .env.local -- ...` so they work on Windows, macOS and Linux without bash. If you prefer not to add a dev dependency, you can still source `.env.local` with the methods above.

If you copy `.env.local` to `.env` be careful not to commit any secrets.

### Quick local Postgres with Docker

If you don't have a Postgres server, you can spin one up quickly with Docker:

```bash
docker run --name statuswatch-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=statuswatch \
  -p 5432:5432 \
  -d postgres:15
```

Then use this `DATABASE_URL` in your `.env`:

```bash
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/statuswatch?schema=public"
```

Run `npx prisma db push` and `npx prisma generate` again after you set it up.
