// usage: node tools/patch.mjs file <<< JSON [[old,new],...]
import fs from 'node:fs';
const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
const reps = JSON.parse(fs.readFileSync(0, 'utf8'));
for (const [a, b] of reps) { if (!s.includes(a)) { console.error('MISSING: ' + a.slice(0, 80)); process.exitCode = 1; continue; } s = s.split(a).join(b); }
fs.writeFileSync(f, s);
