// ===== materials / palette =====
const MT = 0, MBK = 1, MLF = 2, MCP = 3, MRK = 4, MCR = 5, MST = 6, MWT = 7, MFL = 8, MMA = 9, MJE = 10, MBM = 11, MEM = 12;
const CY = [.05, .75, .85], TQ = [.04, .5, .42], VI = [.35, .12, .8], MG = [.8, .08, .45], GD = [.95, .6, .15], LV = [.55, .4, .9], PK = [.9, .2, .5];
const A = {};
function barkc(sd) { const k = h2(sd, 77); return k < .4 ? [.05, .045, .075] : k < .75 ? [.032, .055, .065] : [.065, .038, .08]; }
// flat-shaded twisted prism along a path
function prism(P, rf, ns, tw, o) {
  o = o || {}; const n = P.length / 3, R = []; let nx = 1, ny = 0, nz = 0;
  for (let i = 0; i < n; i++) {
    const i0 = max(i - 1, 0) * 3, i1 = min(i + 1, n - 1) * 3;
    let ax = P[i1] - P[i0], ay = P[i1 + 1] - P[i0 + 1], az = P[i1 + 2] - P[i0 + 2]; const l = 1 / (hypot(ax, ay, az) || 1); ax *= l; ay *= l; az *= l;
    if (i == 0 && abs(ax) > .9) { nx = 0; ny = 1; }
    const d = nx * ax + ny * ay + nz * az; nx -= ax * d; ny -= ay * d; nz -= az * d; const ln = 1 / (hypot(nx, ny, nz) || 1); nx *= ln; ny *= ln; nz *= ln;
    const bx = ay * nz - az * ny, by = az * nx - ax * nz, bz = ax * ny - ay * nx, t = i / (n - 1), r = rf(t), ring = [];
    for (let j = 0; j < ns; j++) { const a = j / ns * TAU + tw * t, q = r * (o.m ? o.m(t, j) : 1), c = cos(a), s = sin(a); ring.push(P[i * 3] + (nx * c + bx * s) * q, P[i * 3 + 1] + (ny * c + by * s) * q, P[i * 3 + 2] + (nz * c + bz * s) * q); }
    R.push(ring);
  }
  const us = o.us || 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < ns; j++) {
    const k = (j + 1) % ns * 3, j3 = j * 3, p = R[i], q = R[i + 1], t0 = i / (n - 1) * us, t1 = (i + 1) / (n - 1) * us; if (o.vf) o.vf(t0 / us, j);
    const a = V(p[j3], p[j3 + 1], p[j3 + 2], t0, j / ns), b = V(p[k], p[k + 1], p[k + 2], t0, (j + 1) / ns), c = V(q[j3], q[j3 + 1], q[j3 + 2], t1, j / ns), e = V(q[k], q[k + 1], q[k + 2], t1, (j + 1) / ns);
    T(a, b, c); T(b, e, c);
  }
}
// ===== plant parts =====
function tendril(x, y, z, len, r, sd, q, c, bulb, amp) {
  if (q > 1) return; const n = q ? 5 : 9, P = grow(x, y, z, (h2(sd, 1) - .5) * .25, -1, (h2(sd, 2) - .5) * .25, len, n, -.25, .5, sd % 977);
  const a = amp === undefined ? .035 : amp; cM = MFL; cA = 1; cX = h2(sd, 5);
  tube(P, t => r * (1 - .5 * t), q ? 3 : 4, { vf: t => { colm([c[0] * .25, c[1] * .25, c[2] * .25], c, t, .2 + .7 * t * t); sw(len * a * t * t); }, us: len / 12 });
  if (bulb) { const v0 = nv; col(c[0], c[1], c[2], 1); sw(len * a); blob(q ? 1 : 2, () => 1); scl(v0, 1, 1.6, 1); xf(v0, P[n * 3 - 3], P[n * 3 - 2] - bulb, P[n * 3 - 1], bulb, 0, 1, 0, 0); }
  cS = 0;
}
function fan(x, y, z, ux, uy, uz, R, nl, droop, q, sd, c1, c2, em) {
  const v0 = nv; cM = MLF;
  for (let k = 0; k < nl; k++) {
    const a = k / nl * TAU + h2(sd, k) * .35, L = R * (.7 + .5 * h2(sd, k + 40)), n = [9, 5, 3][q], P = new Float32Array(n * 3), dr = droop * (.7 + .6 * h2(sd, k + 80));
    for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i * 3] = cos(a) * L * t; P[i * 3 + 1] = L * (.3 * t - dr * t * t); P[i * 3 + 2] = sin(a) * L * t; }
    cX = h2(sd, k + 9);
    ribbon(P, t => L * .1 * sin(PI * pow(t, .55)) + L * .004, { fold: q < 2 ? .3 : 0, vf: t => { colm(c1, c2, t, em * (.3 + .7 * t)); cA = .5 + .5 * t; sw(L * .06 * t * t); } });
  }
  cS = 0; xf(v0, x, y, z, 1, ux, uy, uz, 0);
}
function parasol(x, y, z, R, h, q, sd, c1, c2, em) {
  const v0 = nv, m = [13, 7, 4][q], ns = [44, 22, 10][q], prof = [], nsc = 7 + (h2(sd, 1) * 8 | 0); cM = MCP; cX = .5;
  for (let i = 0; i < m; i++) { const t = i / (m - 1), r = R * pow(t, .85); prof.push(r, h * (1 - t * t) - R * .1 * sstep(.8, 1, t)); }
  lathe(prof, ns, { df: (t, a, r, yy) => { const s = 1 + .08 * t * t * cos(a * nsc); _x = r * s; _y = yy + R * .035 * t * cos(a * nsc) + R * .02 * sin(a * 3 + sd) * t; }, vf: t => { colm(c1, c2, t, em); cA = .6 + .4 * t; sw(R * .035 * t * t); } });
  cS = 0; xf(v0, x, y, z, 1, 0, 1, 0, h2(sd, 3) * 6);
}
function chamber(x, y, z, R, q, c, amp, ph) {
  const v0 = nv; cM = MEM; sw(amp || 0); cX = ph || 0; cA = 1; col(c[0], c[1], c[2], 1); blob(q ? 2 : 3, (a, b, d) => 1 + .06 * sin(b * 9)); scl(v0, 1, 1.35, 1);
  if (q < 2) { cM = MBK; col(.05, .045, .07, .15); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, P = new Float32Array(7 * 3); for (let i = 0; i < 7; i++) { const th = i / 6 * PI; P[i * 3] = sin(th) * 1.12 * cos(a); P[i * 3 + 1] = cos(th) * 1.5; P[i * 3 + 2] = sin(th) * 1.12 * sin(a); } tube(P, t => .05 + .06 * sin(t * PI), 4); } }
  xf(v0, x, y, z, R, 0, 1, 0, 0); cS = 0;
}
function trunk(H, R0, sd, q, o) {
  o = o || {}; const n = [30, 14, 7][q], ns = [18, 10, 6][q], a = h2(sd, 1) * TAU, lean = H * (.05 + .1 * h2(sd, 2)), a2 = a + 1.5 + h2(sd, 3) * 2, P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = i / (n - 1), s1 = lean * sin(t * PI * .9), s2 = lean * .5 * sin(t * TAU * .9) * t; P[i * 3] = cos(a) * s1 + cos(a2) * s2; P[i * 3 + 1] = H * t - 7; P[i * 3 + 2] = sin(a) * s1 + sin(a2) * s2; }
  const nr = 3 + (h2(sd, 4) * 4 | 0), rk = 4 + (h2(sd, 5) * 3 | 0), tw = (h2(sd, 6) - .5) * 9, bc = barkc(sd), ve = o.ve || .45; cM = MBK; cX = o.hue === undefined ? h2(sd, 7) * .55 : o.hue; cS = 0;
  tube(P, t => R0 * (.4 + .6 * pow(1 - t, 1.2)) * (1 + .75 * exp(-t * 20)), ns, { m: (t, a) => 1 + (q ? 0 : .09) * cos(rk * a + tw * t) + .9 * exp(-t * 17) * pow(.5 + .5 * cos(nr * a + 1), 3), vf: t => { cA = .4 + .6 * sstep(0, .1, t); col(bc[0], bc[1], bc[2], ve); }, us: H / 30 });
  return P;
}
function roots(R0, H, sd, q, n) {
  const bc = barkc(sd); cM = MBK;
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU + h2(sd, 90 + k), L = R0 * (2.5 + 3.5 * h2(sd, k + 100)), h0 = H * (.03 + .05 * h2(sd, k + 110)), b = a + .5 * (h2(sd, k + 120) - .5);
    const C = [cos(a) * R0 * .5, h0 + R0 * .5, sin(a) * R0 * .5, cos(a) * (R0 + L * .35), h0 * .8 + L * .14, sin(a) * (R0 + L * .35), cos(b) * (R0 + L * .8), L * .1 - 2, sin(b) * (R0 + L * .8), cos(b) * (R0 + L * 1.15), -10, sin(b) * (R0 + L * 1.15)];
    tube(spl(C, q ? 5 : 10), t => R0 * .2 * (1 - .55 * t) + .3, [8, 5, 4][q], { vf: t => { cA = .45 + .4 * sin(t * PI); col(bc[0], bc[1], bc[2], .3); }, us: L / 20 });
  }
}
function limb(B, r0, r1, q, sd, ve) { const bc = barkc(sd); cM = MBK; cS = 0; tube(B, t => mix(r0, r1, pow(t, .8)), [9, 6, 4][q], { vf: () => { cA = .8; col(bc[0], bc[1], bc[2], ve || .35); }, us: 4 }); }
const leafSet = sd => { const k = h2(sd, 55); return k < .5 ? [[.015, .1, .12], [.08, .55, .55]] : k < .8 ? [[.07, .03, .16], [.45, .2, .85]] : [[.14, .02, .1], [.8, .15, .5]]; };
// --- megatree archetypes ---
function treeFan(sd, q) {
  seed(sd); const H = rr(190, 300), R0 = rr(9, 14), P = trunk(H, R0, sd, q); roots(R0, H, sd, q, 5);
  const nb = 4 + (rnd() * 3 | 0), ls = leafSet(sd);
  for (let k = 0; k < nb; k++) {
    at(P, .7 + .29 * k / (nb - 1)); const a = k / nb * TAU + rr(0, 1), len = H * rr(.2, .36);
    const B = grow(_x, _y, _z, cos(a), .55, sin(a), len, [10, 6, 4][q], .8, .5, sd + k * 3.1);
    limb(B, R0 * .3, .5, q, sd);
    const e = B.length - 3, R = rr(34, 58), dr = rr(.25, .5); fan(B[e], B[e + 1], B[e + 2], (B[e] - B[e - 3]) * .3, 1, (B[e + 2] - B[e - 1]) * .3, R, 13, dr, q, sd + k, ls[0], ls[1], .45);
    for (let j = 0; j < 5; j++) { const b = rnd() * TAU, d = R * rr(.3, .8), ln = rr(18, 75), on = q == 0 || j % 2 == 0; if (on) tendril(B[e] + cos(b) * d, B[e + 1] + d * (.3 - dr * d / R) * .8, B[e + 2] + sin(b) * d, ln, .22, sd * 31 + k * 17 + j, q, CY, j % 3 == 0 ? .9 : 0); }
  }
}
function treePar(sd, q) {
  seed(sd); const H = rr(170, 260), R0 = rr(8, 12), P = trunk(H, R0, sd, q); roots(R0, H, sd, q, 6);
  const nt = 2 + (rnd() * 3 | 0), ls = leafSet(sd + 3);
  for (let k = 0; k < nt; k++) {
    at(P, .999 - .19 * k); const R = H * rr(.2, .32) * (1 - .12 * k), hh = R * rr(.2, .34), px = _x, py = _y, pz = _z;
    parasol(px, py - hh * .2, pz, R, hh, q, sd + k, ls[0], ls[1], .5);
    for (let j = 0; j < 8; j++) { const b = j / 8 * TAU + rnd(), d = R * rr(.75, .98), ln = rr(14, 70), on = q == 0 || j % 2 == 0; if (on) tendril(px + cos(b) * d, py - hh * .25 - R * .08, pz + sin(b) * d, ln, .2, sd * 13 + k * 29 + j, q, k % 2 ? LV : CY, j % 2 ? .8 : 0); }
  }
}
function treeRib(sd, q) {
  seed(sd); const H = rr(150, 220), Rc = rr(11, 17), nrib = 5 + (rnd() * 3 | 0), tw = rr(-2.4, 2.4), bc = barkc(sd), n = [26, 12, 6][q], ls = leafSet(sd + 1);
  const rad = t => Rc * (1 + .9 * exp(-t * 7)) * (1 - .6 * sstep(.5, 1, t)) + Rc * .2 * sin(t * PI);
  cM = MBK; cX = h2(sd, 7) * .5;
  for (let k = 0; k < nrib; k++) {
    const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = i / (n - 1), a = k / nrib * TAU + tw * t; P[i * 3] = cos(a) * rad(t); P[i * 3 + 1] = H * t - 7; P[i * 3 + 2] = sin(a) * rad(t); }
    tube(P, t => Rc * .21 * (1 + .9 * exp(-t * 9)) * (1 - .3 * t), [9, 6, 4][q], { vf: t => { cA = .45 + .55 * sstep(0, .1, t); col(bc[0], bc[1], bc[2], .6); }, us: H / 30 });
  }
  if (q < 2) for (let lv = 1; lv < 6; lv++) { const t = lv / 6.3, m = nrib * 3 + 1, P = new Float32Array(m * 3); for (let i = 0; i < m; i++) { const a = i / (m - 1) * TAU + tw * t; P[i * 3] = cos(a) * rad(t); P[i * 3 + 1] = H * t - 7 + 2 * sin(a * 3); P[i * 3 + 2] = sin(a) * rad(t); } tube(P, () => Rc * .08, 5, { vf: () => col(bc[0], bc[1], bc[2], .4) }); }
  chamber(0, H * .42, 0, Rc * .42, q, CY); chamber(0, H * .18, 0, Rc * .3, q, LV);
  const nb = 5 + (rnd() * 3 | 0);
  for (let k = 0; k < nb; k++) {
    const a = k / nb * TAU + rnd(), len = H * rr(.22, .4), B = grow(cos(a) * Rc * .4, H - 9, sin(a) * Rc * .4, cos(a), .9, sin(a), len, [9, 5, 4][q], -.9, .4, sd + k * 1.7);
    limb(B, Rc * .2, .4, q, sd, .5); const e = B.length - 3;
    fan(B[e], B[e + 1], B[e + 2], 0, 1, 0, rr(24, 40), 11, rr(.3, .55), q, sd + k, ls[0], ls[1], .5);
    for (let j = 0; j < 5; j++) { const ln = rr(20, 60), u = rr(.4, 1); at(B, u); if (q == 0 || j % 2 == 0) tendril(_x, _y - 1, _z, ln, .2, sd * 7 + k * 11 + j, q, CY, .8); }
  }
  chamber(0, H + 6, 0, Rc * .5, q, ls[1]);
}
function treeArch(sd, q) {
  seed(sd); const span = rr(120, 190), Hh = rr(85, 140), R0 = rr(8, 12), a = rnd() * TAU, n = [30, 14, 7][q], P = new Float32Array(n * 3), bc = barkc(sd), ls = leafSet(sd + 2); ARCH[sd] = [cos(a) * span, sin(a) * span];
  for (let i = 0; i < n; i++) { const t = i / (n - 1), s = t * span, w = sin(t * TAU) * span * .08; P[i * 3] = cos(a) * s - sin(a) * w; P[i * 3 + 1] = Hh * pow(sin(PI * t), .75) - 7; P[i * 3 + 2] = sin(a) * s + cos(a) * w; }
  cM = MBK; cX = h2(sd, 7) * .5; const nr = 3 + (rnd() * 3 | 0);
  tube(P, t => R0 * (.42 + .58 * pow(abs(1 - 2 * t), 1.4)) * (1 + 1.2 * exp(-min(t, 1 - t) * 26)), [18, 10, 6][q], { m: (t, b) => 1 + (q ? 0 : .08) * cos(5 * b + t * 9) + 1.1 * exp(-min(t, 1 - t) * 24) * pow(.5 + .5 * cos(nr * b + 1), 3), vf: t => { cA = .4 + .6 * sstep(0, .08, min(t, 1 - t)); col(bc[0], bc[1], bc[2], .55); }, us: span / 20 });
  for (let k = 0; k < 5; k++) { at(P, .22 + .14 * k); const b = rnd() * TAU, B = grow(_x, _y, _z, cos(b) * .5, 1, sin(b) * .5, rr(25, 55), [7, 4, 3][q], .3, .5, sd + k); limb(B, R0 * .22, .4, q, sd); const e = B.length - 3; fan(B[e], B[e + 1], B[e + 2], 0, 1, 0, rr(22, 36), 11, rr(.3, .5), q, sd + k, ls[0], ls[1], .45); }
  for (let j = 0; j < 12; j++) { at(P, rr(.12, .88)); const ln = rr(25, 85), on = q == 0 || j % 2 == 0; if (on) tendril(_x + rr(-3, 3), _y - R0 * .4, _z + rr(-3, 3), ln, .22, sd * 3 + j, q, j % 4 == 0 ? LV : CY, j % 2 ? 1 : 0); }
  for (let j = 0; j < 9; j++) { at(P, rr(.06, .94)); const b = rnd() * TAU, len = rr(6, 16), hue = rnd(), e = rr(.5, 1), sdd = sd * 5 + j; if (q < 2) { const v0 = nv; cM = MCR; cX = hue; col(1, 1, 1, e); crystal(len, len * .13, 6, sdd); xf(v0, _x, _y, _z, 1, cos(b), .35, sin(b), 0); } }
}
function coralLimbs(x, y, z, dx, dy, dz, len, r, lev, sd, q, ls) {
  const B = grow(x, y, z, dx, dy, dz, len, [8, 5, 3][q], .7, .6, sd % 911); limb(B, r, r * .5, min(2, q + (lev < 1 ? 1 : 0)), sd);
  if (lev > 0) { for (let k = 0; k < 3; k++) { at(B, .5 + .24 * k); const a = h2(sd, k) * TAU, px = _x, py = _y, pz = _z; coralLimbs(px, py, pz, _dx * .5 + cos(a) * .8, _dy * .5 + .45, _dz * .5 + sin(a) * .8, len * .64, r * .5, lev - 1, sd * 7 + k + 1, q, ls); } }
  else {
    const e = B.length - 3;
    if (q < 2 || h2(sd, 5) < .5) parasol(B[e], B[e + 1], B[e + 2], len * .55, len * .16, min(2, q + 1), sd, ls[0], ls[1], .6);
    if (q < 2) for (let j = 0; j < 2; j++) tendril(B[e] + (h2(sd, j + 20) - .5) * len * .6, B[e + 1] - 1, B[e + 2] + (h2(sd, j + 30) - .5) * len * .6, 15 + 50 * h2(sd, j + 40), .2, sd * 3 + j, q, CY, .8);
  }
}
function treeCoral(sd, q) {
  seed(sd); const H = rr(150, 230), R0 = rr(9, 13), P = trunk(H, R0, sd, q); roots(R0, H, sd, q, 5);
  const ls = leafSet(sd + 4), e = P.length - 3;
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + rnd(); coralLimbs(P[e], P[e + 1] - 4, P[e + 2], cos(a), .6, sin(a), H * rr(.2, .3), R0 * .3, 2, sd * 11 + k, q, ls); }
}
// --- giant fungi ---
function cap(x, y, z, R, hh, stemR, q, sd, ct, cg, tilt) {
  const v0 = nv, m = [13, 6, 4][q], ns = [60, 20, 10][q], prof = [], uu = []; cM = MCP; cS = 0;
  for (let i = 0; i <= m; i++) { const t = i / m; prof.push(R * pow(sin(t * PI / 2), .8), hh * pow(cos(t * PI / 2), 1.3)); uu.push(t * .98); }
  prof.push(R * 1.0, -R * .05); uu.push(1);
  for (let i = 1; i <= m; i++) { const t = i / m, r = mix(R * .97, stemR, t); prof.push(r, -R * .04 + hh * .3 * pow(t, 1.5)); uu.push(1 + (1 - t)); }
  const M2 = prof.length / 2;
  lathe(prof, ns, { df: (t, a, r, yy) => { const k = r / R; _x = r * (1 + .05 * k * cos(a * 5 + sd) + .03 * k * cos(a * 11)); _y = yy + R * .05 * k * sin(a * 3 + sd * 2); }, vf: (t) => { const i = Math.round(t * (M2 - 1)), u = uu[i]; if (u <= 1) { cX = 0; colm(ct[0], ct[1], u, .8); cA = 1; } else { cX = 1; col(cg[0], cg[1], cg[2], 1); cA = .5 + .5 * (u - 1); } }, uf: t => { const u = uu[Math.round(t * (M2 - 1))]; return u <= 1 ? u : u - 1; } });
  // sink the cap so the ring where the gills end lies inside the stem top (x,y,z is the stem end)
  const tx = tilt ? tilt[0] : 0, tz = tilt ? tilt[1] : 0, l = 1 / hypot(tx, 1, tz), dn = (hh * .3 - R * .04 + stemR) * l;
  xf(v0, x - tx * dn, y - dn, z - tz * dn, 1, tx, 1, tz, sd);
}
function fungus(sd, q, H, R, tiers, sat) {
  const a = h2(sd, 1) * TAU, lean = H * .16, n = [10, 6, 4][q], P = new Float32Array(n * 3), sr = R * (.12 + .06 * h2(sd, 2));
  for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i * 3] = cos(a) * lean * t * t; P[i * 3 + 1] = H * t - H * .04; P[i * 3 + 2] = sin(a) * lean * t * t; }
  const k = h2(sd, 3), ct = k < .4 ? [[.1, .03, .22], [.4, .1, .6]] : k < .7 ? [[.03, .1, .16], [.1, .45, .55]] : [[.2, .02, .12], [.75, .12, .4]], cg = k < .4 ? CY : k < .7 ? LV : [.2, .9, .8];
  cM = MBK; cX = .7; cS = 0;
  const sv = t => { cA = .45 + .55 * t; col(.1, .08, .14, .25); };
  tube(P, t => sr * (1 + .9 * exp(-t * 8)) * (.75 + .25 * (1 - t)) * (1 + .12 * sin(t * 17 + sd)) * (1 + .75 * sstep(.78, 1, t)), [12, 7, 5][q], { m: (t, b) => 1 + .08 * cos(4 * b + t * 6), vf: sv, us: H / 12 });
  at(P, 1); cap(P[n * 3 - 3], P[n * 3 - 2], P[n * 3 - 1], R, R * (.3 + .25 * h2(sd, 12)), sr * .7, q, sd, ct, cg, [_dx * .5, _dz * .5]);
  // side caps grow on their own branch stems
  for (let i = 1; i < tiers; i++) {
    at(P, .86 - i * .2); const rr2 = R * (.62 - i * .12) * (.8 + .3 * h2(sd, i + 5)), b = h2(sd, i + 9) * TAU, off = rr2 * .8 + sr * 1.6, up = rr2 * .45, cb = cos(b), sb = sin(b), br = sr * .34;
    const B = spl([_x, _y, _z, _x + cb * off * .6, _y + up * .1, _z + sb * off * .6, _x + cb * off, _y + up * .55, _z + sb * off, _x + cb * off, _y + up, _z + sb * off], [9, 6, 4][q]);
    cM = MBK; cX = .7; cS = 0; tube(B, t => br * (1.25 - .45 * t) * (1 + .8 * sstep(.75, 1, t)), [8, 6, 4][q], { vf: sv, us: 2 });
    cap(_x + cb * off, _y + up, _z + sb * off, rr2, rr2 * (.3 + .25 * h2(sd, i + 12)), br * .7, q, sd + i * 3.3, ct, cg, [cb * .15, sb * .15]);
  }
  if (sat && q < 2) for (let i = 0; i < sat; i++) { const b = h2(sd, i + 30) * TAU, d = sr * 2 + R * (.3 + .7 * h2(sd, i + 40)), s = .1 + .16 * h2(sd, i + 50), v0 = nv; fungus(sd * 3 + i + 1, 2 - (q ? 0 : 1), H * s * 1.6, R * s * 1.5, 1, 0); for (let j = v0; j < nv; j++) { vf[j * 8] += cos(b) * d; vf[j * 8 + 2] += sin(b) * d; } }
}
// ===== small flora (d=0 tile detail, d=1 large detail). unit ~1m =====
function fGrass(d) {
  const nb = d ? 12 : 7; cM = MFL;
  for (let k = 0; k < nb; k++) {
    const a = rnd() * TAU, L = rr(.5, 1.15), lean = rr(.15, .7), n = d ? 6 : 4, P = new Float32Array(n * 3), ox = cos(a) * rr(0, .14), oz = sin(a) * rr(0, .14); cX = rnd();
    for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i * 3] = ox + cos(a) * lean * L * t * t; P[i * 3 + 1] = L * t * (1 - .3 * lean * t); P[i * 3 + 2] = oz + sin(a) * lean * L * t * t; }
    ribbon(P, t => .024 * (1 - t * .9) + .003, { n: [cos(a), 0, sin(a)], vf: t => { colm([.08, .012, .08], [.6, .08, .38], t, .05 + .3 * t * t * t); cA = .3 + .7 * t; sw(.22 * L * t * t); } });
  }
}
function fCurl(d) {
  const nb = d ? 7 : 5; cM = MLF;
  for (let k = 0; k < nb; k++) {
    const a = k / nb * TAU + rnd(), L = rr(.8, 1.4), n = d ? 13 : 8, P = new Float32Array(n * 3), curl = rr(2.6, 4.2), th0 = rr(1., 1.35); let x = 0, y = 0, th = th0; cX = rnd();
    for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i * 3] = cos(a) * x; P[i * 3 + 1] = y; P[i * 3 + 2] = sin(a) * x; th = th0 - curl * t * t; x += cos(th) * L / (n - 1); y += sin(th) * L / (n - 1); }
    ribbon(P, t => L * .2 * sin(PI * pow(t, .6)) * (1 - .4 * t) + .01, { fold: .35, n: [cos(a), .4, sin(a)], vf: t => { colm([.07, .02, .16], [.4, .1, .7], t, .12 + .3 * t); cA = .35 + .65 * t; sw(.1 * L * t * t); } });
  }
}
function fFern(d) {
  const nb = d ? 13 : 8, a = rnd() * TAU; cM = MLF; const tiltb = rr(.2, .6);
  for (let k = 0; k < nb; k++) {
    const be = (k / (nb - 1) - .5) * 2.3, L = rr(.9, 1.4) * (1 - .25 * abs(be)), n = d ? 7 : 4, P = new Float32Array(n * 3); cX = rnd();
    const dx = sin(be), dy = cos(be); // in fan plane (side, up)
    for (let i = 0; i < n; i++) { const t = i / (n - 1), s = dx * L * t, u = dy * L * t - .25 * L * t * t * abs(dx), back = tiltb * u + .2 * L * t * t; P[i * 3] = cos(a) * s - sin(a) * back; P[i * 3 + 1] = u; P[i * 3 + 2] = sin(a) * s + cos(a) * back; }
    ribbon(P, t => L * .075 * sin(PI * pow(t, .5)) + .006, { fold: d ? .3 : 0, n: [-sin(a), .3, cos(a)], vf: t => { colm([.2, .02, .07], [.95, .22, .45], t, .1 + .35 * t); cA = .4 + .6 * t; sw(.1 * L * t * t); } });
  }
}
function fSpiral(d) {
  const Hh = rr(1.1, 1.6), n = d ? 9 : 5, P = grow(0, -.05, 0, .1, 1, .05, Hh, n, 0, .5, rnd() * 50); cM = MFL; cX = rnd();
  tube(P, t => .035 * (1 - .5 * t), d ? 6 : 4, { vf: t => { colm([.06, .02, .1], [.3, .1, .5], t, .1); cA = .4 + .6 * t; sw(.15 * t * t); } });
  const np = d ? 18 : 10; cM = MLF;
  for (let k = 0; k < np; k++) {
    const t = .35 + .62 * k / np; at(P, t); const a = k * 2.4, L = .5 * (1.15 - t) + .12, Q = new Float32Array(9);
    Q[0] = _x; Q[1] = _y; Q[2] = _z; Q[3] = _x + cos(a) * L * .55; Q[4] = _y + L * .25; Q[5] = _z + sin(a) * L * .55; Q[6] = _x + cos(a) * L; Q[7] = _y + L * .1; Q[8] = _z + sin(a) * L;
    ribbon(Q, u => L * .26 * sin(PI * pow(u, .6)) + .005, { vf: u => { colm([.3, .05, .5], [.2, .8, .9], u, .35 + .5 * u); cA = 1; sw(.15 * t * t + .03 * u); } });
  }
  const e = P.length - 3, v0 = nv; cM = MFL; col(.2, .7, .8, .6); sw(.15); blob(2, () => 1); xf(v0, P[e], P[e + 1], P[e + 2], .09, 0, 1, 0, 0);
}
function fMoss() { cM = MFL; cX = rnd(); const s = rnd() * 9; blob(2, (x, y, z) => { const r = .3 + .25 * vn3(x * 2 + s, y * 2, z * 2); cA = .4 + .6 * max(y, 0); col(.02, .1 + .12 * y, .1 + .1 * y, .05 + .3 * max(y, 0) * vn3(x * 5 + s, y * 5, z * 5)); return r; }); scl(mb, 1, .3, 1); }
function fCoralL(x, y, z, dx, dy, dz, len, r, lev, d) {
  const B = grow(x, y, z, dx, dy, dz, len, d ? 5 : 3, .4, .8, rnd() * 99); cM = MFL;
  tube(B, t => r * (1 - .4 * t), d ? 5 : 3, { vf: t => { const g = lev == 0 ? t : 0; colm([.3, .03, .18], [1, .35, .6], g, .1 + .8 * g * g); cA = .5 + .5 * (lev ? .4 : 1); } });
  if (lev > 0) for (let k = 0; k < (d ? 3 : 2); k++) { at(B, rr(.45, .95)); const a = rnd() * TAU; fCoralL(_x, _y, _z, _dx * .5 + cos(a) * .7, _dy * .5 + .5, _dz * .5 + sin(a) * .7, len * .65, r * .6, lev - 1, d); }
}
function fCoral(d) { cX = rnd(); for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + rnd(); fCoralL(0, -.05, 0, cos(a) * .5, 1, sin(a) * .5, rr(.35, .55), .045, d ? 3 : 2, d); } }
function fBulb(d) {
  const nb = d ? 6 : 4;
  for (let k = 0; k < nb; k++) {
    const a = k / nb * TAU + rnd(), L = rr(.3, .9), P = grow(0, -.05, 0, cos(a) * .5, 1, sin(a) * .5, L, d ? 5 : 3, .3, .3, rnd() * 50); cM = MFL; cX = rnd();
    tube(P, t => .04, d ? 5 : 3, { vf: t => { col(.08, .03, .14, .05); cA = .4 + .6 * t; sw(.12 * L * t * t); } });
    const e = P.length - 3, v0 = nv, r = rr(.13, .26); sw(.12 * L);
    blob(2, (x, y, z) => { colm([.08, .025, .16], [.08, .5, .6], sstep(-.2, .9, y), .02 + .45 * sstep(.4, 1, y)); cA = .6 + .4 * y; return 1 + .25 * max(y, 0); });
    xf(v0, P[e], P[e + 1] + r * .7, P[e + 2], r, P[e] - P[e - 3], P[e + 1] - P[e - 2], P[e + 2] - P[e - 1], 0);
  }
  cS = 0;
}
function fFrond(d) {
  const nb = d ? 4 : 2; cM = MLF;
  for (let k = 0; k < nb; k++) {
    const a = rnd() * TAU, L = rr(1.6, 2.6), n = d ? 12 : 6, P = new Float32Array(n * 3), bend = rr(.5, 1.1); cX = rnd();
    for (let i = 0; i < n; i++) { const t = i / (n - 1), s = L * (.25 * t + bend * .6 * t * t); P[i * 3] = cos(a) * s; P[i * 3 + 1] = L * (t - .45 * bend * t * t * t); P[i * 3 + 2] = sin(a) * s; }
    ribbon(P, t => L * .11 * sin(PI * pow(t, .7)) + .008, { fold: .4, n: [cos(a), .2, sin(a)], vf: t => { colm([.12, .07, .3], [.2, .55, .6], t, .1 + .3 * t); cA = .45 + .55 * t; sw(.14 * L * t * t); } });
  }
}
function fStar(d) {
  const Hh = rr(.5, 1), P = grow(0, -.05, 0, rr(-.2, .2), 1, rr(-.2, .2), Hh, 4, 0, .4, rnd() * 50); cM = MFL; cX = rnd();
  tube(P, () => .02, 3, { vf: t => { col(.1, .04, .12, .05); cA = .5 + .5 * t; sw(.2 * t * t); } });
  const e = P.length - 3, v0 = nv; sw(.2); cM = MLF;
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, Q = new Float32Array([0, 0, 0, cos(a) * .12, .05, sin(a) * .12, cos(a) * .24, .02, sin(a) * .24]); ribbon(Q, u => .06 * sin(PI * pow(u, .6)) + .003, { vf: u => { colm([.7, .3, .1], [1, .8, .35], u, .9); cA = 1; } }); }
  cM = MFL; col(1, .7, .3, .6); blob(2, () => .04);
  xf(v0, P[e], P[e + 1], P[e + 2], 1, 0, 1, 0, 0); cS = 0;
}
// ===== rocks / crystals =====
function rock(sd, lv, sx, sy, sz) {
  cM = MRK; col(1, 1, 1, 0); cX = h2(sd, 1); const v0 = nv, k = sd * 7.31;
  blob(lv, (x, y, z) => { const n = fbm3(x * 1.3 + k, y * 1.3, z * 1.3, 3), r2 = abs(vn3(x * 2.6 + k, y * 2.6 + 3, z * 2.6) - .5); cA = .55 + .45 * sstep(-.6, .5, y); return .62 + .7 * n + .3 * r2; });
  scl(v0, sx, sy, sz);
}
function cluster(sd, nc, spread, q, emi) {
  seed(sd); cM = MCR;
  for (let k = 0; k < nc; k++) {
    const a = rnd() * TAU, tl = pow(rnd(), .7) * spread, len = rr(.4, 1) * (1 - .45 * tl / (spread + .01)), rad = len * rr(.07, .14), sides = 5 + (rnd() * 3 | 0), hue = rnd(), e = rr(.35, 1) * (emi || 1), yw = rnd() * 6, off = rr(.1, .3);
    if (q && k > nc * .55) continue;
    const v0 = nv; cX = hue; col(1, 1, 1, e); crystal(len, rad, sides, sd * 13 + k);
    xf(v0, cos(a) * tl * off, -.06, sin(a) * tl * off, 1, sin(tl) * cos(a), cos(tl), sin(tl) * sin(a), yw);
  }
}
// ===== creatures =====
function manta() {
  cM = MMA; cS = 0; cA = 1; cX = 0; const NS = 28, NC = 9, base = nv;
  for (let side = 0; side < 2; side++) for (let i = 0; i <= NS; i++) {
    const s = i / NS * 2 - 1, as = abs(s), ch = 7.5 * pow(1 - pow(as, 1.6), .65) + .25, le = -pow(as, 1.25) * 5.5 + 3.2;
    for (let j = 0; j <= NC; j++) {
      const c = j / NC, th = (side ? -.45 : 1) * 1.5 * pow(1 - as, 2.2) * pow(sin(PI * pow(c, .7)), .8) + (side ? 0 : .03);
      colm([.02, .03, .07], [.05, .1, .2], as, .3 + .7 * as); V(s * 13, th, -(le - c * ch), s, c);
    }
  }
  for (let side = 0; side < 2; side++) for (let i = 0; i < NS; i++) for (let j = 0; j < NC; j++) { const a = base + side * (NS + 1) * (NC + 1) + i * (NC + 1) + j, c = a + NC + 1; if (side) { T(a, c, a + 1); T(a + 1, c, c + 1); } else { T(a, a + 1, c); T(a + 1, c + 1, c); } }
  // tail filaments
  for (let k = 0; k < 3; k++) {
    const n = 12, P = new Float32Array(n * 3), L = k == 1 ? 34 : 20, x0 = (k - 1) * 1.6; const b0 = nv;
    for (let i = 0; i < n; i++) { P[i * 3] = x0 * (1 + i / n); P[i * 3 + 1] = 0; P[i * 3 + 2] = 3.5 + L * i / (n - 1); }
    ribbon(P, t => .5 * (1 - t) + .06, { vf: t => colm([.05, .2, .3], [.2, .9, 1], t, .6 + .4 * t) });
    for (let i = b0; i < nv; i++) { vf[i * 8 + 5] = 0; vf[i * 8 + 6] = 1 + (vf[i * 8 + 2] - 3.5) / 34; }
  }
  // head lobes
  for (let k = 0; k < 2; k++) { const P = new Float32Array([(k ? 1 : -1) * 1.5, .2, -3, (k ? 1 : -1) * 2.2, .1, -5.5, (k ? 1 : -1) * 1.6, -.5, -7]), b0 = nv; ribbon(P, t => .7 * (1 - t) + .1, { vf: t => colm([.03, .06, .12], [.1, .5, .6], t, .5) }); for (let i = b0; i < nv; i++) { vf[i * 8 + 5] = 0; vf[i * 8 + 6] = .1; } }
}
function jelly() {
  cM = MJE; cS = 0; const prof = [], m = 9; for (let i = 0; i <= m; i++) { const t = i / m; prof.push(sin(t * PI * .55) * 1.05, cos(t * PI * .55) * .9); }
  col(1, 1, 1, 1); lathe(prof, 30, { df: (t, a, r, y) => { _x = r * (1 + .06 * t * cos(a * 8)); _y = y; } });
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, L = 2.5 + 2.5 * h2(k, 3), n = 7, P = new Float32Array(n * 3), b0 = nv; for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i * 3] = cos(a) * (.6 - .2 * t); P[i * 3 + 1] = .1 - L * t; P[i * 3 + 2] = sin(a) * (.6 - .2 * t); } ribbon(P, t => .1 * (1 - t) + .02, { n: [cos(a), 0, sin(a)] }); for (let i = b0; i < nv; i++) vf[i * 8 + 5] = 1 + (.1 - vf[i * 8 + 1]) / 5; }
}
// ===== asset library =====
const ARCH = {}, TREES = [], FUNGI = [], ROCKS = [], CLUST = [], MID = [], FLORA = [];
function buildAssets() {
  const gl = (id, c, r) => { for (let m = id; m >= 0; m = M.ln[m]) M.gl[m] = [c[0], c[1], c[2], r]; return id; };
  const TG = [treeFan, treePar, treeRib, treeArch, treeCoral];
  for (let t = 0; t < 5; t++) for (let v = 0; v < (t == 3 ? 2 : 3); v++) { const sd = 101 + t * 37 + v * 11; TREES.push({ id: gl(lods(q => TG[t](sd, q), 1, 380, 950, 0), leafSet(sd + (t == 0 ? 0 : t == 1 ? 3 : t == 2 ? 1 : t == 3 ? 2 : 4))[1], 85), type: t, ar: ARCH[sd] }); }
  for (let v = 0; v < 6; v++) { const sd = 300 + v * 7, H = 22 + 30 * h2(sd, 60), R = 14 + 22 * h2(sd, 61); FUNGI.push(gl(lods(q => fungus(sd, q, H, R, 1 + (v % 3), 5), 0, 220, 600, 0), h2(sd, 3) < .4 ? CY : h2(sd, 3) < .7 ? LV : TQ, 45)); }
  const RS = [[1, 1, 1], [1.7, .55, 1.2], [.7, 1.9, .7], [1.3, .8, 2], [1, 1.3, .8], [2.2, .4, 1.6], [.8, 2.6, .9], [1.5, 1, 1]];
  for (let v = 0; v < 8; v++) ROCKS.push(lods(q => rock(v + 1, q ? 2 : 4 - (v > 5 ? 0 : 1), RS[v][0], RS[v][1], RS[v][2]), 0, 160, 0, 0));
  for (let v = 0; v < 6; v++) CLUST.push(gl(lods(q => cluster(500 + v, v == 5 ? 6 : 9 + v * 3, v == 5 ? .25 : .5 + .12 * v, q, 1), 0, 150, 0, 0), [LV, TQ, PK, LV, CY, LV][v], 5));
  // mid-scale flora (detailed + far LOD)
  const FG2 = [fCurl, fFern, fSpiral, fCoral, fBulb, fFrond];
  for (let v = 0; v < 6; v++) for (let w = 0; w < 2; w++) MID.push(lods(q => { seed(700 + v * 9 + w); FG2[v](q ? 0 : 1); }, 1, 16, 0, 60));
  // tile flora: [gen, count per tile, min scale, max scale]
  const FT = [[fGrass, 10000, .7, 1.7], [fGrass, 4000, 1.2, 2.6], [fCurl, 1500, .6, 1.8], [fCurl, 900, .9, 2.4], [fFern, 1500, .6, 1.7], [fSpiral, 420, .7, 1.8], [fMoss, 1300, .5, 2.], [fCoral, 520, .7, 2], [fBulb, 450, .6, 1.6], [fFrond, 800, .6, 1.6], [fStar, 900, .6, 1.4]];
  FT.forEach((f, i) => { seed(800 + i); begin(); f[0](0); FLORA.push({ id: end(1, 0), n: f[1], s0: f[2], s1: f[3], k: i }); });
  begin(); manta(); A.manta = end(1, 0);
  begin(); jelly(); A.jelly = end(2, 500);
  begin(); cM = MST; col(1, 1, 1, .2); crystal(.3, 1, 6, 4, { sh: .88, tip: .15, taper: 1.04 }); A.slab = end(0, 500);
  // floating boulders with roots
  A.fb = []; for (let v = 0; v < 3; v++) { seed(950 + v); begin(); rock(20 + v, 3, 1, .8 + .4 * v, 1); for (let j = 0; j < 9; j++) { const a = rnd() * TAU, d = rr(0, .6); tendril(cos(a) * d, -.45, sin(a) * d, rr(1.2, 4.5), .035, 950 + v * 31 + j, 0, j % 3 ? [.1, .09, .14] : CY, j % 3 ? 0 : .09, .02); } A.fb.push(end(0, 0)); }
  // vine curtain
  A.vine = lods(q => { seed(990); for (let j = 0; j < 12; j++) { const x = rr(-9, 9), ln = rr(12, 42); tendril(x, 0, rr(-1.5, 1.5), ln, .16, 990 + j, q, j % 4 == 0 ? LV : CY, j % 3 == 0 ? .7 : 0); } }, 1, 200, 0, 700);
}
