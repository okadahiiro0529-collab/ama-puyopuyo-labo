// Usage: node replace_requestAIMove.js path/to/game.js path/to/game.requestAIMove.serverFirst.js
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage: node replace_requestAIMove.js <game.js> <replacement.js>');
  process.exit(2);
}

const gamePath = process.argv[2];
const replPath = process.argv[3];

if (!fs.existsSync(gamePath)) { console.error('game.js not found:', gamePath); process.exit(2); }
if (!fs.existsSync(replPath)) { console.error('replacement file not found:', replPath); process.exit(2); }

const gameText = fs.readFileSync(gamePath, 'utf8');
const replText = fs.readFileSync(replPath, 'utf8');

// find start index of "static async requestAIMove"
const startRegex = /static\s+async\s+requestAIMove\s*\(\s*\)\s*\{/m;
const m = startRegex.exec(gameText);
if (!m) { console.error('Could not find "static async requestAIMove() {" in', gamePath); process.exit(2); }
const startIndex = m.index;
let braceIndex = gameText.indexOf('{', startIndex);
if (braceIndex < 0) { console.error('Malformed function start.'); process.exit(2); }

// find matching closing brace by counting
let i = braceIndex;
let depth = 0;
for (; i < gameText.length; i++) {
  const ch = gameText[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) {
      break;
    }
  }
}
if (depth !== 0) { console.error('Could not find matching closing brace for requestAIMove.'); process.exit(2); }
const endIndex = i;

const before = gameText.slice(0, startIndex);
const after = gameText.slice(endIndex + 1);
const newContent = before + replText + '\n' + after;

fs.copyFileSync(gamePath, gamePath + '.bak');
fs.writeFileSync(gamePath, newContent, 'utf8');
console.log('Replaced requestAIMove in', gamePath, 'backup ->', gamePath + '.bak');