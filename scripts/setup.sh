#!/bin/bash

# StatusWatch Setup Script
# This script helps you get started quickly

echo "🚀 StatusWatch Setup"
echo "===================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Backend Setup
echo "📦 Setting up backend..."
echo "----------------------"

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="$(openssl rand -base64 32)"
PORT=5555
# Uncomment and add your keys when ready
# RESEND_API_KEY="your-resend-api-key"
EOF
    echo "✅ Created .env file with random JWT secret"
else
    echo "⚠️  .env file already exists, skipping..."
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "Seeding database with initial services..."
npx tsx prisma/seed.ts

echo ""
echo "✅ Backend setup complete!"
echo ""

# Frontend Setup
echo "📦 Setting up frontend..."
echo "----------------------"

cd frontend || exit

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating frontend .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:5555" > .env.local
    echo "✅ Created .env.local file"
else
    echo "⚠️  .env.local file already exists, skipping..."
fi

cd ..

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "To start development:"
echo ""
echo "Terminal 1 (Backend):"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "Then visit http://localhost:3000"
echo ""
echo "📊 To view database:"
echo "  npx prisma studio"
echo ""
echo "Happy monitoring! 🚦"