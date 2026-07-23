const fs = require('fs');

const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const locales = ['en', 'bn', 'ar', 'hi', 'zh'];

// Let's just find each block and remove the duplicates that were added manually by me.
// The duplicates I added are exactly what I see in the grep output.
// Instead of complex AST, I will regex replace the duplicates inside the objects.
// Wait, an object literal duplicate means the LAST one wins in JS usually, but TS complains.
// Let's use TS API or Babel to format it, or simple regex?

// Simple regex: find keys that are duplicated within a single block.
// A block is an object literal.
function removeDuplicates(str) {
  let lines = str.split('\n');
  
  let inObj = false;
  let seenKeys = new Set();
  
  let newLines = [];
  
  for (let line of lines) {
    if (line.match(/^\s*(en|bn|ar|hi|zh):\s*\{/)) {
      inObj = true;
      seenKeys.clear();
      newLines.push(line);
      continue;
    }
    
    if (inObj && line.match(/^\s*\}/)) {
      inObj = false;
      newLines.push(line);
      continue;
    }
    
    if (inObj) {
      let match = line.match(/^\s*([a-zA-Z0-9_]+):/);
      if (match) {
        let key = match[1];
        if (seenKeys.has(key)) {
          // It's a duplicate. We want to keep the NEWEST one which was added later, 
          // wait, the new one has more specific context, BUT it's easier to just remove the old one.
          // BUT since we are processing line by line, if we skip the second one, we keep the first.
          // Let's just collect all keys for a block first.
        }
      }
    }
  }
}

// Actually, let's just do it cleanly with a regex to remove the OLD keys.
// The old keys are:
// actions, total, phone, purchases, expenses
// These were near the top of the object.
const oldKeys = ['actions', 'total', 'phone', 'purchases', 'expenses'];

let inBlock = false;
let lines = content.split('\n');
let blockLines = [];
let outLines = [];

for (let line of lines) {
  if (line.match(/^\s*(en|bn|ar|hi|zh):\s*\{/)) {
    inBlock = true;
    outLines.push(line);
    blockLines = [];
    continue;
  }
  
  if (inBlock && line.match(/^\s*\}/)) {
    inBlock = false;
    
    // Process blockLines
    // Find last index of each key
    let keyIndices = {};
    for (let i = 0; i < blockLines.length; i++) {
      let match = blockLines[i].match(/^\s*([a-zA-Z0-9_]+):/);
      if (match) {
        let key = match[1];
        keyIndices[key] = i;
      }
    }
    
    for (let i = 0; i < blockLines.length; i++) {
      let match = blockLines[i].match(/^\s*([a-zA-Z0-9_]+):/);
      if (match) {
        let key = match[1];
        if (keyIndices[key] !== i) {
          // This is a duplicate and NOT the last one. So we skip it.
          continue;
        }
      }
      outLines.push(blockLines[i]);
    }
    
    outLines.push(line);
    continue;
  }
  
  if (inBlock) {
    blockLines.push(line);
  } else {
    outLines.push(line);
  }
}

fs.writeFileSync(path, outLines.join('\n'));
console.log('Fixed duplicates');
