# OneDesk360 — Enterprise Cloud POS & Multi-Tenant SaaS Platform

**OneDesk360** is a full-stack, enterprise-grade, multi-tenant Cloud Point-of-Sale (POS) and Store Resource Planning (ERP) ecosystem built with **TanStack Start**, **React 19**, **Drizzle ORM**, **PostgreSQL**, and **Dexie.js** offline synchronization.

---

## 🔑 Default Access Credentials

| Portal / Role                 | URL                                     | Email Address                 | Password              | Industry Profile & Scope                      |
| :---------------------------- | :-------------------------------------- | :---------------------------- | :-------------------- | :-------------------------------------------- |
| 🛡️ **Super Admin Portal**     | [`/admin`](http://localhost:8080/admin) | `admin@superadmin.com`        | `superadmin_password` | Root multi-tenant governance & SaaS plans     |
| 🌐 **Universal Store**        | [`/login`](http://localhost:8080/login) | `universal@onedesk360.com`    | `password123`         | All 28 modules enabled (Hybrid / General)     |
| 🍽️ **Restaurant / Dining**    | [`/login`](http://localhost:8080/login) | `restaurant@onedesk360.com`   | `password123`         | Table floor plan, Kitchen KOT, Dining POS     |
| ☕ **Cafe & Quick Service**   | [`/login`](http://localhost:8080/login) | `cafe@onedesk360.com`         | `password123`         | Counter checkout, Takeaways, Kitchen KOT      |
| ✂️ **Salon & Spa**            | [`/login`](http://localhost:8080/login) | `salon@onedesk360.com`        | `password123`         | Appointments, Stylists, Commissions, Services |
| 💈 **Barber Shop**            | [`/login`](http://localhost:8080/login) | `barber@onedesk360.com`       | `password123`         | Barber queuing, Services, Commissions         |
| 🔧 **Electronics Repair**     | [`/login`](http://localhost:8080/login) | `repair@onedesk360.com`       | `password123`         | Job sheets, Diagnostic logs, Spare parts      |
| 📱 **Mobile Gadget Repair**   | [`/login`](http://localhost:8080/login) | `mobilerepair@onedesk360.com` | `password123`         | IMEI logging, Warranty tags, Job cards        |
| 🛒 **Retail & Apparel**       | [`/login`](http://localhost:8080/login) | `retail@onedesk360.com`       | `password123`         | Apparel, Variants (Size/Color), Barcodes      |
| 🥬 **Grocery & Supermarket**  | [`/login`](http://localhost:8080/login) | `grocery@onedesk360.com`      | `password123`         | Barcode scan, Batch & FEFO Expiry dates       |
| 📦 **Wholesale Distribution** | [`/login`](http://localhost:8080/login) | `wholesale@onedesk360.com`    | `password123`         | Quotations, Delivery Challans, Bulk Orders    |
| 💊 **Pharmacy & Health**      | [`/login`](http://localhost:8080/login) | `pharmacy@onedesk360.com`     | `password123`         | Drug batches, Expiry tracking, Prescriptions  |
| ⚡ **Demo Cashier**           | [`/login`](http://localhost:8080/login) | `cashier@onedesk360.com`      | `password123`         | POS terminal billing & shift register         |

---

## 🚀 Key Functional Capabilities (28 Configurable Modules)

- **Sales & POS Billing**: Fast barcode scanner checkout, multi-payment tender (Cash, Card, UPI QR, Split, Khata on account), held shopping carts, 80mm/58mm thermal ESC/POS printing, and cash drawer kick protocols.
- **Product Catalog & Inventory**: Single and variant matrix SKUs, batch & expiry date tracking, serial numbers, stock transfers, and stock adjustments.
- **Customer CRM & Loyalty Points**: Customer ledger (Khata), credit limits, tiered loyalty reward points (Bronze, Silver, Gold, Platinum), gift cards, and coupons.
- **Procurement & Vendors**: Purchase orders (PO), vendor directories, purchase returns, and debit notes.
- **Financials & Accounting**: Double-entry chart of accounts, expense tracking, daily register shifts, and automated reports (Profit & Loss, Balance Sheet, Trial Balance).
- **Specialized Industry Verticals**:
  - _Restaurant & Cafe_: Dining table layout management & Kitchen Order Tickets (KOT).
  - _Electronics & Repair_: Device IMEI tracking & repair job sheets.
  - _Equipment Rentals_: Item checkout & deposit security handling.
  - _Appointments_: Service booking & staff scheduling.
- **Universal Super Admin Hub**: Executive MRR/ARR velocity dashboard, dynamic SaaS tier configurator, manual bank transfer / UPI QR verification workflow, support ticket triage desk, and broadcast announcements.
- **Offline-First Resilience**: Local IndexedDB (Dexie.js) caching with automatic background synchronization when internet connectivity resumes.

---

## 🛠️ Technology Stack

- **Frontend & Full-Stack Engine**: React 19, TanStack Start (SSR & Server Functions), TanStack Router, Vite, TailwindCSS
- **State & Data Fetching**: TanStack Query (React Query v5)
- **Database & ORM**: PostgreSQL (`pos_db`), Drizzle ORM, Drizzle-Kit
- **Offline Storage**: Dexie.js (IndexedDB local client database)
- **Authentication**: JWT Cookie Sessions & Password Hashing (`bcryptjs` / `Argon2`)

---

## 🗄️ Database Commands

```bash
# 1. Generate Drizzle SQL migration files
npm run db:generate

# 2. Push schema changes directly to PostgreSQL
npm run db:push

# 3. Seed database with master pricing plans, admin accounts & demo store catalog
npm run db:seed
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Setup Database Schema & Seed Data
npm run db:push
npm run db:seed

# 3. Start Development Server
npm run dev
```

App runs live at: **`http://localhost:8080`** (or configured Vite port)

---

## 📚 Documentation & Engineering Runbooks

- 📖 **Comprehensive System Overview & Architecture**: [`docs/SYSTEM_OVERVIEW_AND_FUNCTIONALITY.md`](docs/SYSTEM_OVERVIEW_AND_FUNCTIONALITY.md)
- 🧪 **Complete UAT Test Application Flow**: [`docs/TEST_APPLICATION_FLOW.md`](docs/TEST_APPLICATION_FLOW.md)
- 🎨 **Design System & UI Tokens**: [`.agents/skills/onedesk360-design-system/SKILL.md`](.agents/skills/onedesk360-design-system/SKILL.md)
- 💻 **Coding Patterns & Architecture**: [`.agents/skills/onedesk360-coding-patterns/SKILL.md`](.agents/skills/onedesk360-coding-patterns/SKILL.md)
- ⚙️ **POS Engineering Playbook**: [`.agents/skills/onedesk360-pos/SKILL.md`](.agents/skills/onedesk360-pos/SKILL.md)

---

## 📜 License & Copyright

© 2026 **[DevLab360](https://devlab360.com/)**. All rights reserved.
