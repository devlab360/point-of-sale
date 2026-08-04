const fs = require('fs');
const path = require('path');

function fixFiles(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixFiles(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex1 = /\(await\s+([a-zA-Z]+Fn)\(\s*as\s*any\{/g;
      
      let modified = false;
      if (regex1.test(content)) {
        content = content.replace(regex1, 'await $1({');
        
        // Also fix the end parenthesis that is now unmatched
        // because it used to be (await fn(...));
        // We will just do a general regex for cases where the closing paren is missing,
        // but wait! If it was (await fn(...));
        // then replacing (await fn(...) with await fn(...) leaves the trailing ); which is perfectly fine.
        // Wait, `(await fn(...)` -> `await fn(...)` means we REMOVED the first `(`.
        // The original code was `const res = await fn({...});`
        // My bad script did `const res = (await fn( as any{...});`
        // So by replacing `(await fn( as any{` with `await fn({` we restore it to:
        // `const res = await fn({...});` which is correct!
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log("Fixed syntax in", file);
      }
    }
  }
}

fixFiles(path.join(__dirname, 'src/routes'));
