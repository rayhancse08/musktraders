# Order Inventory Solution

Full-stack **Next.js 16** order & inventory management system with **Prisma** + **PostgreSQL**.

## Features

- **Dashboard** — KPIs, revenue charts, inventory health, recent sales
- **Products** — CRUD, categories, stock recalculation from warehouse
- **Sales & Purchases** — Orders with line items, payments, status workflow
- **Warehouse** — Lot-level inventory tracking
- **Stores, Brands, Vendors** — Master data management
- **Tax, Cash In, Warehouse Costs** — Monthly financial tracking
- **Plans & Reports** — Monthly/yearly targets and financial snapshots
- **Returns & Damaged Products** — Inventory adjustments

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (bcrypt + jose) |
| Data fetching | TanStack React Query |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env

# Create database and run migrations
npx prisma db push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### 3. Login

Open [http://localhost:3000/login](http://localhost:3000/login)

| Email | Password |
|-------|----------|
| admin@nextera.com | admin123 |

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/order_inventory?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NEXT_PUBLIC_API_URL=   # leave empty for built-in API
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## API

All API routes are under `/api/` and require JWT authentication (except `/api/login`).

```
POST /api/login          — Authenticate
GET  /api/dashboard      — Dashboard data
GET  /api/products       — List products
POST /api/sales          — Create sale
... (see src/app/api/ for full routes)
```

## Project Structure

```
prisma/
  schema.prisma          — Database schema
  seed.ts                — Demo data seeder
src/
  app/
    api/                 — Backend API routes
    (pages)/             — Frontend pages
  lib/
    services/            — Business logic
    prisma.ts            — Database client
    auth-server.ts       — JWT authentication
  components/            — React components
  hooks/                 — React Query hooks
  types/                 — TypeScript types
```
