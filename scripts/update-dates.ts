import fs from "fs";
import path from "path";
import { globSync } from "glob";

// Match new Date( ... ).toLocaleDateString() or new Date().toLocaleDateString()
// Group 1: inner arguments of new Date
const dateStringRegex = /new\s+Date\((.*?)\)\.toLocaleDateString\(\)/g;
const dateTimeStringRegex = /new\s+Date\((.*?)\)\.toLocaleString\(\)/g;
const timeStringRegex = /new\s+Date\((.*?)\)\.toLocaleTimeString\(\)/g;

const files = globSync("src/**/*.{ts,tsx}", { absolute: true });

for (const file of files) {
  if (file.includes("PreferencesContext") || file.includes("formatters")) continue;

  let content = fs.readFileSync(file, "utf8");
  let hasChanges = false;

  if (dateStringRegex.test(content) || dateTimeStringRegex.test(content) || timeStringRegex.test(content)) {
    hasChanges = true;
    
    content = content.replace(dateStringRegex, (match, innerArgs) => {
      return `formatDate(${innerArgs || "new Date()"})`;
    });
    content = content.replace(dateTimeStringRegex, (match, innerArgs) => {
      return `formatDateTime(${innerArgs || "new Date()"})`;
    });
    content = content.replace(timeStringRegex, (match, innerArgs) => {
      return `formatTime(${innerArgs || "new Date()"})`;
    });
  }

  if (hasChanges) {
    // Inject import
    if (!content.includes("@/contexts/PreferencesContext")) {
      // Find the last import line
      const importLines = content.match(/^import .*$/gm);
      if (importLines) {
        const lastImport = importLines[importLines.length - 1];
        content = content.replace(lastImport, `${lastImport}\nimport { usePreferences } from "@/contexts/PreferencesContext";`);
      } else {
        content = `import { usePreferences } from "@/contexts/PreferencesContext";\n` + content;
      }
    }

    // Inject hook into component/function bodies
    // Look for `function X() {` or `const X = () => {`
    // and inject `const { formatDate, formatTime, formatDateTime } = usePreferences();`
    
    // A simple heuristic: inject after the first `{` of functions that contain `formatDate` etc.
    const funcRegex = /(function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*\{)/g;
    
    let lastIndex = 0;
    let newContent = "";
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      newContent += content.substring(lastIndex, match.index + match[0].length);
      
      // We will blindly inject into all top-level functions in the file if they are components/hooks
      // To be safer, we inject it. Since we only modified files that have changes, it's safe to put it in the main component.
      // Usually there's one main component per route file.
      // We'll inject it if the name starts with uppercase (Component) or "use" (Hook) or "Route"
      if (/[A-Z]/.test(match[0][0]) || match[0].includes("function ") || match[0].includes("const ")) {
          // just inject
          newContent += `\n  const { formatDate, formatTime, formatDateTime } = usePreferences();`;
      }
      
      lastIndex = match.index + match[0].length;
    }
    newContent += content.substring(lastIndex);
    content = newContent;

    fs.writeFileSync(file, content, "utf8");
    console.log("Updated", file);
  }
}
