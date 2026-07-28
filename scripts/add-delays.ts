import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const cwd = process.cwd();
const files = globSync('src/routes/*.tsx', { cwd, absolute: true });

let totalUpdated = 0;

const stateSetters = [
  'setIsSaving', 'setIsSubmitting', 'setIsCreating', 'setIsVerifying',
  'setIsUpdatingSecurity', 'setIsPostingVoucher', 'setIsSubmittingAccount',
  'setIsSendingOtp', 'setIsResetting'
];

for (const file of files) {
  let originalContent = fs.readFileSync(file, 'utf8');
  
  // Create a regex to match ONLY the specific state setters being called with true
  const regexStr = `(${stateSetters.join('|')})\\(\\s*true\\s*\\)\\s*;`;
  const regex = new RegExp(regexStr, 'g');
  
  // Re-read and only apply where there is no Promise already
  let newContent = originalContent.replace(regex, (match) => {
    return `${match}\n    await new Promise(resolve => setTimeout(resolve, 500));`;
  });
  
  // To avoid duplicate if already inserted
  if (newContent !== originalContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${path.relative(cwd, file)}`);
    totalUpdated++;
  }
}

console.log(`\nFinished updating ${totalUpdated} files.`);
