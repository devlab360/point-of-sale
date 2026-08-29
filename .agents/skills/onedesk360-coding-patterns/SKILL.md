---
name: onedesk360-coding-patterns
description: >-
  Coding patterns, architectural rules, TanStack Start server functions, Drizzle ORM multi-tenant
  queries, React Query caching, and offline-first Dexie.js synchronization for OneDesk360.
---

# OneDesk360 Coding Patterns & Architectural Guidelines

This skill documents the mandatory code patterns, backend practices, state management rules, and file structures enforced across the **OneDesk360** codebase.

---

## 1. TanStack Start Server Functions (`createServerFn`)

All backend APIs, mutations, and database calls must be implemented using TanStack Start's `createServerFn` with Zod input validators.

### 1.1 Standard Server Function Pattern:
```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminService } from "@/services/admin.service";
import { requireSuperAdminSession } from "@/lib/auth-middleware";
import { formatErrorResponse } from "@/lib/error-formatter";

export const updatePlanQuotaFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      planId: z.string().min(1),
      maxUsers: z.number().int().positive(),
      maxProducts: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      // 1. Enforce Authentication & Role
      await requireSuperAdminSession();

      // 2. Delegate to Business Service
      const result = await adminService.updatePlanQuotas(data);

      // 3. Return Standardized Success Object
      return { success: true as const, ...result };
    } catch (e) {
      // 4. Format Standardized Error Response
      return formatErrorResponse(e);
    }
  });
```

### Server Function Rules:
- **Never bypass validator**: Every endpoint accepting data must declare `.validator(schema)`.
- **Always catch errors**: Handler must wrap business logic in `try ... catch` and return `formatErrorResponse(e)`.
- **Tenant Middleware**: Use `requireAuthSession()` for Store Admin APIs and `requireSuperAdminSession()` for Super Admin APIs.

---

## 2. Multi-Tenant Database Queries (Drizzle ORM)

### 2.1 Mandatory `orgId` Scoping
In any multi-tenant store service, **EVERY query must scope by `orgId`**:

```typescript
// ✅ CORRECT: Scoped to tenant organization
export async function getStoreProducts(orgId: string, search?: string) {
  const conditions = [eq(schema.products.orgId, orgId)];

  if (search) {
    conditions.push(ilike(schema.products.name, `%${search}%`));
  }

  return await db
    .select()
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(desc(schema.products.createdAt));
}

// ❌ WRONG: Missing orgId condition (Security Vulnerability!)
export async function getAllProducts() {
  return await db.select().from(schema.products);
}
```

---

## 3. Client State & React Query v5 Patterns

### 3.1 Standard Query Hook:
```typescript
const { data, isLoading, refetch, isFetching } = useQuery({
  queryKey: ["saas-organizations", statusFilter, searchQuery],
  queryFn: () => getAllOrganizationsFn({ data: { status: statusFilter, search: searchQuery } }),
  staleTime: 60 * 1000, // 1 minute
});
```

### 3.2 Standard Mutation Hook with Invalidation:
```typescript
const queryClient = useQueryClient();

const saveTenantMutation = useMutation({
  mutationFn: (payload: TenantPayload) => updateTenantFn({ data: payload }),
  onSuccess: (res) => {
    if (res.success) {
      toast.success("Store details updated successfully");
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    } else {
      toast.error(res.error || "Failed to update store");
    }
  },
  onError: (err: any) => {
    toast.error(err.message || "An unexpected error occurred");
  },
});
```

---

## 4. TanStack Router Code-Splitting Rules

To prevent code-splitting warnings and optimize bundle size:

- **Route Files (`src/routes/**/*.tsx`)**:
  - Must ONLY export `export const Route = createFileRoute(...)`.
  - Do NOT use `export default function PageComponent()`.
  - Component declarations inside route files should be local functions: `function SuperAdminPlansPage() { ... }` passed to `component: SuperAdminPlansPage`.

```typescript
// ✅ CORRECT:
export const Route = createFileRoute("/admin/plans")({
  component: SuperAdminPlansPage,
});

function SuperAdminPlansPage() {
  return <SuperAdminLayout>...</SuperAdminLayout>;
}

// ❌ WRONG:
export default function SuperAdminPlansPage() { ... }
```

---

## 5. Offline-First Synchronization (Dexie.js)

### 5.1 Local Cache Write:
When ringing up POS sales offline:
```typescript
// 1. Write to local IndexedDB
await localDb.sales.add(saleRecord);

// 2. Queue for background synchronization
await localDb.syncQueue.add({
  id: uuidv4(),
  endpoint: "createSaleFn",
  payload: saleRecord,
  createdAt: new Date().toISOString(),
  synced: false,
});
```

### 5.2 Flush Queue on Reconnect:
```typescript
window.addEventListener("online", async () => {
  const pending = await localDb.syncQueue.where("synced").equals(0).toArray();
  for (const item of pending) {
    try {
      await createSaleFn({ data: item.payload });
      await localDb.syncQueue.update(item.id, { synced: true });
    } catch (e) {
      console.error("Sync failed for item", item.id, e);
    }
  }
});
```
