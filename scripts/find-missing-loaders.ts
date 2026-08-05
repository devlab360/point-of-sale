import fs from "fs";
import path from "path";
import { globSync } from "glob";

const cwd = process.cwd();
const files = globSync("src/**/*.tsx", { cwd, absolute: true });

const results = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  // Find all Button tags
  const buttonRegex = /<Button([^>]*)>([\s\S]*?)<\/Button>/g;
  let match;

  while ((match = buttonRegex.exec(content)) !== null) {
    const attrs = match[1];
    const innerContent = match[2];

    const isSubmitBtn = /type=(['"])submit\1/.test(attrs);

    // Check if inner content suggests it's an action button
    const lowerContent = innerContent.toLowerCase();
    const isActionText =
      lowerContent.includes("save") ||
      lowerContent.includes("submit") ||
      lowerContent.includes("sign in") ||
      lowerContent.includes("create") ||
      lowerContent.includes("update") ||
      lowerContent.includes("record payment") ||
      lowerContent.includes("verify");

    if (isSubmitBtn || isActionText) {
      // Is it missing disabled={...}?
      const hasDisabled =
        /disabled=\{/.test(attrs) || /disabled$/.test(attrs.trim()) || /disabled=/.test(attrs);
      // Is it missing Loader2?
      const hasLoader = innerContent.includes("Loader2");

      if (!hasDisabled || !hasLoader) {
        results.push({
          file: path.relative(cwd, file),
          attrs: attrs.trim().replace(/\s+/g, " "),
          content: innerContent.trim().replace(/\s+/g, " "),
          hasDisabled,
          hasLoader,
        });
      }
    }
  }
}

console.log(JSON.stringify(results, null, 2));
