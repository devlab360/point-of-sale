# Universal Multi-Business SaaS POS
## Production-Level Architecture, Business Capability & Incremental Implementation Plan

**Document Type:** Product + Architecture Specification  
**Goal:** Transform the existing POS into an extensible, multi-tenant SaaS POS platform capable of supporting many different business categories through reusable core capabilities, modular features, business templates and configurable workflows.

---

# 1. Executive Summary

The application should **not** be designed as a collection of separate POS systems for Restaurant, Salon, Retail, Repair Center, etc.

Instead, the target architecture is:

```text
Universal SaaS POS Core
        +
Reusable Business Capabilities
        +
Optional Modules
        +
Business Templates
        +
Feature Configuration
        +
Role & Permission System
        +
Configurable Workflows
```

The objective is not merely to support a fixed list of business types.

The system must be designed so that **new and currently unknown business categories can be added later without rewriting the core application**.

For example, the platform should be able to support:

- Retail
- Grocery
- Restaurant
- Café
- Bakery
- Salon
- Beauty Parlour
- Barber / Haircut Shop
- Service Center
- Repair Center
- Mobile Repair
- Electronics Repair
- Computer Repair
- Auto / Bike Service
- Wholesale
- Pharmacy
- Clothing
- Furniture
- Hardware
- Book Store
- Stationery
- Laundry / Dry Cleaning
- Printing
- Tailoring
- Gym / Fitness
- Photography Studio
- Pet Shop
- Cleaning Service
- Home Service
- Florist
- Coaching / appointment-oriented businesses
- And many other businesses

The architecture must remain extensible beyond this list.

---

# 2. Core Principle

## Do not build this:

```text
Restaurant POS
Salon POS
Retail POS
Repair POS
Wholesale POS
```

as completely separate systems.

## Build this:

```text
                    UNIVERSAL SAAS POS
                           |
             +-------------+-------------+
             |                           |
        CORE PLATFORM              BUSINESS ENGINE
             |                           |
      Authentication               Business Type
      Organization                 Capabilities
      Users                        Modules
      Roles                        Features
      Permissions                  Workflows
      POS                          Terminology
      Customers                    Defaults
      Payments
      Invoices
      Expenses
      Reports
      Notifications
```

A business type should be primarily a **configuration/template over reusable capabilities**, not a completely separate application.

---

# 3. Universal Business Architecture

The target conceptual hierarchy is:

```text
SaaS Platform
    ↓
Organization / Tenant
    ↓
Business
    ↓
Business Type
    ↓
Capabilities
    ↓
Modules
    ↓
Features
    ↓
Roles
    ↓
Permissions
    ↓
Users / Employees
```

A more complete runtime flow:

```text
Registration
    ↓
Business Type Selection
    ↓
Business Template
    ↓
Enabled Capabilities
    ↓
Enabled Modules
    ↓
Default Roles & Permissions
    ↓
Dynamic Navigation
    ↓
Business-specific Workflow
```

---

# 4. Business Type vs Capability

This distinction is extremely important.

A simple architecture might say:

```text
business_type = restaurant
```

That is useful but not enough.

A better architecture is:

```text
Business Type
    ↓
Capabilities
```

For example:

```text
Restaurant
├── PRODUCTS
├── INVENTORY
├── CUSTOMERS
├── TABLES
├── KITCHEN
├── KOT
├── MENU
├── PAYMENTS
└── REPORTS
```

Salon:

```text
Salon
├── SERVICES
├── CUSTOMERS
├── APPOINTMENTS
├── STAFF
├── COMMISSIONS
├── PAYMENTS
├── POS
└── REPORTS
```

Repair Center:

```text
Repair Center
├── PRODUCTS
├── SERVICES
├── JOB_CARDS
├── TECHNICIANS
├── PARTS
├── REPAIR_STATUS
├── CUSTOMERS
├── PAYMENTS
└── REPORTS
```

This allows completely new business types to reuse existing capabilities.

---

# 5. Universal Core Features

These should be considered for the global platform core after auditing the existing system.

## Identity & Organization

- Authentication
- Email verification
- Organization / tenant
- Business profile
- User management
- Employee management
- Roles
- Permissions
- Audit logs
- Activity history

## Sales & Billing

- POS
- Cart
- Invoice
- Payments
- Multiple payment methods
- Discounts
- Returns / refunds
- Tax
- Invoice numbering
- Receipt printing
- Customer billing

## Customer

- Customer profile
- Customer history
- Customer transactions
- Customer balance
- Loyalty support
- Customer notes

## Finance / Operations

- Expenses
- Basic revenue reports
- Payment reports
- Sales reports
- Profit reports where applicable
- Notifications

## SaaS

- Subscription
- Plans
- Trial
- Organization settings
- Feature access
- Usage limits where required

Not every business must expose every global capability in the UI.

---

# 6. Reusable Business Capabilities

The system should maintain a reusable capability catalog.

Example:

```text
PRODUCTS
SERVICES
INVENTORY
PURCHASE
SUPPLIERS
BARCODE
SERIAL_NUMBER
BATCH_EXPIRY
VARIANTS
TABLES
KITCHEN
KOT
MENU
APPOINTMENTS
STAFF
COMMISSIONS
JOB_CARDS
TECHNICIANS
REPAIR_STATUS
WARRANTY
LOYALTY
WHOLESALE
CREDIT_SALES
CUSTOMER_LEDGER
DELIVERY
ADVANCE_PAYMENT
CUSTOM_ORDER
MEMBERSHIP
PACKAGES
```

The exact capability list must be finalized after auditing the existing project.

---

# 7. Product + Service Model

The platform must support both:

```text
PRODUCT
```

and:

```text
SERVICE
```

and also hybrid businesses.

Examples:

## Product-based

- Grocery
- Retail
- Clothing
- Electronics

## Service-based

- Salon
- Barber
- Cleaning
- Photography

## Hybrid

- Restaurant
- Mobile Repair
- Electronics Repair
- Auto Service
- Furniture with delivery/service

The POS should support:

```text
Product only
Service only
Product + Service
```

Example:

```text
Mobile Repair Invoice

Screen Replacement Service     ₹1,500
Display Unit                    ₹4,500
Labour                           ₹500
---------------------------------------
Total                           ₹6,500
```

The exact data model must be determined from the current database before implementation.

---

# 8. Business Categories

The platform should be architected to support many categories.

## Retail & Commerce

- Grocery
- Super Shop
- Clothing
- Footwear
- Electronics
- Mobile Shop
- Computer Shop
- Furniture
- Hardware
- Book Store
- Stationery
- Gift Shop
- Pet Shop
- Pharmacy
- Jewellery
- Florist
- Bakery

## Food

- Restaurant
- Café
- Fast Food
- Bakery
- Food Court
- Takeaway
- Cloud Kitchen

## Beauty & Personal Care

- Salon
- Beauty Parlour
- Barber
- Spa
- Nail Studio
- Makeup Studio

## Repair & Technical

- Mobile Repair
- Computer Repair
- Electronics Repair
- Appliance Repair
- Service Center
- Auto Service
- Bike Service
- Car Service

## Service Businesses

- Laundry
- Dry Cleaning
- Cleaning Service
- Photography Studio
- Printing
- Tailoring
- Home Service
- Design/Creative Service

## Wholesale

- Grocery Wholesale
- Clothing Wholesale
- Electronics Wholesale
- General Wholesale

## Fitness / Membership

- Gym
- Fitness Center
- Yoga Studio
- Training Center

This list is not a hard limit.

The architecture must support new categories later.

---

# 9. Example Business Templates

## 9.1 Retail

```text
Business Type: RETAIL

Core:
- POS
- Customers
- Payments
- Expenses
- Reports

Modules:
- Products
- Inventory
- Barcode
- Purchase
- Suppliers
- Variants
```

## 9.2 Grocery

```text
Business Type: GROCERY

Core:
- POS
- Customers
- Payments
- Expenses
- Reports

Modules:
- Products
- Inventory
- Barcode
- Purchase
- Suppliers
- Units
- Stock Alerts
```

## 9.3 Restaurant

```text
Business Type: RESTAURANT

Core:
- POS
- Customers
- Payments
- Expenses
- Reports

Modules:
- Menu
- Tables
- KOT
- Kitchen
- Modifiers
- Inventory
- Recipes
- Staff
```

## 9.4 Café

```text
Business Type: CAFE

Modules:
- Menu
- Tables
- KOT
- Kitchen
- Takeaway
- Modifiers
- Customers
- Inventory
```

## 9.5 Salon

```text
Business Type: SALON

Modules:
- Services
- Staff
- Appointments
- Commissions
- Packages
- Membership
- Customers
- POS
```

## 9.6 Barber / Haircut

```text
Business Type: BARBER

Modules:
- Services
- Barbers
- Appointments
- Walk-in
- Commissions
- Customers
- POS
```

## 9.7 Repair Center

```text
Business Type: REPAIR_CENTER

Modules:
- Job Cards
- Repairs
- Technicians
- Parts
- Services
- Repair Status
- Warranty
- Customers
- Inventory
- POS
```

## 9.8 Mobile Repair

```text
Business Type: MOBILE_REPAIR

Modules:
- Job Cards
- Device Information
- IMEI / Serial
- Diagnosis
- Technicians
- Parts
- Labour
- Warranty
- Repair Status
- Customers
- POS
```

## 9.9 Wholesale

```text
Business Type: WHOLESALE

Modules:
- Bulk Pricing
- Customer-specific Pricing
- Credit Sales
- Customer Ledger
- Credit Limit
- Sales Representative
- Inventory
- Purchase
- Suppliers
- POS
```

---

# 10. Feature Matrix

A full matrix must be generated during the actual project audit.

Example:

| Feature | Retail | Grocery | Restaurant | Café | Salon | Repair | Wholesale |
|---|---|---|---|---|---|---|---|
| POS | YES | YES | YES | YES | YES | YES | YES |
| Customers | YES | YES | YES | YES | YES | YES | YES |
| Payments | YES | YES | YES | YES | YES | YES | YES |
| Products | YES | YES | YES/OPTIONAL | YES/OPTIONAL | OPTIONAL | YES | YES |
| Services | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | YES | YES | OPTIONAL |
| Inventory | YES | YES | YES | YES | OPTIONAL | YES | YES |
| Barcode | YES | YES | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | YES |
| Tables | NO | NO | YES | YES | NO | NO | NO |
| KOT | NO | NO | YES | YES | NO | NO | NO |
| Kitchen | NO | NO | YES | YES | NO | NO | NO |
| Appointments | NO | NO | OPTIONAL | OPTIONAL | YES | OPTIONAL | NO |
| Staff Commission | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | YES | YES | OPTIONAL |
| Job Cards | NO | NO | NO | NO | NO | YES | NO |
| Technician | NO | NO | NO | NO | NO | YES | NO |
| Credit Sales | OPTIONAL | YES | OPTIONAL | OPTIONAL | YES | YES | YES |

This is only a starting example. The final matrix must be based on the codebase and domain analysis.

---

# 11. Registration & Onboarding

The registration flow should eventually become business-aware.

Recommended flow:

```text
Create Account
    ↓
Verify Email
    ↓
Select Business Type
    ↓
Business Details
    ↓
Business Template Applied
    ↓
Review Enabled Modules
    ↓
Configure Tax / Currency / Invoice
    ↓
Create First Employee
    ↓
Add Products / Services
    ↓
Configure POS
    ↓
Finish Setup
    ↓
Dashboard
```

The user should not be forced to configure irrelevant features.

---

# 12. Business Type Selection

Example:

```text
What type of business do you operate?

[ Retail ]
[ Grocery ]
[ Restaurant ]
[ Café ]
[ Salon ]
[ Barber ]
[ Repair Center ]
[ Service Center ]
[ Wholesale ]
[ Pharmacy ]
[ Other ]
```

If `Other` is selected, the system should still provide a generic POS setup using common capabilities.

This prevents the platform from becoming unusable for businesses that were not anticipated.

---

# 13. Dynamic Menu Architecture

Navigation should be generated from:

```text
Business Capabilities
+
Enabled Modules
+
User Permissions
```

Example Restaurant:

```text
Dashboard
POS
Orders
Tables
Kitchen
Menu
Customers
Inventory
Expenses
Reports
Employees
Settings
```

Salon:

```text
Dashboard
POS
Appointments
Services
Customers
Employees
Commissions
Expenses
Reports
Settings
```

Repair Center:

```text
Dashboard
POS
Job Cards
Repairs
Customers
Technicians
Inventory
Expenses
Reports
Settings
```

A disabled module must not appear.

A user without permission must not see the protected menu.

But frontend hiding is not a security mechanism.

---

# 14. Permission Architecture

Current permissions:

## Sales & Checkout

- `pos`
- `discounts`
- `returns`

## Store Operations

- `inventory`
- `customers`
- `expenses`

## Management

- `reports`
- `settings`
- `notifications`

Current defaults:

### Admin

All permissions.

### Manager

All except settings.

### Cashier

- POS
- Customers
- Discounts

This is a good starting point but may be too coarse for a universal platform.

The target permission hierarchy should be evaluated as:

```text
Module
    ↓
Feature
    ↓
Action
    ↓
Permission
    ↓
Role
    ↓
User
```

Example:

```text
Inventory
├── View
├── Create Product
├── Edit Product
├── Delete Product
├── Stock Adjustment
└── Stock Transfer
```

Another:

```text
Appointments
├── View
├── Create
├── Edit
├── Cancel
└── Assign Staff
```

Another:

```text
Job Cards
├── View
├── Create
├── Edit
├── Assign Technician
├── Change Status
└── Close Job
```

Do not over-engineer permissions until the current system has been audited.

---

# 15. Business-Specific Roles

Do not create every possible role for every business.

Use role templates.

## Restaurant

```text
Admin
Manager
Cashier
Waiter
Kitchen Staff
```

## Salon

```text
Admin
Manager
Receptionist
Stylist
```

## Repair Center

```text
Admin
Manager
Cashier
Technician
```

## Retail

```text
Admin
Manager
Cashier
Salesperson
Inventory Manager
```

The Admin must be able to customize permissions.

---

# 16. Backend Security

Feature flags and menu visibility must never be the only security layer.

Every protected API should validate:

```text
Tenant
+
Business
+
Feature Enabled
+
User
+
Role
+
Permission
```

Example:

```text
POST /api/job-cards
```

must verify:

```text
User belongs to tenant
AND
Repair capability is enabled
AND
User has job-card permission
```

Likewise:

```text
POST /api/tables
```

must verify:

```text
User belongs to tenant
AND
Table capability is enabled
AND
User has table permission
```

This is essential for multi-tenant security.

---

# 17. Database Architecture Audit

Every existing database table must be classified.

For each model determine:

```text
Global or tenant-specific?
Business-specific or reusable?
Required or optional?
Supports future business types?
Supports product/service?
Proper foreign keys?
Proper indexes?
Unique constraints?
Tenant isolation?
Soft delete?
Audit fields?
Migration safety?
```

Do not destroy existing production data.

Avoid destructive migrations.

---

# 18. API Architecture

Avoid creating a completely separate application API for every business unless there is a real domain reason.

Prefer reusable domain APIs where appropriate:

```text
/api/products
/api/services
/api/customers
/api/orders
/api/invoices
/api/payments
/api/inventory
/api/employees
/api/appointments
/api/job-cards
/api/tables
/api/reports
```

Capability checks determine whether an operation is available.

---

# 19. Modular Monolith Strategy

For the current stage, a **modular monolith** is likely preferable to prematurely creating microservices.

Conceptually:

```text
Core
├── Auth
├── Tenant
├── Users
├── Roles
├── Permissions
├── Customers
├── POS
├── Payments
├── Invoices
├── Expenses
└── Reports

Optional Modules
├── Inventory
├── Services
├── Appointments
├── Tables
├── Kitchen
├── Repairs
├── Job Cards
├── Loyalty
├── Wholesale
├── Purchase
├── Suppliers
└── Commissions
```

The actual module boundaries must be determined from the existing codebase.

---

# 20. Terminology Configuration

Different businesses may use different labels.

Restaurant:

```text
Product → Menu Item
Customer → Guest
Invoice → Bill
```

Salon:

```text
Employee → Stylist
```

Repair Center:

```text
Order → Job
Employee → Technician
```

Avoid duplicating entire screens just to change labels.

Use a terminology/configuration layer where appropriate.

---

# 21. Business-Specific Reports

## Global Reports

- Sales
- Revenue
- Expenses
- Payments
- Customers
- Returns
- Tax
- Profit

## Restaurant

- Table Sales
- Food Item Sales
- KOT
- Kitchen Performance
- Modifier Sales

## Salon

- Service Sales
- Staff Performance
- Commission
- Appointment Performance

## Repair

- Repair Status
- Technician Performance
- Parts Usage
- Labour Revenue
- Pending Repairs

## Wholesale

- Customer Outstanding
- Credit Sales
- Sales by Customer
- Sales Representative Performance

The report architecture must allow new business reports to be added without rewriting the global reporting system.

---

# 22. Business Configuration

The system needs a configurable business profile.

Potential configuration categories:

```text
business_type
business_category
enabled_capabilities
enabled_modules
terminology
currency
tax_mode
invoice_mode
inventory_mode
service_mode
appointment_mode
table_mode
kitchen_mode
repair_mode
loyalty_mode
commission_mode
credit_sales_mode
barcode_mode
serial_number_mode
batch_expiry_mode
delivery_mode
```

Do not blindly create a huge set of boolean columns.

Evaluate a normalized configuration/feature system based on the existing database.

---

# 23. Unknown Future Business Support

This is one of the most important requirements.

The architecture must NOT only support today's known business types.

It must support future businesses that have not yet been defined.

For example, if the platform later needs:

```text
Photography Studio
```

the system should be able to compose:

```text
POS
+
Customers
+
Services
+
Appointments
+
Staff
+
Payments
+
Expenses
+
Reports
```

If later:

```text
Laundry
```

is introduced:

```text
POS
+
Customers
+
Services
+
Order Tracking
+
Status Workflow
+
Pickup/Delivery
+
Payments
```

The core POS should remain unchanged.

---

# 24. New Business Addition Strategy

Adding a new business should ideally involve:

```text
New Business Type
        +
Capability Selection
        +
Module Configuration
        +
Default Roles
        +
Default Permissions
        +
Menu Configuration
        +
Terminology
        +
Workflow
        +
Reports
```

It should NOT require:

```text
Entire application rewrite
```

This is the definition of an extensible architecture.

---

# 25. Existing System Audit

Before implementation, inspect the complete current project.

Audit:

## Frontend

- Routes
- Components
- State
- Forms
- Validation
- Navigation
- Business-specific hardcoding
- Feature visibility
- Permission checks

## Backend

- API routes
- Services
- Controllers
- Middleware
- Authorization
- Validation
- Error handling

## Database

- Models
- Relations
- Indexes
- Constraints
- Tenant isolation
- Migrations

## Authentication

- Login
- Registration
- Session
- User identity
- Organization membership

## POS

- Product billing
- Service billing
- Mixed billing
- Discounts
- Returns
- Payment
- Invoice
- Tax

## Business Configuration

- Existing business types
- Existing feature flags
- Existing settings
- Existing menu logic

---

# 26. Current Business Audit

Find exactly which business types are already partially or fully supported.

For every existing feature document:

```text
Business
Feature
Current UI
Current API
Current Database
Permission
Dependencies
Reusable?
Hardcoded?
Needs Refactor?
```

Do not duplicate functionality that already exists.

---

# 27. Gap Analysis

Produce the following sections after auditing:

## A. Already Implemented

## B. Partially Implemented

## C. Missing

## D. Incorrectly Hardcoded

## E. Technical Debt

## F. Security Issues

## G. Database Issues

## H. API Issues

## I. UX Issues

## J. Scalability Issues

---

# 28. Priority System

## P0 — Critical

- Security
- Tenant isolation
- Data corruption
- Billing integrity
- Authentication failures

## P1 — Core Platform

- Business type
- Capability system
- Module system
- Permission architecture
- Configuration
- Dynamic navigation
- Onboarding

## P2 — Business Modules

- Restaurant
- Salon
- Repair
- Retail
- Wholesale
- Service Center
- etc.

## P3 — Enhancements

- Advanced analytics
- Automation
- Integrations
- Advanced loyalty
- Advanced CRM

## P4 — Future

- Nice-to-have features

---

# 29. Incremental Implementation Rule

Do NOT implement the entire architecture in one operation.

Use:

```text
Audit
  ↓
Plan
  ↓
Task 1
  ↓
Test
  ↓
Review
  ↓
Task 2
  ↓
Test
  ↓
Review
  ↓
Task 3
```

One module at a time.

---

# 30. First Task

The first task must be:

**Deep Current Architecture & Feature Gap Audit**

Do NOT modify code during this step.

The audit must produce:

1. Current architecture
2. Existing business types
3. Existing features
4. Existing business-specific features
5. Global features
6. Missing features
7. Hardcoded business logic
8. Permission audit
9. Database audit
10. API audit
11. Product + Service audit
12. Business configuration audit
13. Registration/onboarding audit
14. Dynamic menu audit
15. Security audit
16. Business capability matrix
17. Recommended architecture
18. Migration risks
19. Prioritized roadmap
20. First recommended implementation task

After producing the audit, STOP and wait for approval.

---

# 31. Implementation Task Protocol

Before each implementation task, provide:

```text
TASK
WHY
CURRENT IMPLEMENTATION
PROPOSED IMPLEMENTATION
FILES AFFECTED
DATABASE CHANGES
API CHANGES
FRONTEND CHANGES
SECURITY IMPACT
MIGRATION IMPACT
BACKWARD COMPATIBILITY
TEST CASES
ROLLBACK PLAN
```

Then implement only that task.

After implementation:

```text
COMPLETED
CHANGED FILES
DATABASE CHANGES
API CHANGES
TEST RESULTS
KNOWN ISSUES
NEXT RECOMMENDED TASK
```

---

# 32. Data Safety

The existing system may contain important data.

Never:

- Drop production tables
- Delete existing records
- Rewrite the entire database without migration
- Remove working permissions
- Break existing APIs unnecessarily
- Remove existing features
- Rename critical fields without a migration plan
- Replace working components without a measurable reason

Use backward-compatible migrations whenever possible.

---

# 33. Final Target Architecture

The conceptual final architecture:

```text
                         UNIVERSAL SAAS POS
                                |
                +---------------+---------------+
                |                               |
          CORE PLATFORM                   BUSINESS ENGINE
                |                               |
       Authentication                    Business Type
       Organization                      Capabilities
       Users                             Modules
       Roles                             Features
       Permissions                       Workflows
       POS                               Terminology
       Customers                         Defaults
       Payments
       Invoices
       Expenses
       Reports
       Notifications
                |
                +-------------------------------+
                                |
                       REUSABLE MODULES
                                |
       +------------+-----------+-----------+------------+
       |            |           |           |            |
     Retail     Restaurant    Salon      Repair       Service
       |            |           |           |            |
    Inventory     Tables      Services    Job Cards    Job
    Barcode       KOT         Staff       Technician   Status
    Purchase      Kitchen     Booking     Parts        Assignment
    Supplier      Menu        Commission  Warranty     Delivery
```

---

# 34. Final Success Criteria

The implementation is successful only if:

- One SaaS platform supports many business types.
- Existing functionality continues to work.
- Business-specific features are modular.
- Common features remain reusable.
- New business types can be added without rewriting the core.
- Registration can select a business type.
- Business templates can enable relevant modules.
- Admin can enable/disable optional capabilities.
- Navigation is dynamic.
- Permissions are enforced on frontend and backend.
- Tenant isolation is maintained.
- Product and Service can coexist.
- Mixed product + service billing is supported where appropriate.
- Business-specific workflows are configurable/extensible.
- Reports can be business-aware.
- Existing data remains safe.
- Implementation happens incrementally.
- The architecture remains maintainable as the number of supported businesses grows.

---

# 35. Final Principle

The most important architectural rule is:

> **Do not build a POS that supports only a fixed list of businesses. Build a configurable business platform whose reusable capabilities can be composed to support existing and future businesses.**

In short:

```text
Universal Core
      +
Reusable Capabilities
      +
Modular Features
      +
Business Templates
      +
Configurable Workflows
      +
Granular Permissions
      =
Extensible Multi-Business SaaS POS
```

The goal is not:

```text
"Support 20 business types."
```

The goal is:

```text
"Build an architecture where adding the 21st,
50th, or 100th business type does not require
rewriting the core POS."
```

---

# 36. AI Coding Agent Instruction

When using this document with an AI coding agent:

**Do not start coding immediately.**

First inspect the entire existing project.

Then produce:

**Universal Multi-Business SaaS POS — Current Architecture & Feature Gap Audit**

Only after the audit is reviewed and approved should implementation begin.

Implementation must proceed:

```text
ONE MODULE
    ↓
TEST
    ↓
VERIFY
    ↓
APPROVE
    ↓
NEXT MODULE
```

Never perform a blind full-system rewrite.
