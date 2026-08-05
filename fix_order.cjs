const fs = require("fs");
const path = require("path");

const apiDir = path.join(__dirname, "src", "api");
const files = fs
  .readdirSync(apiDir)
  .filter(
    (f) =>
      f.endsWith(".ts") &&
      ![
        "auth.ts",
        "users.ts",
        "customers.ts",
        "purchases.ts",
        "sales.ts",
        "products.ts",
        "suppliers.ts",
      ].includes(f),
  );

for (const file of files) {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Extract the lines
  const insertRegex = /const insertSchema = .*?;\n/g;
  const updateRegex = /const updateSchema = .*?;\n/g;

  let insertLine = "";
  let updateLine = "";

  content = content.replace(insertRegex, (match) => {
    insertLine = match;
    return "";
  });

  content = content.replace(updateRegex, (match) => {
    updateLine = match;
    return "";
  });

  // Inject after schema import
  if (insertLine || updateLine) {
    const schemaImportRegex = /import \* as schema from "@\/db\/schema";\n/g;
    content = content.replace(
      schemaImportRegex,
      `import * as schema from "@/db/schema";\n\n${insertLine}${updateLine}`,
    );
  }

  // Also fix update and delete endpoints to check orgId if not already doing so
  // E.g. .where(eq(schema.categories.id, data.id)) -> .where(and(eq(schema.categories.id, data.id), eq(schema.categories.organizationId, orgId)))
  // Let's do a simple replace
  const simpleWhereRegex = /\.where\(eq\(schema\.([a-zA-Z]+)\.id, data\.id\)\)/g;
  content = content.replace(simpleWhereRegex, (match, tableName) => {
    return `.where(and(eq(schema.${tableName}.id, data.id), eq(schema.${tableName}.organizationId, orgId)))`;
  });

  // Also need to make sure 'and' is imported from 'drizzle-orm'
  if (content.includes("and(eq(") && !content.includes('and } from "drizzle-orm"')) {
    content = content.replace(
      'import { eq } from "drizzle-orm";',
      'import { eq, and } from "drizzle-orm";',
    );
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Fixed ${file}`);
}
