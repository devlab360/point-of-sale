const fs = require("fs");
const path = require("path");

const apiDir = path.join(__dirname, "src", "api");
const files = fs.readdirSync(apiDir).filter((f) => f.endsWith(".ts"));

for (const file of files) {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Fix generic update validators from fix_apis.cjs:
  // export const updateCategoryFn = createServerFn({ method: "POST" })
  //   .validator(z.object({ id: z.string(), category: updateSchema }))
  // to use `updates` instead of the entity name.

  // Extract entity names first:
  let entityPluralKebab = file.replace(".ts", "");
  let entityPlural = entityPluralKebab.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  let entitySingular = entityPlural;
  if (entitySingular.endsWith("ies")) entitySingular = entitySingular.slice(0, -3) + "y";
  else if (entitySingular.endsWith("ses")) entitySingular = entitySingular.slice(0, -2);
  else if (entitySingular.endsWith("s")) entitySingular = entitySingular.slice(0, -1);

  // Replace validator key
  const validatorRegex = new RegExp(
    `\\.validator\\(z\\.object\\(\\{ id: z\\.string\\(\\), ${entitySingular}: updateSchema \\}\\)\\)`,
    "g",
  );
  content = content.replace(
    validatorRegex,
    `.validator(z.object({ id: z.string(), updates: updateSchema.passthrough() }).passthrough())`,
  );

  // Replace handler data usage
  const handlerRegex = new RegExp(`\\.set\\(data\\.${entitySingular}\\)`, "g");
  content = content.replace(handlerRegex, `.set(data.updates)`);

  // Fix create validator to be passthrough
  const createValidatorRegex = new RegExp(
    `\\.validator\\(z\\.object\\(\\{ ${entitySingular}: insertSchema \\}\\)\\)`,
    "g",
  );
  content = content.replace(
    createValidatorRegex,
    `.validator(z.object({ ${entitySingular}: insertSchema.passthrough() }).passthrough())`,
  );

  // Specific manual file fixes:
  if (file === "customers.ts") {
    content = content.replace(
      "customer: CustomerSchema.partial()",
      "updates: CustomerSchema.partial().passthrough()",
    );
    content = content.replace("customer: CustomerSchema", "customer: CustomerSchema.passthrough()");
    content = content.replace(/\.set\(data\.customer\)/g, ".set(data.updates)");
    content = content
      .replace("z.object({\n  id: z.string(),", "z.object({\n  id: z.string(),")
      .replace(/z\.string\(\)\.optional\(\)/g, "z.string().or(z.number()).optional()")
      .replace(
        /z\.string\(\)\.nullable\(\)\.optional\(\)/g,
        "z.string().or(z.number()).nullable().optional()",
      );
  } else if (file === "products.ts") {
    content = content.replace(
      "product: ProductSchema.partial()",
      "updates: ProductSchema.partial().passthrough()",
    );
    content = content.replace("product: ProductSchema", "product: ProductSchema.passthrough()");
    content = content.replace(/\.set\(updateData\)/g, ".set(updateData)");
    content = content.replace(
      "const updateData: any = { ...data.product,",
      "const updateData: any = { ...data.updates,",
    );
  } else if (file === "users.ts") {
    content = content.replace(
      "user: UserSchema.partial()",
      "updates: UserSchema.partial().passthrough()",
    );
    content = content.replace("user: UserSchema", "user: UserSchema.passthrough()");
    content = content.replace(/\.set\(data\.user\)/g, ".set(data.updates)");
    content = content
      .replace(
        "invitation: z.object({",
        "token: z.string(), role: z.string(), permissions: z.array(z.string()).optional(), invitation: z.object({",
      )
      .replace(/token: z\.string\(\),\n      role: z\.string\(\),/g, ""); // Fix createInvitationFn shape roughly, or just rewrite it fully below
  } else if (file === "suppliers.ts") {
    content = content.replace(
      "updates: SupplierSchema.partial()",
      "updates: SupplierSchema.partial().passthrough()",
    );
    content = content.replace("supplier: SupplierSchema", "supplier: SupplierSchema.passthrough()");
  } else if (file === "sales.ts") {
    content = content.replace(
      "sale: SaleSchema.partial()",
      "updates: SaleSchema.partial().passthrough()",
    );
    content = content.replace("sale: SaleSchema", "sale: SaleSchema.passthrough()");
    content = content.replace("data.sale as any", "data.updates as any");
  } else if (file === "purchases.ts") {
    content = content.replace(
      "items: z.array(PurchaseItemSchema).optional()",
      "items: z.array(PurchaseItemSchema).optional(), lines: z.array(z.any()).optional()",
    );
    content = content.replace("purchase: PurchaseSchema", "purchase: PurchaseSchema.passthrough()");
    content = content.replace(
      "purchaseReturn: PurchaseReturnSchema",
      "purchaseReturn: PurchaseReturnSchema.passthrough()",
    );
    content = content.replace(
      "status: z.string()",
      "id: z.string(), updates: z.object({ status: z.string() }).passthrough()",
    );
    content = content.replace("data.status", "data.updates.status");
  } else if (file === "pos.ts") {
    content = content.replace("shift: updateSchema", "updates: updateSchema.passthrough()");
    content = content.replace(/\.set\(data\.shift\)/g, ".set(data.updates)");
  }

  fs.writeFileSync(filePath, content, "utf8");
}
console.log("Fixed types in APIs");
