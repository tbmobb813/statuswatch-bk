#!/bin/bash

# StatusWatch - Database Setup Script
# This script sets up the database and runs all migrations

set -e  # Exit on error

echo "🚀 StatusWatch Database Setup"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure your database URL"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check database connection
echo "📡 Checking database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database is reachable"
else
    echo "❌ Cannot connect to database"
    echo ""
    echo "💡 To start the database with Docker:"
    echo "   docker compose up -d db"
    echo ""
    echo "Or if using an external PostgreSQL:"
    echo "   Make sure PostgreSQL is running and DATABASE_URL in .env is correct"
    exit 1
fi

echo ""

# Check migration status
echo "🔍 Checking migration status..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo "✅ All migrations already applied"
else
    echo "📦 Applying migrations..."
    npx prisma migrate deploy
    echo "✅ Migrations applied successfully"
fi

echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma client generated"

echo ""

# Seed database
echo "🌱 Seeding database with predefined services..."
if npx prisma db seed; then
    echo "✅ Database seeded successfully"
else
    echo "⚠️  Seeding completed (some services may already exist)"
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend server: npm run dev:backend"
echo "2. Test authentication: ./scripts/test-auth.sh"
echo "3. Test custom services: ./scripts/test-custom-services.sh"
echo "4. Test analytics: ./scripts/test-analytics.sh"
echo ""
