# Database Setup Guide

## Overview
This guide covers setting up PostgreSQL and running Prisma migrations for AgarCrypto.

## Database Schema

The schema includes:
- **User** - Wallet addresses and user management
- **PlayerStats** - ELO ratings, kills, deaths, earnings, streaks
- **Game** - Game sessions with pool tracking and winners
- **GamePlayer** - Player participation and performance per game
- **Transaction** - Blockchain transaction tracking
- **Achievement** - Achievement/badge system

## Prerequisites

### Install PostgreSQL

#### Mac (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### Verify Installation
```bash
psql --version
# Should output: psql (PostgreSQL) 16.x
```

## Database Setup Steps

### 1. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE agarcrypto;

# Create user (optional, for security)
CREATE USER agarcrypto_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE agarcrypto TO agarcrypto_user;

# Exit psql
\q
```

### 2. Configure Environment Variables

Copy the example env file:
```bash
cd server
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
# Local PostgreSQL (default user)
DATABASE_URL="postgresql://postgres:password@localhost:5432/agarcrypto?schema=public"

# Or with custom user
DATABASE_URL="postgresql://agarcrypto_user:your_secure_password@localhost:5432/agarcrypto?schema=public"

# For production/cloud (example with Heroku)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

### 3. Generate Prisma Client

```bash
cd server
npm run prisma:generate
```

This generates TypeScript types and Prisma Client based on your schema.

### 4. Run Migrations

#### Development (creates migration files)
```bash
npm run prisma:migrate
# Enter a migration name, e.g., "initial_setup"
```

#### Production (applies existing migrations)
```bash
npm run prisma:migrate:deploy
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "agarcrypto"

PostgreSQL database agarcrypto created at localhost:5432

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240313120000_initial_setup/
    └─ migration.sql

Your database is now in sync with your schema.
```

### 5. Verify Database

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Or check with psql
psql agarcrypto

# List tables
\dt

# Should see:
# - User
# - PlayerStats
# - Game
# - GamePlayer
# - Transaction
# - Achievement
```

## Common Issues

### "Connection refused" Error
**Problem:** PostgreSQL is not running

**Solution:**
```bash
# Mac
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL service from Services app
```

### "Authentication failed" Error
**Problem:** Wrong username/password in DATABASE_URL

**Solution:**
1. Reset PostgreSQL password:
```bash
psql postgres
ALTER USER postgres PASSWORD 'newpassword';
\q
```

2. Update `.env` with correct credentials

### "Database does not exist" Error
**Problem:** Database not created

**Solution:**
```bash
psql postgres
CREATE DATABASE agarcrypto;
\q
```

Then run migrations again.

### Migration Conflicts
**Problem:** Schema out of sync

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:reset

# Or manually
psql agarcrypto
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Then run migrations
npm run prisma:migrate
```

## Using Prisma Client in Code

After migration, import and use Prisma Client:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Example: Create user
const user = await prisma.user.create({
  data: {
    walletAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    stats: {
      create: {
        eloRating: 1000,
        gamesPlayed: 0
      }
    }
  }
});

// Example: Get leaderboard
const leaderboard = await prisma.playerStats.findMany({
  take: 100,
  orderBy: { eloRating: 'desc' },
  include: { user: true }
});

// Don't forget to disconnect
await prisma.$disconnect();
```

## Database Backup

### Backup Database
```bash
pg_dump agarcrypto > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql agarcrypto < backup_20240313.sql
```

## Production Considerations

### Cloud PostgreSQL Options
- **Heroku Postgres** - Easy setup, free tier available
- **AWS RDS** - Scalable, managed service
- **DigitalOcean Databases** - Simple, affordable
- **Supabase** - Open-source Firebase alternative with PostgreSQL
- **Railway** - Modern, developer-friendly

### Connection Pooling
For production, use connection pooling:

```typescript
// In your database client file
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Environment-Specific Migrations
```bash
# Development
npm run prisma:migrate

# Staging/Production
npm run prisma:migrate:deploy
```

## Useful Commands

```bash
# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Apply existing migrations (production)
npm run prisma:migrate:deploy

# Open Prisma Studio GUI
npm run prisma:studio

# Reset database (deletes all data!)
npm run prisma:reset

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Next Steps

After database setup:
1. Update `StatsService.ts` to use Prisma instead of in-memory Map
2. Implement database persistence in game event handlers
3. Create API endpoints that query the database
4. Test leaderboards with real data

---

**Need Help?**
- Prisma Docs: https://www.prisma.io/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Prisma Discord: https://pris.ly/discord
