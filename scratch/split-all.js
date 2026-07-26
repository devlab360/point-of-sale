const fs = require('fs');
const path = require('path');

const files = [
  'super-admin.tsx',
  'super-admin.index.tsx',
  'super-admin.plans.tsx',
  'super-admin.users.tsx',
  'inventory.tsx',
  'inventory.index.tsx',
  'inventory.adjustments.tsx',
  'inventory.history.tsx',
  'inventory.transfers.tsx'
];

files.forEach(f => {
  const filePath = path.join(__dirname, '../src/routes', f);
  const lazyPath = path.join(__dirname, '../src/routes', f.replace('.tsx', '.lazy.tsx'));
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract path e.g. "/super-admin/plans"
  const pathMatch = content.match(/createFileRoute\((['"][^'"]+['"])\)/);
  if (!pathMatch) {
    console.error("No route path found in", f);
    return;
  }
  const routePath = pathMatch[1];
  
  // Extract component name e.g. SuperAdminPlans
  const compMatch = content.match(/component:\s*([A-Za-z0-9_]+)/);
  if (!compMatch) {
    console.error("No component found in", f);
    return;
  }
  const compName = compMatch[1];
  
  // Create lazy file content
  let lazyContent = content;
  // Replace createFileRoute import with createLazyFileRoute
  if (lazyContent.includes('createFileRoute')) {
    lazyContent = lazyContent.replace('createFileRoute', 'createLazyFileRoute, createFileRoute');
  } else {
    lazyContent = `import { createLazyFileRoute } from "@tanstack/react-router";\n` + lazyContent;
  }
  
  // Replace export const Route block
  const routeBlockRegex = /export const Route = createFileRoute\([^)]+\)\(\{[\s\S]*?component:\s*[A-Za-z0-9_]+,?\s*\}\);?/;
  lazyContent = lazyContent.replace(routeBlockRegex, `export const Route = createLazyFileRoute(${routePath})({\n  component: ${compName},\n});`);
  
  fs.writeFileSync(lazyPath, lazyContent, 'utf8');
  console.log("Created", f.replace('.tsx', '.lazy.tsx'));
  
  // Update synchronous route file
  let syncContent = `import { createFileRoute } from "@tanstack/react-router";\n\n`;
  if (f === 'inventory.tsx') {
    syncContent += `export const Route = createFileRoute(${routePath})({\n  head: () => ({ meta: [{ title: "Inventory · Grocer.Pro" }] }),\n});\n`;
  } else {
    syncContent += `export const Route = createFileRoute(${routePath})({});\n`;
  }
  
  fs.writeFileSync(filePath, syncContent, 'utf8');
  console.log("Updated sync", f);
});
