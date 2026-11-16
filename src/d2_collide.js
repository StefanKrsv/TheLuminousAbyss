// ===== collision: per-mesh triangle BVH (local space) + prop grid; terrain uses the heightfield =====
const COLMAT = [0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1]; // bark, caps, rock, crystal, stone, solid glow bodies
const BV = [], CG = 64, CGN = 52; let cgOff = null, cgList = null;
function buildBVH(m) {
  const v0 = M.v0[m], i0 = M.i0[m], nt = M.ic[m] / 3, tl = [];
  for (let i = 0; i < nt; i++) { const a = IB[i0 + i * 3] + v0; if (COLMAT[vu[a * 32 + 28]]) tl.push(i0 + i * 3); }
  const k = tl.length; if (!k) return null;
  const cen = new Float32Array(k * 3), bb = new Float32Array(k * 6), ids = new Int32Array(k);
  for (let i = 0; i < k; i++) {
    ids[i] = i; let a = 1e9, b = 1e9, c = 1e9, d = -1e9, e = -1e9, f = -1e9;
    for (let j = 0; j < 3; j++) { const p = (IB[tl[i] + j] + v0) * 8, x = vf[p], y = vf[p + 1], z = vf[p + 2]; if (x < a) a = x; if (y < b) b = y; if (z < c) c = z; if (x > d) d = x; if (y > e) e = y; if (z > f) f = z; }
    bb[i * 6] = a; bb[i * 6 + 1] = b; bb[i * 6 + 2] = c; bb[i * 6 + 3] = d; bb[i * 6 + 4] = e; bb[i * 6 + 5] = f; cen[i * 3] = (a + d) / 2; cen[i * 3 + 1] = (b + e) / 2; cen[i * 3 + 2] = (c + f) / 2;
  }
  const N = [], C = [];
  const rec = (s, e) => {
    const n = C.length / 2; let a = 1e9, b = 1e9, c = 1e9, d = -1e9, g = -1e9, f = -1e9;
    for (let i = s; i < e; i++) { const o = ids[i] * 6; if (bb[o] < a) a = bb[o]; if (bb[o + 1] < b) b = bb[o + 1]; if (bb[o + 2] < c) c = bb[o + 2]; if (bb[o + 3] > d) d = bb[o + 3]; if (bb[o + 4] > g) g = bb[o + 4]; if (bb[o + 5] > f) f = bb[o + 5]; }
    N.push(a, b, c, d, g, f); C.push(0, 0);
    if (e - s <= 6) { C[n * 2] = s; C[n * 2 + 1] = e - s; return n; }
    const ax = d - a > g - b ? (d - a > f - c ? 0 : 2) : (g - b > f - c ? 1 : 2), mid = (s + e) >> 1;
    ids.subarray(s, e).sort((p, q) => cen[p * 3 + ax] - cen[q * 3 + ax]);
    C[n * 2] = rec(s, mid); C[n * 2 + 1] = -rec(mid, e); return n;
  };
  rec(0, k);
  const T = new Uint32Array(k); for (let i = 0; i < k; i++) T[i] = tl[ids[i]];
  return { n: new Float32Array(N), c: new Int32Array(C), t: T };
}
function buildCollision() {
  const cnt = new Int32Array(CGN * CGN + 1), cell = (v) => clamp(floor(v / CG + CGN / 2), 0, CGN - 1), ok = new Uint8Array(np);
  for (let i = 0; i < np; i++) {
    const m = pM[i]; if (pu[i * 40 + 39] || M.fl[m] == 2 || m == A.manta) continue;
    if (BV[m] === undefined) BV[m] = buildBVH(m); if (!BV[m]) continue; ok[i] = 1;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < np; i++) if (ok[i]) {
      const x0 = cell(pC[i * 4] - pC[i * 4 + 3]), x1 = cell(pC[i * 4] + pC[i * 4 + 3]), z0 = cell(pC[i * 4 + 2] - pC[i * 4 + 3]), z1 = cell(pC[i * 4 + 2] + pC[i * 4 + 3]);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const c = z * CGN + x; if (pass) cgList[cgOff[c] + cnt[c]++] = i; else cnt[c]++; }
    }
    if (!pass) { cgOff = new Int32Array(CGN * CGN + 1); let o = 0; for (let c = 0; c < CGN * CGN; c++) { cgOff[c] = o; o += cnt[c]; } cgOff[CGN * CGN] = o; cgList = new Int32Array(o); cnt.fill(0); }
  }
}
// closest point on triangle (Ericson). result in _cx,_cy,_cz
let _cx = 0, _cy = 0, _cz = 0;
function closestTri(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { _cx = ax; _cy = ay; _cz = az; return; }
  const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { _cx = bx; _cy = by; _cz = bz; return; }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); _cx = ax + abx * v; _cy = ay + aby * v; _cz = az + abz * v; return; }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { _cx = cx; _cy = cy; _cz = cz; return; }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); _cx = ax + acx * w; _cy = ay + acy * w; _cz = az + acz * w; return; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + d5 - d6); _cx = bx + (cx - bx) * w; _cy = by + (cy - by) * w; _cz = bz + (cz - bz) * w; return; }
  const dn = 1 / (va + vb + vc), v = vb * dn, w = vc * dn; _cx = ax + abx * v + acx * w; _cy = ay + aby * v + acy * w; _cz = az + abz * v + acz * w;
}
const _stk = new Int32Array(256); let _nx = 0, _ny = 0, _nz = 0, _wx = 0, _wy = 0, _wz = 0;
// deepest penetration of a sphere into mesh m (local space). returns depth, direction in _nx,_ny,_nz
function bvhSphere(m, x, y, z, r) {
  const b = BV[m], N = b.n, C = b.c, T = b.t, v0 = M.v0[m]; let sp = 0, best = 0; _stk[sp++] = 0;
  while (sp) {
    const n = _stk[--sp], o = n * 6; if (x + r < N[o] || x - r > N[o + 3] || y + r < N[o + 1] || y - r > N[o + 4] || z + r < N[o + 2] || z - r > N[o + 5]) continue;
    const a = C[n * 2], c = C[n * 2 + 1];
    if (c > 0) {
      for (let i = 0; i < c; i++) {
        const t = T[a + i], pa = (IB[t] + v0) * 8, pb = (IB[t + 1] + v0) * 8, pc = (IB[t + 2] + v0) * 8;
        closestTri(x, y, z, vf[pa], vf[pa + 1], vf[pa + 2], vf[pb], vf[pb + 1], vf[pb + 2], vf[pc], vf[pc + 1], vf[pc + 2]);
        const dx = x - _cx, dy = y - _cy, dz = z - _cz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r * r && d2 > 1e-12) { const d = sqrt(d2), pen = r - d; if (pen > best) { best = pen; _nx = dx / d; _ny = dy / d; _nz = dz / d; } }
      }
    } else if (sp < 254) { _stk[sp++] = a; _stk[sp++] = -c; }
  }
  return best;
}
// deepest penetration of a world-space sphere against all nearby props. returns depth (m), push direction in _wx,_wy,_wz
function collide(x, y, z, r) {
  const c = clamp(floor(z / CG + CGN / 2), 0, CGN - 1) * CGN + clamp(floor(x / CG + CGN / 2), 0, CGN - 1); let best = 0;
  for (let k = cgOff[c]; k < cgOff[c + 1]; k++) {
    const i = cgList[k], dx = x - pC[i * 4], dy = y - pC[i * 4 + 1], dz = z - pC[i * 4 + 2], R = pC[i * 4 + 3] + r; if (dx * dx + dy * dy + dz * dz > R * R) continue;
    const o = i * 10, s = pf[o + 3], qx = -pf[o + 4], qy = -pf[o + 5], qz = -pf[o + 6], qw = pf[o + 7], vx = x - pf[o], vy = y - pf[o + 1], vz = z - pf[o + 2];
    let tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
    const lx = (vx + qw * tx + qy * tz - qz * ty) / s, ly = (vy + qw * ty + qz * tx - qx * tz) / s, lz = (vz + qw * tz + qx * ty - qy * tx) / s;
    const d = bvhSphere(pM[i], lx, ly, lz, r / s) * s;
    if (d > best) { best = d; tx = 2 * (-qy * _nz + qz * _ny); ty = 2 * (-qz * _nx + qx * _nz); tz = 2 * (-qx * _ny + qy * _nx); _wx = _nx + qw * tx - qy * tz + qz * ty; _wy = _ny + qw * ty - qz * tx + qx * tz; _wz = _nz + qw * tz - qx * ty + qy * tx; }
  }
  return best;
}
// ===== walking character: two spheres (feet, chest) =====
// the walker is scaled to the forest (about 3x a human) so undergrowth reads as undergrowth
const PL = { x: 0, y: 0, z: 0, vy: 0, g: 0 }, PR = 1.25, EYE = 5, PCH = 3.7;
function walkStep(dt, wx, wz, jump) {
  const n = max(1, ceil(max(hypot(wx, wz), abs(PL.vy)) * dt / .35)), h = dt / n;
  for (let s = 0; s < n; s++) {
    PL.vy = max(PL.vy - 62 * h, -140); const ox = PL.x, oz = PL.z, oy = PL.y, wasG = PL.g;
    PL.x += wx * h; PL.z += wz * h; PL.y += PL.vy * h; PL.g = 0;
    let th = getH(PL.x, PL.z);
    if (PL.y <= th) {
      const run = hypot(PL.x - ox, PL.z - oz);
      if (wasG && th - oy > run * 1.7 + .03) { PL.x = ox; PL.z = oz; th = getH(ox, oz); } // too steep to climb
      if (PL.y < th) PL.y = th; if (PL.vy < 0) PL.vy = 0; PL.g = 1;
    }
    for (let it = 0; it < 5; it++) {
      let moved = 0;
      for (let k = 0; k < 2; k++) {
        const d = collide(PL.x, PL.y + (k ? PCH : PR), PL.z, PR);
        if (d > 0) { PL.x += _wx * d; PL.y += _wy * d; PL.z += _wz * d; moved = 1; if (_wy > .55) { PL.g = 1; if (PL.vy < 0) PL.vy = 0; } else if (_wy < -.5 && PL.vy > 0) PL.vy = 0; }
      }
      if (!moved) break;
    }
    const t2 = getH(PL.x, PL.z); if (PL.y < t2) PL.y = t2;
  }
  if (jump && PL.g) { PL.vy = 24; PL.g = 0; }
}
