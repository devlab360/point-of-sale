const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'api');
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts') && !['auth.ts', 'users.ts', 'customers.ts', 'purchases.ts', 'sales.ts', 'products.ts', 'suppliers.ts'].includes(f));

for (const file of files) {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports if missing
  if (!content.includes('requireAuth')) {
    content = content.replace('import { createServerFn } from "@tanstack/react-start";', 
      'import { createServerFn } from "@tanstack/react-start";\nimport { requireAuth } from "@/lib/auth-utils";\nimport { createInsertSchema, createSelectSchema } from "drizzle-zod";');
  }

  // Remove getCookie import
  content = content.replace('import { getCookie } from "@tanstack/react-start/server";\n', '');

  // Replace auth check
  const authCheckRegex = /const orgId = getCookie\("pos_session_org"\);\s*if \(\!orgId\) return \{ success: false, error: "Unauthorized" \};/g;
  content = content.replace(authCheckRegex, 'const session = await requireAuth();\n    const orgId = session.orgId;');

  // Infer entity name
  let entityPluralKebab = file.replace('.ts', '');
  // camelCase
  let entityPlural = entityPluralKebab.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  let entitySingular = entityPlural;
  if (entitySingular.endsWith('ies')) entitySingular = entitySingular.slice(0, -3) + 'y';
  else if (entitySingular.endsWith('ses')) entitySingular = entitySingular.slice(0, -2);
  else if (entitySingular.endsWith('s')) entitySingular = entitySingular.slice(0, -1);
  
  // Drizzle schema key is usually same as entityPlural (e.g. schema.categories, schema.expenses)
  const schemaKey = entityPlural;

  // Let's create schemas dynamically in the file text
  // We'll insert schema declarations right after imports
  let schemaDeclarations = `
const insertSchema = schema.${schemaKey} ? createInsertSchema(schema.${schemaKey}) : z.any();
const updateSchema = schema.${schemaKey} ? createInsertSchema(schema.${schemaKey}).partial() : z.any();
`;
  if (!content.includes('const insertSchema')) {
    content = content.replace('import { z } from "zod";', 'import { z } from "zod";\n' + schemaDeclarations);
  }

  const createRegex = new RegExp(`export const create([A-Za-z]+)Fn = createServerFn\\(\\{ method: "POST" \\}\\)\\s*\\.validator\\(z\\.any\\(\\)( as any)?\\)`, 'g');
  content = content.replace(createRegex, (match, entityName) => {
    return `export const create${entityName}Fn = createServerFn({ method: "POST" })\n  .validator(z.object({ ${entitySingular}: insertSchema }))`;
  });

  const updateRegex = new RegExp(`export const update([A-Za-z]+)Fn = createServerFn\\(\\{ method: "POST" \\}\\)\\s*\\.validator\\(z\\.any\\(\\)( as any)?\\)`, 'g');
  content = content.replace(updateRegex, (match, entityName) => {
    return `export const update${entityName}Fn = createServerFn({ method: "POST" })\n  .validator(z.object({ id: z.string(), ${entitySingular}: updateSchema }))`;
  });

  const deleteRegex = new RegExp(`export const delete([A-Za-z]+)Fn = createServerFn\\(\\{ method: "POST" \\}\\)\\s*\\.validator\\(z\\.any\\(\\)( as any)?\\)`, 'g');
  content = content.replace(deleteRegex, (match, entityName) => {
    return `export const delete${entityName}Fn = createServerFn({ method: "POST" })\n  .validator(z.object({ id: z.string() }))`;
  });

  const getRegex = new RegExp(`export const get([A-Za-z]+)Fn = createServerFn\\(\\{ method: "GET" \\}\\)\\s*\\.validator\\(z\\.any\\(\\)( as any)?\\)`, 'g');
  content = content.replace(getRegex, (match, entityName) => {
    return `export const get${entityName}Fn = createServerFn({ method: "GET" })\n  .validator(z.object({}).passthrough())`;
  });

  // Some tables like rentals returns use data.item etc, let's catch generic update passing
  content = content.replace(/db\.insert\(schema\.[a-zA-Z]+\)\.values\(data\.([a-zA-Z]+)\)/g, (match, dataKey) => match.replace(`data.${dataKey}`, `{...data.${dataKey}, organizationId: session.orgId}`));
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
}
