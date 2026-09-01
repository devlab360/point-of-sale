---
name: onedesk360-design-system
description: >-
  Design system guidelines, UI tokens, color palettes, typography, drawer architectures,
  and aesthetic standards for OneDesk360 Cloud POS & Admin Interfaces.
---

# OneDesk360 Design System & UI Architecture

This skill defines the UI aesthetics, component patterns, layout rules, and interaction models required to maintain a cohesive, ultra-premium visual experience across all Store Admin and Super Admin surfaces in **OneDesk360**.

---

## 1. Brand Palette & Color Tokens

OneDesk360 utilizes a curated luxury retail color system blending rich neutral darks/lights with signature gold/bronze brand accents:

| Token Name              | Value / Tailwind Class                   | Semantic Purpose                                                        |
| :---------------------- | :--------------------------------------- | :---------------------------------------------------------------------- |
| **Brand Gold Accent**   | `#B58D4C` / `text-[#B58D4C]`             | Primary brand identity, active sidebar items, emblem badges, highlights |
| **Brand Gold Glow**     | `#B58D4C]/15` / `border-[#B58D4C]/30`    | Avatar initials containers, highlight backgrounds, subtle focus rings   |
| **Background (Light)**  | `bg-background` (`hsl(0 0% 100%)`)       | Main canvas background                                                  |
| **Background (Dark)**   | `dark:bg-background` (`hsl(224 71% 4%)`) | Sleek obsidian night canvas                                             |
| **Card / Surface**      | `bg-card` / `backdrop-blur-xl`           | Floating cards, header bars, and sidebars                               |
| **Muted Canvas**        | `bg-muted/20` / `bg-muted/30`            | Content wrappers, table headers, alternating rows                       |
| **Success / Active**    | `text-emerald-600 dark:text-emerald-400` | Active status badges, positive cash flow, paid invoices                 |
| **Destructive / Alert** | `text-destructive` / `bg-destructive/10` | Error banners, overdue payments, store suspension                       |

---

## 2. Layout Structure & Navigation Consistency

### 2.1 Sidebar Architecture (`AppSidebar` & `SuperAdminLayout`)

- **Dimensions**: Expanded `w-64` (`16rem`), Minimized `w-[4.75rem]`.
- **Brand Header**: Fixed `h-20` height with a black & gold emblem (`relative grid size-11 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 font-serif font-black text-sm`).
- **Floating Minimize Toggle**:
  ```tsx
  <button
    onClick={toggleMinimize}
    className="absolute -right-3.5 top-6 z-50 hidden lg:flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95"
  >
    <ChevronLeft className="size-4" strokeWidth={2.5} />
  </button>
  ```
- **Category Headers**: `px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground/80`.
- **Navigation Links**:
  - **Active State**: `bg-[#B58D4C] text-white font-semibold shadow-xs`.
  - **Inactive State**: `text-foreground/80 hover:bg-muted/40 hover:text-foreground`.
  - **Icons**: `size-5 shrink-0 stroke-[1.6]`.

### 2.2 Top Header Bar

- **Height**: `h-14 md:h-16 shrink-0`.
- **Backdrop**: `backdrop-blur-xl bg-background/80 border-b border-border`.
- **Breadcrumb Navigation**: `<ol className="flex items-center gap-1.5 text-sm">...` with font-medium and `/` dividers.
- **User Avatar Dropdown**: Contains only relevant account options (Identity label, Profile Drawer trigger, Theme Toggle, Logout).

---

## 3. Slide-Out Drawer Standard (`Sheet`)

All modal interactions, store management, plan editors, and forms MUST use the right-sliding Drawer pattern:

```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent
    side="right"
    className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
  >
    {/* 1. Fixed Header */}
    <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
      <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
        <Icon className="size-5 text-[#B58D4C]" />
        <span>Drawer Title</span>
      </SheetTitle>
      <SheetDescription className="text-xs text-muted-foreground mt-0.5">
        Clear description of actions performed in this drawer.
      </SheetDescription>
    </SheetHeader>

    {/* 2. Isolated Scrollable Body */}
    <div className="flex-1 overflow-y-auto p-5 space-y-4">{/* Form Fields & Sections */}</div>

    {/* 3. Sticky Bottom Actions Footer */}
    <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
      <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### Drawer Sizing Rules:

- **Complex Forms** (Tenant Store Management, Plan Quotas, Ticket Triage, Invoices): `sm:max-w-2xl md:max-w-3xl lg:max-w-4xl`.
- **Standard Forms** (Profile & Password, Add User, Add FAQ, Payment QR): `sm:max-w-xl md:max-w-2xl lg:max-w-3xl`.

---

## 4. StatCards & KPI Strip Pattern

Every analytics overview and index page begins with a responsive 4-column or 3-column StatCard strip:

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  <div className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="text-xs font-semibold">Total Revenue</span>
      <DollarSign className="size-4 text-[#B58D4C]" />
    </div>
    <div className="text-xl sm:text-2xl font-black text-foreground">₹1,48,900</div>
    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
      <ArrowUpRight className="size-3" /> +12.4% vs last month
    </p>
  </div>
</div>
```

---

## 5. Responsive Tables & Data Containers

- **Table Wrapper**: Always wrap in `rounded-2xl border bg-card shadow-xs overflow-hidden`.
- **Horizontal Scroll**: Always wrap table element in `<div className="overflow-x-auto">` to prevent mobile layout clipping.
- **Search & Filters**: Top toolbar contains instant search box, category dropdown filters, and 1-click **Export CSV** button.
