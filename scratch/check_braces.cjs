
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Lenovo Legion/.gemini/antigravity/scratch/denr-feed/src/components/ForestNursery.jsx', 'utf8');
const lines = content.split('\n');
let braceCount = 0;
let parenCount = 0;
for (let i = 518; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
    }
    if (braceCount < 0 || parenCount < 0) {
        console.log(`Unbalanced at line ${i + 1}: braceCount=${braceCount}, parenCount=${parenCount}`);
    }
}
console.log(`Final: braceCount=${braceCount}, parenCount=${parenCount}`);
