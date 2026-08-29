---
name: onedesk360-pos
description: >-
  Comprehensive engineering guidelines, database operations, POS checkout workflows,
  SaaS multi-tenancy management, and end-to-end testing application flows for OneDesk360.
---

# OneDesk360 Cloud POS Skill & Engineering Playbook

This skill provides step-by-step procedures, architectural best practices, design standards, and operational commands for developing, managing, testing, and debugging the **OneDesk360** multi-tenant Cloud Point-of-Sale ecosystem.

### Related Specialized Skills:
- **Design System**: [`.agents/skills/onedesk360-design-system/SKILL.md`](file:///d:/laragon/www/point-of-sale/.agents/skills/onedesk360-design-system/SKILL.md) — UI tokens, gold `#B58D4C` palette, Drawer side-sheet pattern, responsive layout standards.
- **Coding Patterns**: [`.agents/skills/onedesk360-coding-patterns/SKILL.md`](file:///d:/laragon/www/point-of-sale/.agents/skills/onedesk360-coding-patterns/SKILL.md) — TanStack Start server functions, Drizzle multi-tenant queries, React Query v5 caching, and Dexie offline synchronization.

---

## 1. Environment & Database Setup Workflows

### 1.1 Database Migration & Schema Sync
When modifying the Drizzle schema in `src/db/schema.ts`:

```bash
# 1. Generate SQL migration files based on schema changes
npm run db:generate

# 2. Push schema changes directly to the PostgreSQL database
npm run db:push

# 3. Seed database with master pricing plans, admin users, and demo store data
npm run db:seed
```

### 1.2 Development Server
```bash
# Run local Vite SSR development server
npm run dev
```

---

## 2. Authentication & Access Matrix

Default credentials configured during database seeding:

| Portal | Route | Default Email | Default Password | Role Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `/admin` | `admin@superadmin.com` | `superadmin_password` | Root Multi-Tenant Authority |
| **Store Owner** | `/login` | `demo@onedesk360.com` | `password123` | Full Store Admin & Accounting |
| **Store Cashier** | `/login` | `cashier@onedesk360.com` | `password123` | POS Terminal & Shifts |

---

## 3. End-to-End Test Application Flow Runbook

Follow this workflow to validate full application health:

### Flow A: Multi-Tenant Provisioning (Super Admin)
1. **Login to Super Admin**: Navigate to `http://localhost:3000/admin` and authenticate.
2. **Review Metrics**: Check MRR, active stores, and pending payments on the Executive Dashboard (`/admin/dashboard`).
3. **Configure Plans**: Navigate to `/admin/plans`, open the Plan Tier Drawer, verify all 28 modules are selectable, adjust quotas (Users, Products, Branches, Invoices), and save.
4. **Provision a New Tenant Store**:
   - Go to `/admin/tenants` -> Click **"Provision Store"**.
   - Enter Store Name, Owner Name, Email, Password, and select the SaaS Plan Tier.
   - Click **"Provision Store Now"**.
5. **Verify Granular Module Overrides**:
   - Click **"Manage"** on the newly created tenant store.
   - Switch to the **"Module Grants"** tab, toggle custom modules, and click **"Save Module Grants"**.

---

### Flow B: Store Setup & Master Data (Store Admin)
1. **Login as Store Owner**: Navigate to `http://localhost:3000/login` and log in with store credentials.
2. **Setup Store Profile**:
   - Navigate to `/settings` -> Store Profile.
   - Set Store Name, Currency Symbol (`₹`, `$`, `€`, `£`, `AED`, `SAR`), Tax Rules (GST/VAT), and Invoice Header/Footer notes.
3. **Create Catalog Master Data**:
   - Navigate to `/categories` -> Add categories (e.g. `Apparel`, `Electronics`, `Groceries`).
   - Navigate to `/brands` -> Add brand records.
   - Navigate to `/products` -> Create product with barcode, SKU, cost price, selling price, and initial stock quantity.

---

### Flow C: POS Billing & Multi-Tender Checkout (Cashier)
1. **Open POS Terminal**: Navigate to `/pos`.
2. **Open Cash Shift**: Enter starting opening cash float (e.g. `₹1,000`).
3. **Cart Assembly**:
   - Scan or search for products.
   - Adjust quantities, apply item discounts or bill-level coupons.
   - Attach or create customer profile to accumulate loyalty points.
4. **Tender Payment**:
   - Select payment tender: **Cash**, **Card**, **UPI QR Code**, or **Split Tender**.
   - Complete checkout and verify printable thermal receipt generation (80mm/58mm).
5. **Hold & Resume Carts**:
   - Add items -> Click **"Hold Cart"** -> Note cart name.
   - Ring up another transaction -> Click **"Resume Cart"** to restore.

---

### Flow D: Sales Return & Inventory Reconciliation
1. **Process Return**: Navigate to `/sales` -> Locate invoice -> Click **"Return / Refund"**.
2. **Restock**: Verify returned units are credited back to active inventory in `/inventory`.
3. **Khata Ledger**: Verify customer store credit or cash refund is logged in `/customers`.

---

### Flow E: Double-Entry Financials & End of Day Shift
1. **Register Shift Close**: Go to `/pos` -> Click **"Close Shift"** -> Enter actual counted cash -> Confirm drawer reconciliation.
2. **Review Financial Statements**:
   - Navigate to `/accounting-reports`.
   - Inspect Profit & Loss Statement (Revenue - COGS - Expenses = Net Profit).
   - Inspect Balance Sheet & Trial Balance.

---

## 4. Verification Commands

```bash
# Verify TypeScript types across all server functions and routes
npx tsc --noEmit

# Verify Cloudflare Nitro + Vite production SSR bundle
npm run build
```
