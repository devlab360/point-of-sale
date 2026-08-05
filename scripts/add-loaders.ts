import fs from "fs";
import path from "path";
import { globSync } from "glob";

const cwd = process.cwd();
const files = globSync("src/**/*.tsx", { cwd, absolute: true });

let totalUpdated = 0;

const stateSetters = [
  "isSaving",
  "isSubmitting",
  "isCreating",
  "isVerifying",
  "isUpdatingSecurity",
  "isPostingVoucher",
  "isSubmittingAccount",
  "isSendingOtp",
  "isResetting",
  "isAnalyzing",
  "isRegistering",
  "isLoading",
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let originalContent = content;

  const buttonRegex = /<Button([^>]*)>([\s\S]*?)<\/Button>/g;

  content = content.replace(buttonRegex, (match, attrs, innerContent) => {
    // Check if it has a disabled={stateVar}
    const disabledMatch = attrs.match(/disabled=\{([a-zA-Z0-9_]+)\}/);
    if (!disabledMatch) {
      return match;
    }

    const stateVar = disabledMatch[1];

    // Check if the stateVar is a loading state
    if (!stateSetters.includes(stateVar)) {
      return match;
    }

    // If inner content already has Loader2, skip
    if (innerContent.includes("Loader2")) {
      return match;
    }

    // Prepend loader
    const cleanInner = innerContent.trim();
    const newInnerContent = `{${stateVar} && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} ${cleanInner}`;

    return `<Button${attrs}>${newInnerContent}</Button>`;
  });

  if (content !== originalContent) {
    // Add Loader2 import if needed
    if (!content.includes("Loader2")) {
      if (content.includes('from "lucide-react"')) {
        content = content.replace(/import\s+{([^}]*)}\s+from\s+"lucide-react"/, (m, imports) => {
          if (!imports.includes("Loader2")) {
            return `import { ${imports.trim()}, Loader2 } from "lucide-react"`;
          }
          return m;
        });
      } else {
        content = `import { Loader2 } from "lucide-react";\n` + content;
      }
    }

    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated ${path.relative(cwd, file)}`);
    totalUpdated++;
  }
}

console.log(`\nFinished updating ${totalUpdated} files.`);
