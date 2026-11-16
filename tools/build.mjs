// Concatenates src/*.js into the single self-contained index.html. Pass --terser for the minified release build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
let js = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
// minify WGSL template literals
js = js.replace(/\/\*wgsl\*\/`([\s\S]*?)`/g, (m, w) => '`' + w.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').replace(/ ?([{}();,=+\-*\/<>:&|!]) ?/g, '$1').replace(/-(?=-)/g, '- ').trim() + '`');
if (process.argv.includes('--terser')) {
  js = js.replace(/\/\*DBG\*\/[\s\S]*?\/\*END\*\//g, ''); // debug-only capture helpers are left out of the release build
  const { createRequire } = await import('node:module');
  const { minify } = createRequire(import.meta.url)('terser');
  const r = await minify(js, { compress: { passes: 2, unsafe_math: false }, mangle: { toplevel: true }, format: { comments: false } });
  js = r.code;
} else {
  js = js.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
}
const html = fs.readFileSync(path.join(src, 'shell.html'), 'utf8').replace('/*JS*/', () => js).replace(/>\s+</g, '><').trim();
fs.writeFileSync(path.join(root, 'index.html'), html);
const b = Buffer.byteLength(html);
console.log('index.html ' + b + ' bytes (' + (b / 1024).toFixed(1) + ' KiB)');
