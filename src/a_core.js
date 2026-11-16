'use strict';
// ===== math / deterministic random =====
const { sin, cos, sqrt, abs, floor, ceil, min, max, PI, atan2, exp, pow, hypot } = Math;
const TAU = PI * 2;
let _s = 1;
function seed(s) { _s = (s * 2654435761) >>> 0; }
function rnd() { _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function h3(x, y, z) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1440662683) | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function vn2(x, y) { const xi = floor(x), yi = floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); return mix(mix(h2(xi, yi), h2(xi + 1, yi), fx), mix(h2(xi, yi + 1), h2(xi + 1, yi + 1), fx), fy); }
function fbm2(x, y, o) { let a = .5, s = 0; for (let i = 0; i < o; i++) { s += a * vn2(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= .5; } return s / (1 - 2 * a); }
function vn3(x, y, z) { const xi = floor(x), yi = floor(y), zi = floor(z); let fx = x - xi, fy = y - yi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz); const a = mix(mix(h3(xi, yi, zi), h3(xi + 1, yi, zi), fx), mix(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), fx), fy), b = mix(mix(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), fx), mix(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), fx), fy); return mix(a, b, fz); }
function fbm3(x, y, z, o) { let a = .5, s = 0; for (let i = 0; i < o; i++) { s += a * vn3(x, y, z); x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; z = z * 2.03 + 5.3; a *= .5; } return s / (1 - 2 * a); }
const ridge = (x, y) => 1 - abs(2 * fbm2(x, y, 4) - 1);

// ===== world layout =====
const NH = 1025, CS = 3, HW = 1536;
const H = new Float32Array(NH * NH);
const GR = [-500, -100], HTP = [-500, -285], CAT = [590, -430], GAR = [400, 320], SAN = [-250, 600], CRN = [20, 130];
const RAV = [-262, -205, -120, -300, 30, -362, 170, -378, 315, -408];
const STR = [-488, -232, -462, -190, -480, -140, -452, -95, -420, -80, -372, -110, -322, -150, -282, -190, -262, -205, -120, -300, 30, -362, 170, -378, 315, -408, 470, -425, 560, -430];
const CHS = [-470, 660, -360, 705, -250, 742, -140, 728, -30, 770];
let _pt = 0, _pd = 0;
function polyD(P, px, pz) {
  let best = 1e9, bt = 0; const n = P.length / 2 - 1;
  for (let i = 0; i < n; i++) {
    const ax = P[i * 2], az = P[i * 2 + 1], dx = P[i * 2 + 2] - ax, dz = P[i * 2 + 3] - az;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
    const d = hypot(px - ax - dx * t, pz - az - dz * t);
    if (d < best) { best = d; bt = (i + t) / n; }
  }
  _pt = bt; return best;
}
function bbox(P, m) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < P.length; i += 2) { a = min(a, P[i]); c = max(c, P[i]); b = min(b, P[i + 1]); d = max(d, P[i + 1]); } return [a - m, b - m, c + m, d + m]; }
const bbR = bbox(RAV, 150), bbS = bbox(STR, 40), bbC = bbox(CHS, 130);
const inb = (b, x, z) => x > b[0] && x < b[2] && z > b[1] && z < b[3];
// side outputs of hfn
let gStr = 0, gRav = 0, gPl = 0, gMoss = 0, gRock = 0;
function ravD(x, z) { if (!inb(bbR, x, z)) return 1e9; return polyD(RAV, x, z) + (fbm2(x / 45, z / 45, 2) - .5) * 26; }
function hfn(x, z) {
  const r = hypot(x, z);
  let h = 60 * (fbm2(x / 420 + 3, z / 420 + 7, 4) - .5) + 16 * (fbm2(x / 95, z / 95, 3) - .5) + 2.4 * (fbm2(x / 17, z / 17, 2) - .5);
  gStr = gRav = gPl = gMoss = gRock = 0;
  const m = sstep(1050, 1480, r + 160 * (fbm2(x / 300 + 40, z / 300, 3) - .5));
  h += m * (240 + 300 * ridge(x / 260, z / 260)); gRock = m * .6;
  let d = hypot(x - CRN[0], z - CRN[1]), w = exp(-d * d / (150 * 150));
  h += 120 * w * (.65 + .7 * fbm2(x / 40, z / 40, 3)); gRock = max(gRock, sstep(.25, .6, w));
  d = hypot(x - GR[0], z - GR[1]); w = 1 - sstep(60, 190, d); h = mix(h, 2 + h * .2, w); gMoss = w * .5;
  d = hypot(x - CAT[0], z - CAT[1]); w = 1 - sstep(120, 240, d); h = mix(h, -14 + h * .12, w); gMoss = max(gMoss, w * .8);
  d = hypot(x - GAR[0], z - GAR[1]); w = 1 - sstep(90, 340, d); h -= 75 * w * w; gMoss = max(gMoss, w * .6);
  d = hypot(x - SAN[0], z - SAN[1]); w = 1 - sstep(115, 200, d); h = mix(h, 32 + h * .1, w); gPl = 1 - sstep(70, 135, d);
  if (inb(bbC, x, z)) {
    d = polyD(CHS, x, z) + (fbm2(x / 40 + 5, z / 40, 2) - .5) * 20;
    const hw = 24 + 12 * fbm2(x / 60, z / 60 + 3, 2); w = 1 - sstep(hw, hw + 34, d);
    const k = w * 3, fl = floor(k); w = mix(w, (fl + sstep(.2, .8, k - fl)) / 3, .6) * sstep(0, .08, _pt) * (1 - sstep(.92, 1, _pt));
    h = mix(h, -105 + 8 * fbm2(x / 30, z / 30, 2), w); gRav = max(gRav, w);
  }
  if (inb(bbR, x, z)) {
    d = polyD(RAV, x, z) + (fbm2(x / 45, z / 45, 2) - .5) * 26;
    const t = _pt, depth = 118 * sstep(-.02, .2, t) * (1 - .86 * sstep(.8, 1.02, t));
    const hw = 30 + 18 * fbm2(x / 70 + 9, z / 70, 2); w = 1 - sstep(hw, hw + 44, d);
    const k = w * 4, fl = floor(k); w = mix(w, (fl + sstep(.18, .82, k - fl)) / 4, .7);
    h = mix(h, -depth + 5 * fbm2(x / 25, z / 25, 2), w * sstep(0, .03, t)); gRav = max(gRav, w * sstep(0, .1, t));
  }
  if (inb(bbS, x, z)) { d = polyD(STR, x, z); w = 1 - sstep(3, 11, d); h -= 2.8 * w; gStr = w; gMoss = max(gMoss, 1 - sstep(5, 30, d)); }
  return h;
}
const BIO = new Uint8Array(1024 * 1024 * 4);
function buildWorld() {
  const aux = new Float32Array(NH * NH * 4);
  for (let j = 0; j < NH; j++) for (let i = 0; i < NH; i++) {
    const k = j * NH + i; H[k] = hfn((i - 512) * CS, (j - 512) * CS);
    aux[k * 4] = gStr; aux[k * 4 + 1] = gRav; aux[k * 4 + 2] = gPl;     aux[k * 4 + 3] = gMoss + (gRock > 0 ? 8 + gRock : 0);
  }
  for (let j = 0; j < 1024; j++) for (let i = 0; i < 1024; i++) {
    const k = j * NH + i, x = (i - 512) * CS, z = (j - 512) * CS;
    const sx = (H[k + 1] - H[max(k - 1, j * NH)]) / (2 * CS), sz = (H[min(k + NH, NH * NH - 1)] - H[max(k - NH, 0)]) / (2 * CS), sl = hypot(sx, sz);
    const st = aux[k * 4], rv = aux[k * 4 + 1], pl = aux[k * 4 + 2]; let ms = aux[k * 4 + 3], rk = 0; if (ms >= 8) { rk = ms - 8; ms = 0; }
    const floorish = sl < .25 ? 1 : 0;
    let dens = (1 - sstep(.4, .75, sl)) * (1 - st) * (1 - .75 * pl) * (1 - rk * .7);
    if (rv > .05) dens *= floorish ? .75 : .15;
    const g = clamp((fbm2(x / 230 + 11, z / 230 + 5, 3) - .5) * 3.2 + .5, 0, 1);
    const moss = clamp(ms * (.5 + fbm2(x / 30, z / 30, 2)) + .35 * sstep(.55, .75, fbm2(x / 110 + 70, z / 110, 3)), 0, 1);
    const rock = clamp(max(sstep(.45, .9, sl), max(rk, rv > .05 && !floorish ? .9 : 0)), 0, 1);
    const o = (j * 1024 + i) * 4; BIO[o] = dens * 255; BIO[o + 1] = g * 255; BIO[o + 2] = moss * 255; BIO[o + 3] = rock * 255;
  }
}
function getH(x, z) {
  const fx = clamp(x / CS + 512, 0, 1023.999), fz = clamp(z / CS + 512, 0, 1023.999), i = floor(fx), j = floor(fz), u = fx - i, v = fz - j, k = j * NH + i;
  return mix(mix(H[k], H[k + 1], u), mix(H[k + NH], H[k + NH + 1], u), v);
}
function getB(x, z, c) { const i = clamp(floor(x / CS + 512), 0, 1023), j = clamp(floor(z / CS + 512), 0, 1023); return BIO[(j * 1024 + i) * 4 + c] / 255; }
function slopeAt(x, z) { return hypot(getH(x + 4, z) - getH(x - 4, z), getH(x, z + 4) - getH(x, z - 4)) / 8; }

// ===== geometry builder =====
const MAXV = 3600000, MAXI = 15000000;
const VB = new ArrayBuffer(MAXV * 32), vf = new Float32Array(VB), vu = new Uint8Array(VB), vs8 = new Int8Array(VB);
const IB = new Uint32Array(MAXI);
let nv = 0, ni = 0, mb = 0, mi0 = 0;
let cM = 0, cR = 1, cG = 1, cB = 1, cE = 0, cS = 0, cA = 1, cX = 0;
let seam = [];
const c8 = x => x <= 0 ? 0 : x >= 1 ? 255 : x * 255 | 0;
function col(r, g, b, e) { cR = r; cG = g; cB = b; if (e !== undefined) cE = e; }
function colm(a, b, t, e) { cR = mix(a[0], b[0], t); cG = mix(a[1], b[1], t); cB = mix(a[2], b[2], t); if (e !== undefined) cE = e; }
const sw = a => { cS = sqrt(min(a, 16) / 16); };
function V(x, y, z, u, v) {
  const o = nv * 8, b = nv * 32; vf[o] = x; vf[o + 1] = y; vf[o + 2] = z;
  vu[b + 16] = c8(cR); vu[b + 17] = c8(cG); vu[b + 18] = c8(cB); vu[b + 19] = c8(cE);
  vf[o + 5] = u; vf[o + 6] = v; vu[b + 28] = cM; vu[b + 29] = c8(cS); vu[b + 30] = c8(cA); vu[b + 31] = c8(cX);
  return nv++;
}
function T(a, b, c) { IB[ni++] = a - mb; IB[ni++] = b - mb; IB[ni++] = c - mb; }
const M = { v0: [], i0: [], ic: [], cx: [], cy: [], cz: [], r: [], fl: [], ln: [], ld: [], mx: [], gl: [] };
function begin() { mb = nv; mi0 = ni; seam = []; cS = 0; cA = 1; cX = 0; cE = 0; }
function normals() {
  const n = nv - mb, acc = new Float32Array(n * 3);
  for (let i = mi0; i < ni; i += 3) {
    const a = IB[i], b = IB[i + 1], c = IB[i + 2], pa = (a + mb) * 8, pb = (b + mb) * 8, pc = (c + mb) * 8;
    const ux = vf[pb] - vf[pa], uy = vf[pb + 1] - vf[pa + 1], uz = vf[pb + 2] - vf[pa + 2], wx = vf[pc] - vf[pa], wy = vf[pc + 1] - vf[pa + 1], wz = vf[pc + 2] - vf[pa + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    acc[a * 3] += nx; acc[a * 3 + 1] += ny; acc[a * 3 + 2] += nz; acc[b * 3] += nx; acc[b * 3 + 1] += ny; acc[b * 3 + 2] += nz; acc[c * 3] += nx; acc[c * 3 + 1] += ny; acc[c * 3 + 2] += nz;
  }
  for (let i = 0; i < seam.length; i += 2) {
    const a = (seam[i] - mb) * 3, b = (seam[i + 1] - mb) * 3;
    for (let k = 0; k < 3; k++) { const s = acc[a + k] + acc[b + k]; acc[a + k] = s; acc[b + k] = s; }
  }
  for (let i = 0; i < n; i++) {
    let x = acc[i * 3], y = acc[i * 3 + 1], z = acc[i * 3 + 2]; const l = hypot(x, y, z) || 1, b = (i + mb) * 32 + 12;
    vs8[b] = x / l * 127; vs8[b + 1] = y / l * 127; vs8[b + 2] = z / l * 127;
  }
}
// flag: 0 opaque culled, 1 opaque two-sided, 2 additive
function end(flag, mx, noN) {
  if (!noN) normals();
  let a = 1e9, b = 1e9, c = 1e9, d = -1e9, e = -1e9, f = -1e9;
  for (let i = mb; i < nv; i++) { const x = vf[i * 8], y = vf[i * 8 + 1], z = vf[i * 8 + 2]; a = min(a, x); b = min(b, y); c = min(c, z); d = max(d, x); e = max(e, y); f = max(f, z); }
  const cx = (a + d) / 2, cy = (b + e) / 2, cz = (c + f) / 2; let r = 0;
  for (let i = mb; i < nv; i++) r = max(r, hypot(vf[i * 8] - cx, vf[i * 8 + 1] - cy, vf[i * 8 + 2] - cz));
  M.v0.push(mb); M.i0.push(mi0); M.ic.push(ni - mi0); M.cx.push(cx); M.cy.push(cy); M.cz.push(cz); M.r.push(r + 1); M.fl.push(flag | 0); M.ln.push(-1); M.ld.push(0); M.mx.push(mx || 0); M.gl.push(null);
  if (nv > MAXV - 70000 || ni > MAXI - 400000) throw 'geometry overflow';
  return M.v0.length - 1;
}
// build LOD chain: gen(q) for q=0..2; dists=[d0,d1]
function lods(gen, flag, d0, d1, mx) {
  let first = -1, prev = -1; const n = d1 ? 3 : d0 ? 2 : 1;
  for (let q = 0; q < n; q++) {
    begin(); gen(q); const id = end(flag, mx);
    if (prev >= 0) { M.ln[prev] = id; M.ld[prev] = q == 1 ? d0 : d1; } else first = id; prev = id;
  }
  return first;
}
// transform verts [v0,nv): local +y -> (ux,uy,uz), yaw about local y, scale, translate
function xf(v0, px, py, pz, s, ux, uy, uz, yaw) {
  const l = 1 / (hypot(ux, uy, uz) || 1); ux *= l; uy *= l; uz *= l;
  let ax = 0, ay = 1, az = 0; if (abs(uy) > .99) { ax = 1; ay = 0; }
  let Xx = ay * uz - az * uy, Xy = az * ux - ax * uz, Xz = ax * uy - ay * ux; const xl = 1 / hypot(Xx, Xy, Xz); Xx *= xl; Xy *= xl; Xz *= xl;
  const Zx = Xy * uz - Xz * uy, Zy = Xz * ux - Xx * uz, Zz = Xx * uy - Xy * ux, c = cos(yaw || 0), sn = sin(yaw || 0);
  for (let i = v0; i < nv; i++) {
    const o = i * 8, x0 = vf[o], y = vf[o + 1] * s, z0 = vf[o + 2], x = (x0 * c + z0 * sn) * s, z = (-x0 * sn + z0 * c) * s;
    vf[o] = px + Xx * x + ux * y + Zx * z; vf[o + 1] = py + Xy * x + uy * y + Zy * z; vf[o + 2] = pz + Xz * x + uz * y + Zz * z;
  }
}
function scl(v0, sx, sy, sz) { for (let i = v0; i < nv; i++) { vf[i * 8] *= sx; vf[i * 8 + 1] *= sy; vf[i * 8 + 2] *= sz; } }
// grown path: direction evolves with gravity-like bias gy and wiggle
function grow(x, y, z, dx, dy, dz, len, n, gy, wig, sd) {
  const P = new Float32Array(n * 3), st = len / (n - 1); let l = 1 / hypot(dx, dy, dz); dx *= l; dy *= l; dz *= l;
  for (let i = 0; i < n; i++) {
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; const t = i * .37 * 9 / n + sd;
    dx += wig * (vn2(t, sd * 1.7) - .5) * 9 / n; dz += wig * (vn2(t + 31.4, sd * 2.3) - .5) * 9 / n; dy += gy / n; l = 1 / hypot(dx, dy, dz); dx *= l; dy *= l; dz *= l; x += dx * st; y += dy * st; z += dz * st;
  }
  return P;
}
// catmull-rom sampled path
function spl(C, n) {
  const m = C.length / 3, P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1) * (m - 1), k = min(floor(f), m - 2), t = f - k, a = max(k - 1, 0) * 3, b = k * 3, c = (k + 1) * 3, d = min(k + 2, m - 1) * 3;
    for (let e = 0; e < 3; e++) { const p0 = C[a + e], p1 = C[b + e], p2 = C[c + e], p3 = C[d + e]; P[i * 3 + e] = .5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t); }
  }
  return P;
}
let _x = 0, _y = 0, _z = 0, _dx = 0, _dy = 0, _dz = 0;
function at(P, t) {
  const n = P.length / 3, f = clamp(t, 0, .9999) * (n - 1), k = floor(f), u = f - k, a = k * 3;
  _x = mix(P[a], P[a + 3], u); _y = mix(P[a + 1], P[a + 4], u); _z = mix(P[a + 2], P[a + 5], u);
  _dx = P[a + 3] - P[a]; _dy = P[a + 4] - P[a + 1]; _dz = P[a + 5] - P[a + 2]; const l = 1 / (hypot(_dx, _dy, _dz) || 1); _dx *= l; _dy *= l; _dz *= l;
}
// swept tube. rf(t)->radius, o.m(t,a)->radius mult, o.vf(t,a) vertex state hook, o.us u scale
function tube(P, rf, ns, o) {
  o = o || {}; const n = P.length / 3, base = nv, us = o.us || 1; let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const i0 = max(i - 1, 0) * 3, i1 = min(i + 1, n - 1) * 3;
    let ax = P[i1] - P[i0], ay = P[i1 + 1] - P[i0 + 1], az = P[i1 + 2] - P[i0 + 2]; const l = 1 / (hypot(ax, ay, az) || 1); ax *= l; ay *= l; az *= l;
    if (i == 0) { if (o.n0) { nx = o.n0[0]; ny = o.n0[1]; nz = o.n0[2]; } else if (abs(ay) < .9) { nx = -az; nz = ax; ny = 0; } else { nx = 1; ny = 0; nz = 0; } }
    const d = nx * ax + ny * ay + nz * az; nx -= ax * d; ny -= ay * d; nz -= az * d; const ln = 1 / (hypot(nx, ny, nz) || 1); nx *= ln; ny *= ln; nz *= ln;
    const bx = ay * nz - az * ny, by = az * nx - ax * nz, bz = ax * ny - ay * nx, t = i / (n - 1), r = rf(t);
    for (let j = 0; j <= ns; j++) {
      const a = j / ns * TAU; let q = r; if (o.m) q *= o.m(t, a); if (o.vf) o.vf(t, a);
      const c = cos(a), s = sin(a);
      V(P[i * 3] + (nx * c + bx * s) * q, P[i * 3 + 1] + (ny * c + by * s) * q, P[i * 3 + 2] + (nz * c + bz * s) * q, t * us, j / ns);
    }
    seam.push(base + i * (ns + 1), base + i * (ns + 1) + ns);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < ns; j++) { const a = base + i * (ns + 1) + j, c = a + ns + 1; T(a, a + 1, c); T(a + 1, c + 1, c); }
}
// two-sided ribbon. wf(t)->half width; o.fold: mid ridge offset; o.n: normal hint; o.vf(t)
function ribbon(P, wf, o) {
  o = o || {}; const n = P.length / 3, base = nv, fold = o.fold || 0, k = fold ? 3 : 2, h = o.n || [0, 1, 0]; let nx = h[0], ny = h[1], nz = h[2];
  for (let i = 0; i < n; i++) {
    const i0 = max(i - 1, 0) * 3, i1 = min(i + 1, n - 1) * 3;
    let ax = P[i1] - P[i0], ay = P[i1 + 1] - P[i0 + 1], az = P[i1 + 2] - P[i0 + 2]; const l = 1 / (hypot(ax, ay, az) || 1); ax *= l; ay *= l; az *= l;
    let d = nx * ax + ny * ay + nz * az; nx -= ax * d; ny -= ay * d; nz -= az * d; let ln = hypot(nx, ny, nz);
    if (ln < 1e-3) { nx = 1; ny = 0; nz = 0; d = ax; nx -= ax * d; ny -= ay * d; nz -= az * d; ln = hypot(nx, ny, nz); }
    nx /= ln; ny /= ln; nz /= ln;
    const bx = ay * nz - az * ny, by = az * nx - ax * nz, bz = ax * ny - ay * nx, t = i / (n - 1), w = wf(t), x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (o.vf) o.vf(t);
    V(x - bx * w, y - by * w, z - bz * w, t, -1);
    if (fold) V(x - nx * w * fold, y - ny * w * fold, z - nz * w * fold, t, 0);
    V(x + bx * w, y + by * w, z + bz * w, t, 1);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < k - 1; j++) { const a = base + i * k + j, c = a + k; T(a, a + 1, c); T(a + 1, c + 1, c); }
}
// surface of revolution about +y. prof=[r,y,...]; o.df(t,a,r,y) sets _x(r),_y; o.vf(t,a); o.uf(t)
function lathe(prof, ns, o) {
  o = o || {}; const m = prof.length / 2, base = nv;
  for (let i = 0; i < m; i++) {
    const t = i / (m - 1);
    for (let j = 0; j <= ns; j++) {
      const a = j / ns * TAU; _x = prof[i * 2]; _y = prof[i * 2 + 1]; if (o.df) o.df(t, a, _x, _y); if (o.vf) o.vf(t, a);
      V(_x * cos(a), _y, _x * sin(a), o.uf ? o.uf(t) : t, j / ns);
    }
    seam.push(base + i * (ns + 1), base + i * (ns + 1) + ns);
  }
  for (let i = 0; i < m - 1; i++) for (let j = 0; j < ns; j++) { const a = base + i * (ns + 1) + j, c = a + ns + 1; T(a, a + 1, c); T(a + 1, c + 1, c); }
}
// icosphere cache
const _ico = [];
function ico(lv) {
  if (_ico[lv]) return _ico[lv];
  const t = (1 + sqrt(5)) / 2; let p = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  let f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  for (let i = 0; i < p.length; i += 3) { const l = hypot(p[i], p[i + 1], p[i + 2]); p[i] /= l; p[i + 1] /= l; p[i + 2] /= l; }
  for (let s = 0; s < lv; s++) {
    const nf = [], mp = new Map();
    const mid = (a, b) => { const k = a < b ? a * 1e6 + b : b * 1e6 + a; let m = mp.get(k); if (m === undefined) { let x = p[a * 3] + p[b * 3], y = p[a * 3 + 1] + p[b * 3 + 1], z = p[a * 3 + 2] + p[b * 3 + 2]; const l = hypot(x, y, z); m = p.length / 3; p.push(x / l, y / l, z / l); mp.set(k, m); } return m; };
    for (let i = 0; i < f.length; i += 3) { const a = f[i], b = f[i + 1], c = f[i + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca); }
    f = nf;
  }
  for (let i = 0; i < f.length; i += 3) { // enforce outward CCW
    const a = f[i] * 3, b = f[i + 1] * 3, c = f[i + 2] * 3, ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], wx = p[c] - p[a], wy = p[c + 1] - p[a + 1], wz = p[c + 2] - p[a + 2];
    if ((uy * wz - uz * wy) * p[a] + (uz * wx - ux * wz) * p[a + 1] + (ux * wy - uy * wx) * p[a + 2] < 0) { const q = f[i + 1]; f[i + 1] = f[i + 2]; f[i + 2] = q; }
  }
  return _ico[lv] = { p, f };
}
// displaced sphere: f(x,y,z)->radius (may set _x,_y,_z for full position when returning undefined)
function blob(lv, f, vfn) {
  const g = ico(lv), base = nv, p = g.p;
  for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2], r = f(x, y, z); if (vfn) vfn(x, y, z, r); V(x * r, y * r, z * r, y * .5 + .5, atan2(z, x) / TAU + .5); }
  for (let i = 0; i < g.f.length; i += 3) T(base + g.f[i], base + g.f[i + 1], base + g.f[i + 2]);
}
// faceted prism crystal along +y from origin. flat shaded.
function crystal(len, rad, sides, sd, o) {
  o = o || {}; const sh = len * (o.sh || (.62 + .25 * h2(sd, 1))), tx = (h2(sd, 2) - .5) * rad * (o.tip === undefined ? .9 : o.tip), tz = (h2(sd, 3) - .5) * rad * (o.tip === undefined ? .9 : o.tip), tp = o.taper || .8;
  const bx = [], bz = [], qx = [], qz = [], sy = [];
  for (let k = 0; k < sides; k++) { const a = (k + (h2(sd, 10 + k) - .5) * .5) / sides * TAU, r = rad * (.75 + .5 * h2(sd, 20 + k)); bx.push(cos(a) * r * tp); bz.push(sin(a) * r * tp); qx.push(cos(a) * r); qz.push(sin(a) * r); sy.push(sh * (.9 + .2 * h2(sd, 30 + k))); }
  for (let k = 0; k < sides; k++) {
    const j = (k + 1) % sides; if (o.vf) o.vf(k);
    const a = V(bx[k], 0, bz[k], 0, k / sides), b = V(bx[j], 0, bz[j], 0, (k + 1) / sides), c = V(qx[k], sy[k], qz[k], sy[k] / len, k / sides), d = V(qx[j], sy[j], qz[j], sy[j] / len, (k + 1) / sides);
    T(a, c, b); T(b, c, d);
    const e = V(qx[k], sy[k], qz[k], sy[k] / len, k / sides), f = V(qx[j], sy[j], qz[j], sy[j] / len, (k + 1) / sides), g = V(tx, len, tz, 1, (k + .5) / sides);
    T(e, g, f);
  }
}
// quaternion helpers (results in _q)
const _q = new Float32Array(4);
function qyt(yaw, tilt, td) { // yaw about y, then tilt by angle about horizontal axis at heading td
  const hy = yaw / 2, ay = sin(hy), aw = cos(hy), ht = tilt / 2, s = sin(ht), bx = cos(td) * s, bz = sin(td) * s, bw = cos(ht);
  // q = b * a  (a=(0,ay,0,aw))
  _q[0] = bx * aw - bz * ay; _q[1] = bw * ay; _q[2] = bz * aw + bx * ay; _q[3] = bw * aw;
}
function qdir(ux, uy, uz, yaw) { // rotate +y to (ux,uy,uz) after yaw
  const l = hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l; const tilt = Math.acos(clamp(uy, -1, 1)), h = atan2(uz, ux);
  // axis = y x u = (uz,0,-ux) normalized -> heading angle
  qyt(yaw, tilt, atan2(-ux, uz) + 0 * h);
}
