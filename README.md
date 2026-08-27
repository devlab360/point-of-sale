# OneDesk360 — Multi-Business SaaS Point of Sale (POS) System

**OneDesk360** is an enterprise-grade, multi-tenant SaaS Point of Sale (POS) and Store Management system built with **TanStack Start**, **React 19**, **Drizzle ORM**, and **PostgreSQL**.

---

## 🚀 Key Features

- **Multi-Tenant SaaS Architecture**: Super Admin portal for tenant onboarding, plan lifecycle management, and custom feature menu overrides.
- **POS Checkout Terminal**: High-performance Point of Sale terminal supporting cash, card, and split payment methods.
- **Master Product Catalog**: Products, variants, categories, brands, units, barcodes, SKUs, and inventory stock tracking.
- **Customer CRM & Ledgers**: Khata ledger tracking, credit limits, and customer wallet balances.
- **Finance & Accounting**: Chart of accounts, expense tracking, daily registers, and financial reporting.
- **Staff & Role Management**: Granular role-based authorization (Super Admin, Store Admin, Manager, Cashier).

---

## 🛠️ Tech Stack

- **Frontend / Framework**: React 19, TanStack Start (SSR & Server Functions), TanStack Router, Vite, TailwindCSS
- **State & Data Fetching**: TanStack Query (React Query v5)
- **Database Layer**: PostgreSQL (`pos_db`), Drizzle ORM, Drizzle-Kit
- **Authentication**: JWT Cookie Sessions & Password Hashing (`bcryptjs`)

---

## 🗄️ Database Commands

```bash
# Generate Drizzle migration files
npm run db:generate

# Execute pending database migrations
npm run db:migrate

# Direct database schema push
npm run db:push

# Seed database with Master Data & Demo Store
npm run db:seed
```

---

## 🔑 Default Credentials

### 1. Super Admin Portal (`/admin`)

- **Email**: `admin@superadmin.com`
- **Password**: `superadmin_password`

### 2. Demo Store Owner (`/login`)

- **Email**: `demo@onedesk360.com`
- **Password**: `password123`

### 3. Demo Cashier Staff (`/login`)

- **Email**: `cashier@onedesk360.com`
- **Password**: `password123`

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Push Database Schema & Seed Data
npm run db:push
npm run db:seed

# 3. Start Development Server
npm run dev
```

App runs live at: **`http://localhost:8080`**

---

## 📜 License & Copyright

© 2026 **[DevLab360](https://devlab360.com/)**. All rights reserved.
