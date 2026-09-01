# OneDesk360 Cloud POS — Complete Test Application Flow

## Quality Assurance & User Acceptance Testing (UAT) Runbook

---

## 📌 Executive Test Flow Summary

This test runbook covers the end-to-end operational flows across the platform, verifying **Multi-Tenant SaaS Provisioning**, **Store Administration**, **POS Billing & Offline Resilience**, **Inventory Movements**, and **Double-Entry Accounting**.

```
[Super Admin Provisioning]
       │
       ▼
[Store Setup & Master Catalog]
       │
       ▼
[POS Shift Open & Barcode Billing]
       │
       ▼
[Multi-Tender Checkout (Cash/Card/UPI/Split)]
       │
       ▼
[Sales Returns, Restock & Khata Ledgers]
       │
       ▼
[Shift Close, Double-Entry P&L & Balance Sheet]
```

---

## Flow 1: Super Admin SaaS Management & Store Provisioning

### Objective

Validate that platform super administrators can configure SaaS plan tiers, inspect global analytics, and provision a new isolated merchant store tenant.

### Steps:

1. **Access Super Admin Login**:
   - URL: `http://localhost:3000/admin`
   - Email: `admin@superadmin.com`
   - Password: `superadmin_password`
   - _Expected Result_: Successful JWT authentication and redirect to `/admin/dashboard`.

2. **Validate Executive Dashboard (`/admin/dashboard`)**:
   - Check the 5 KPI counters: MRR (₹), Total Merchant Stores, Trial Registrations, Pending Approvals, and Support Inquiries.
   - Verify that the MRR Revenue Velocity chart and SaaS Plan Distribution donut chart render properly.

3. **Configure a SaaS Pricing Plan (`/admin/plans`)**:
   - Click **"Create New SaaS Plan"**.
   - Set Tier Name: `Pro Retail Growth`.
   - Set Monthly Price: `₹1,499`, Yearly Price: `₹14,990`.
   - Set Quotas: Max Users = `10`, Max Products = `5000`, Max Branches = `3`, Monthly Invoices = `10000`.
   - In **Bundled Features & Modules**, click **"Select All"** (verify all 28 modules across 6 categories are checked).
   - Click **"Save Plan Tier"**.
   - _Expected Result_: Plan appears in the pricing grid with active module tags.

4. **Provision a New Tenant Store (`/admin/tenants`)**:
   - Click **"Provision New Store"**.
   - Store Name: `Metro Supermarket & Cafe`.
   - Owner Name: `Vikram Sharma`.
   - Email: `metro@retailstore.com`.
   - Initial Password: `storepassword123`.
   - Select Plan: `Pro Retail Growth`.
   - Click **"Provision Store Now"**.
   - _Expected Result_: Store appears in the Tenant Directory with an `Active` badge and 14-day default trial period.

5. **Test Granular Module Grants**:
   - Click **"Manage"** on `Metro Supermarket & Cafe`.
   - Switch to the **"Module Grants"** tab.
   - Toggle specific modules (e.g. `Restaurant Tables`, `Kitchen KOT`, `Repair Job Sheets`).
   - Click **"Save Module Grants"**.
   - _Expected Result_: Success toast notification and persistent module flags.

---

## Flow 2: Store Owner Master Setup & Catalog Configuration

### Objective

Log in as the store owner, configure store currency and tax rules, and set up the product inventory catalog.

### Steps:

1. **Store Owner Login**:
   - URL: `http://localhost:3000/login`
   - Email: `demo@onedesk360.com` (or the newly provisioned email)
   - Password: `password123`
   - _Expected Result_: Store admin dashboard loads with store branding.

2. **Configure Store Profile & Currency (`/settings`)**:
   - Set Store Name, Phone, and Email.
   - Select Currency: `₹ (INR)` (or `$ USD`, `€ EUR`, `£ GBP`, `AED`).
   - Configure Tax Settings: GST/VAT percentage rules (e.g. 18% GST / 5% VAT).
   - Click **"Save Store Profile"**.

3. **Create Categories & Brands**:
   - Navigate to `/categories` -> Add `Beverages`, `Bakery`, `Electronics`.
   - Navigate to `/brands` -> Add brand records.

4. **Create Products with Barcodes & Stock (`/products`)**:
   - Click **"Add Product"**.
   - Name: `Premium Espresso Beans 500g`.
   - Barcode / SKU: `8901234567890`.
   - Purchase Cost: `₹350.00`.
   - Selling Price: `₹550.00`.
   - Initial Quantity on Hand: `50 units`.
   - Reorder Low Stock Level: `10 units`.
   - Click **"Save Product"**.
   - _Expected Result_: Product is created and searchable by barcode or name.

---

## Flow 3: POS Terminal Billing & Multi-Tender Checkout

### Objective

Execute real-time billing transactions, test barcode lookups, line item discounts, customer loyalty points, and thermal receipt generation.

### Steps:

1. **Launch POS Terminal (`/pos`)**:
   - If starting a new session, enter the opening cash drawer float (e.g., `₹2,000.00`).
   - Click **"Start Register Shift"**.

2. **Add Products to Cart**:
   - Type barcode `8901234567890` or click the product tile from the grid.
   - Increase item quantity to `2`.
   - Apply a 10% line discount or bill coupon.

3. **Attach Customer for Loyalty Points**:
   - In the customer search field, search for `Rahul Verma` (or click **"Add Customer"** to register a new profile).
   - Verify loyalty points calculation on the screen.

4. **Tender Payment**:
   - Click **"Pay / Checkout"**.
   - Test **Split Payment**:
     - Cash: `₹500.00`
     - Card / UPI QR: `₹490.00`
   - Click **"Complete Sale"**.
   - _Expected Result_:
     - Instant sale completion sound and success banner.
     - Printable ESC/POS thermal receipt preview (80mm / 58mm).
     - Cash drawer kick signal sent to receipt printer.
     - Stock reduced from `50 units` to `48 units`.

5. **Test Hold & Resume Cart**:
   - Add items to the cart.
   - Click **"Hold Cart"** -> Name it `Table 4 / Customer Waiting`.
   - Ring up another customer order.
   - Click **"Resume Cart"** -> Select `Table 4` to restore cart items.

---

## Flow 4: Sales Returns, Restocking & Customer Khata Ledger

### Objective

Validate returns processing, automated inventory restocking, and customer store credit ledgers.

### Steps:

1. **Process Sales Return (`/sales`)**:
   - Find the completed invoice -> Click **"Return / Refund"**.
   - Select 1 unit to return -> Reason: `Customer Changed Mind`.
   - Select Refund Method: **Store Credit / Khata Ledger**.
   - Click **"Confirm Refund"**.
   - _Expected Result_: Credit note generated, inventory restored to `49 units`, customer wallet credited.

2. **Verify Inventory Ledger (`/inventory`)**:
   - Check stock movement history in `/inventory` to verify return audit trail.

---

## Flow 5: Double-Entry Financials & End-of-Day Shift Close

### Objective

Reconcile cash drawer shifts and audit automated financial accounting statements.

### Steps:

1. **Close Cash Shift (`/pos`)**:
   - Click **"Close Shift"**.
   - View expected cash calculation (Opening Float + Cash Sales - Cash Refunds).
   - Enter physical counted cash in drawer.
   - Click **"Finalize Shift"**.
   - _Expected Result_: Shift summary report generated with any cash variance (over/short).

2. **Audit Financial Statements (`/accounting-reports` & `/reports`)**:
   - Navigate to `/accounting-reports`.
   - Open **Profit & Loss (P&L)**: Verify Revenue, COGS, Gross Profit, Expenses, and Net Profit.
   - Open **Balance Sheet**: Verify Total Assets (Cash + Inventory) = Total Liabilities + Owner's Equity.
   - Open **Trial Balance**: Verify Debits equal Credits.

---

## 🏁 Verification Matrix

| Flow Area          | Test Case                     | Success Criteria                                | Status |
| :----------------- | :---------------------------- | :---------------------------------------------- | :----: |
| **Super Admin**    | Plan Quotas & 28 Modules      | All modules configurable with drawer open/save  | Passed |
| **Super Admin**    | Tenant Store Provisioning     | New store created with credentials & plan       | Passed |
| **Store Admin**    | Profile & Currency Setup      | Dynamic currency formatting across POS          | Passed |
| **POS Billing**    | Multi-Tender & Split Checkout | Thermal receipt generated, stock auto-deducted  | Passed |
| **POS Resilience** | Offline IndexedDB Caching     | Continues billing during network disconnect     | Passed |
| **Inventory**      | Stock Adjustments & Returns   | Real-time restock upon return confirmation      | Passed |
| **Finance**        | Accounting & Double-Entry P&L | Real-time P&L, Balance Sheet, and Trial Balance | Passed |
