const fs = require("fs");
const path = require("path");

const apiDir = path.join(__dirname, "src", "api");

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Replace { success: false, error: String(e) }
  const regex1 =
    /return\s+\{\s*success\s*:\s*false\s*,\s*error\s*:\s*(?:String\(e\)|String\(err\)|\(e as Error\)\.message|\(err as Error\)\.message)\s*\}\s*;/g;

  if (regex1.test(content)) {
    content = content.replace(regex1, "return handleApiError(e);"); // or handleApiError(err) if err is used, but mostly it's e.
    changed = true;
  }

  // Actually, we should capture the variable name in the catch block if possible,
  // but a simple approach: just find `catch (e)` and replace `String(e)`

  // Let's do a more robust string replacement for the most common pattern:
  const regex2 =
    /catch\s*\(\s*(e|err|error)\s*\)\s*\{\s*return\s*\{\s*success\s*:\s*false\s*,\s*error\s*:\s*String\(\1\)\s*\}\s*;\s*\}/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, "catch ($1) { return handleApiError($1); }");
    changed = true;
  }

  // Also replace `error: String(e)` directly anywhere inside catch
  content = content.replace(/error\s*:\s*String\((e|err|error)\)/g, "...handleApiError($1)"); // wait, return { ...handleApiError(e) } is not right.

  // Let's just do a simpler manual pass:
  content = content.replace(
    /return\s+\{\s*success\s*:\s*false\s*,\s*error\s*:\s*String\((e|err|error)\)\s*\}\s*;/g,
    "return handleApiError($1);",
  );
  content = content.replace(
    /return\s+\{\s*success\s*:\s*false\s*,\s*error\s*:\s*\(\s*(e|err|error)\s*as\s*Error\s*\)\.message\s*\}\s*;/g,
    "return handleApiError($1);",
  );

  if (content.includes("handleApiError") && !content.includes("import { handleApiError }")) {
    content = 'import { handleApiError } from "@/lib/error-utils";\n' + content;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated", filePath);
  }
}

fs.readdirSync(apiDir).forEach((file) => {
  if (file.endsWith(".ts")) {
    processFile(path.join(apiDir, file));
  }
});

console.log("Done");
