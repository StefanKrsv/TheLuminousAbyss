// ===== props (instances) =====
const MAXP = 100000, PB = new ArrayBuffer(MAXP * 40), pf = new Float32Array(PB), pu = new Uint8Array(PB), pw = new Uint32Array(PB);
const pM = new Int32Array(MAXP), pC = new Float32Array(MAXP * 4), pS = new Float32Array(MAXP); let np = 0;
function pcen(i) {
  const o = i * 10, m = pM[i], s = pf[o + 3], x = M.cx[m] * s, y = M.cy[m] * s, z = M.cz[m] * s, qx = pf[o + 4], qy = pf[o + 5], qz = pf[o + 6], qw = pf[o + 7];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  pC[i * 4] = pf[o] + x + qw * tx + qy * tz - qz * ty; pC[i * 4 + 1] = pf[o + 1] + y + qw * ty + qz * tx - qx * tz; pC[i * 4 + 2] = pf[o + 2] + z + qw * tz + qx * ty - qy * tx; pC[i * 4 + 3] = M.r[m] * s;
}
function propQ(m, x, y, z, s, tr, tg, tb, ta, ph, fl) {
  const o = np * 10, b = np * 40; pf[o] = x; pf[o + 1] = y; pf[o + 2] = z; pf[o + 3] = s; pf[o + 4] = _q[0]; pf[o + 5] = _q[1]; pf[o + 6] = _q[2]; pf[o + 7] = _q[3];
  pu[b + 32] = c8(tr * .5); pu[b + 33] = c8(tg * .5); pu[b + 34] = c8(tb * .5); pu[b + 35] = c8(ta * .5); pu[b + 36] = c8(ph || 0); pu[b + 37] = 0; pu[b + 38] = min(255, M.mx[m] * s / 8); pu[b + 39] = fl || 0;
  pM[np] = m; pS[np] = s; pcen(np); if (np >= MAXP - 1) throw 'prop overflow'; return np++;
}
function prop(m, x, y, z, s, yaw, tilt, td, tr, tg, tb, ta, ph, fl) { qyt(yaw || 0, tilt || 0, td || 0); return propQ(m, x, y, z, s, tr === undefined ? 1 : tr, tg === undefined ? 1 : tg, tb === undefined ? 1 : tb, ta === undefined ? 1 : ta, ph, fl); }
const uniq = (m, x, y, z) => prop(m, x, y, z, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0);
const LIGHTS = [];
const dist2 = (x, z, p) => hypot(x - p[0], z - p[1]);

// ===== scripted tour: [t, px,py,pz, lx,ly,lz] =====
const TOUR = [
  0, -497, 9, -22, -500, 120, -285,
  4, -492, 14, -92, -470, 90, -270,
  7.5, -440, 20, -138, -300, 10, -200,
  10.5, -335, 16, -178, -200, -40, -245,
  13, -238, -8, -224, -110, -70, -300,
  16, -75, -62, -322, 40, -62, -366,
  18.5, 60, -66, -366, 200, -55, -385,
  20.5, 190, -50, -384, 330, -20, -410,
  22.5, 372, 6, -418, 560, 30, -430,
  24, 472, 6, -430, 590, 36, -430,
  25.5, 524, 12, -476, 590, 40, -430,
  27, 617, 22, -505, 590, 46, -430,
  28.3, 669, 36, -416, 590, 52, -430,
  29.4, 617, 52, -355, 585, 80, -410,
  30.6, 572, 66, -312, 480, 150, 60,
  33, 505, 120, -60, 400, 240, 320,
  35.5, 480, 195, 170, 400, 235, 320,
  37.5, 535, 262, 300, 400, 220, 330,
  39.2, 455, 300, 425, 380, 200, 300,
  41, 290, 300, 480, -100, 120, 580,
  43.5, -40, 190, 520, -250, 95, 678,
  45.5, -185, 112, 575, -250, 90, 678,
  47.2, -250, 90, 678, -262, 60, 800,
  48.6, -272, 84, 762, -420, 60, 760,
  50.2, -385, 112, 715, -250, 70, 600,
  52.5, -475, 190, 590, -150, 150, 450,
  56, -535, 360, 440, 0, 260, 130,
  60, -560, 480, 330, 60, 170, 20];
const NTW = TOUR.length / 7, _tp = new Float32Array(6);
function tourAt(t) {
  t = clamp(t, 0, 59.999); let k = 0; while (k < NTW - 2 && TOUR[(k + 1) * 7] <= t) k++;
  const a = k * 7, b = a + 7, p = max(k - 1, 0) * 7, n = min(k + 2, NTW - 1) * 7, dt = TOUR[b] - TOUR[a], u = (t - TOUR[a]) / dt, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let e = 1; e < 7; e++) {
    const m0 = (TOUR[b + e] - TOUR[p + e]) / (TOUR[b] - TOUR[p]) * dt, m1 = (TOUR[n + e] - TOUR[a + e]) / (TOUR[n] - TOUR[a]) * dt;
    _tp[e - 1] = h00 * TOUR[a + e] + h10 * m0 + h01 * TOUR[b + e] + h11 * m1;
  }
}
const TPS = new Float32Array(241 * 3);
function pathClear(x, y, z, r) { for (let i = 0; i < 241; i++) { const dx = TPS[i * 3] - x, dz = TPS[i * 3 + 2] - z; if (dx * dx + dz * dz < r * r && (y === null || abs(TPS[i * 3 + 1] - y) < r)) return false; } return true; }
// fixed review poses: pos + look
const SHOTS = [[-497, 9, -22, -500, 120, -285], [-458, 7.5, -66, -425, 1, -92], [-20, -58, -338, 110, -64, -372], [476, 10, -424, 592, 62, -430], [285, 262, 455, 425, 205, 300], [-150, 108, 560, -262, 88, 690]];

// ===== terrain =====
function buildTerrain() {
  const si = ni; for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const a = j * 65 + i; IB[ni++] = a; IB[ni++] = a + 65; IB[ni++] = a + 1; IB[ni++] = a + 1; IB[ni++] = a + 65; IB[ni++] = a + 66; }
  const save = ni;
  for (let cz = 0; cz < 16; cz++) for (let cx = 0; cx < 16; cx++) {
    begin(); cM = MT; col(1, 1, 1, 0);
    for (let j = 0; j <= 64; j++) for (let i = 0; i <= 64; i++) {
      const gi = cx * 64 + i, gj = cz * 64 + j, k = gj * NH + gi, x = (gi - 512) * CS, z = (gj - 512) * CS;
      const v = V(x, H[k], z, x, z), sx = H[gj * NH + min(gi + 1, 1024)] - H[gj * NH + max(gi - 1, 0)], sz = H[min(gj + 1, 1024) * NH + gi] - H[max(gj - 1, 0) * NH + gi], l = 1 / hypot(sx, 2 * CS, sz), b = v * 32 + 12;
      vs8[b] = -sx * l * 127; vs8[b + 1] = 2 * CS * l * 127; vs8[b + 2] = -sz * l * 127;
    }
    mi0 = si; ni = si + 24576; uniq(end(0, 0, true), 0, 0, 0); ni = save;
  }
}
// ===== unique landmarks =====
function heartTree() {
  const Hh = 430, x0 = HTP[0], z0 = HTP[1], y0 = getH(x0, z0) - 3, n = 46, S = [];
  const rad = t => 12 * (1 + .6 * exp(-t * 12)) * (1 - .2 * t) + 62 * pow(sstep(.6, 1, t), 1.5);
  begin(); seed(31);
  for (let k = 0; k < 3; k++) {
    const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = i / (n - 1), a = k / 3 * TAU + 2.6 * t + .35 * sin(t * 7 + k); P[i * 3] = cos(a) * rad(t); P[i * 3 + 1] = Hh * t * (1 - .1 * sstep(.7, 1, t)) - 8; P[i * 3 + 2] = sin(a) * rad(t); }
    S.push(P); cM = MBK; cX = 0; cS = 0;
    tube(P, t => 14 * (1 + .5 * exp(-t * 16)) * (1 - .62 * t) + 1, 20, { m: (t, a) => 1 + .09 * cos(6 * a + t * 9) + .5 * exp(-t * 16) * pow(.5 + .5 * cos(4 * a + k), 3), vf: t => { cA = .4 + .6 * sstep(0, .08, t); col(.05, .05, .08, 1); }, us: Hh / 30 });
  }
  cM = MEM; cX = 0; cA = 1; const CP = new Float32Array([0, 0, 0, 0, Hh * .25, 0, 0, Hh * .5, 0, 0, Hh * .68, 0]);
  tube(spl(CP, 14), t => 7.5 * (1 - .45 * t), 10, { vf: () => col(.15, .85, 1, .55) });
  roots(16, Hh * .55, 31, 0, 9); roots(13, Hh * .3, 57, 0, 7);
  const m0 = end(0, 0); uniq(m0, x0, y0, z0);
  begin(); seed(32);
  const cy = Hh * .83; chamber(0, cy, 0, 19, 0, [1, .72, .32]);
  for (let k = 0; k < 3; k++) {
    const P = S[k];
    for (let j = 0; j < 2; j++) { at(P, .93 + .05 * j); const C = new Float32Array([_x, _y, _z, _x * .5, cy + 46, _z * .5, 0, cy + 25, 0]); cM = MBK; col(.06, .05, .08, .5); cX = 0; tube(spl(C, 8), () => .9, 5); }
    for (let j = 0; j < 3; j++) {
      at(P, .78 + .1 * j); const a = atan2(_z, _x) + rr(-.8, .8), B = grow(_x, _y, _z, cos(a), .5 + .3 * j, sin(a), rr(70, 120), 10, .6, .5, k * 7 + j + .5);
      limb(B, 5 - j, .6, 0, 31, .8); const e = B.length - 3;
      fan(B[e], B[e + 1], B[e + 2], 0, 1, 0, rr(60, 90), 15, rr(.3, .5), 0, 320 + k * 5 + j, [.015, .1, .13], [.1, .6, .65], .55);
      for (let i = 0; i < 7; i++) { at(B, rr(.25, 1)); tendril(_x + rr(-4, 4), _y - 1, _z + rr(-4, 4), rr(45, 170), .32, 3200 + k * 100 + j * 20 + i, 0, i % 5 == 0 ? GD : CY, i % 2 ? 1.3 : 0); }
    }
    const e = P.length - 3; parasol(P[e], P[e + 1] + 4, P[e + 2], 78, 20, 0, 33 + k, [.03, .12, .2], [.2, .55, .8], .5);
    for (let i = 0; i < 9; i++) { const b = i / 9 * TAU, d = rr(55, 75); tendril(P[e] + cos(b) * d, P[e + 1] - 6, P[e + 2] + sin(b) * d, rr(40, 150), .3, 3900 + k * 40 + i, 0, CY, i % 2 ? 1.2 : 0); }
  }
  const m1 = end(1, 0); uniq(m1, x0, y0, z0);
  M.gl[m0] = [.1, .8, 1, 190]; LIGHTS.push(x0, y0 + cy, z0, 300, 2.6, 1.7, .7);
  LIGHTS.push(x0, y0 + 30, z0, 190, .6, 2.6, 3.);
}
function crown() {
  const x0 = CRN[0], z0 = CRN[1], y0 = getH(x0, z0) - 12; begin(); seed(77); cM = MCR;
  for (let k = 0; k < 52; k++) {
    const c = k < 8, a = rnd() * TAU, len = c ? rr(280, 470) : rr(50, 230), tl = c ? rr(0, .28) : rr(.25, 1.), d = c ? rr(0, 28) : rr(20, 105), sides = 5 + (rnd() * 3 | 0), v0 = nv, yw = rnd() * 6;
    cX = rnd(); col(1, 1, 1, rr(.6, 1)); crystal(len, len * rr(.06, .1), sides, 77 * 13 + k);
    xf(v0, cos(a) * d, -10 - d * .25, sin(a) * d, 1, sin(tl) * cos(a), cos(tl), sin(tl) * sin(a), yw);
  }
  const m = end(0, 0); uniq(m, x0, y0, z0); M.gl[m] = [.6, .45, 1, 260];
  LIGHTS.push(x0, y0 + 150, z0, 420, 1.3, 1.1, 2.4);
}
function cathedral() {
  const x0 = CAT[0], z0 = CAT[1], y0 = getH(x0, z0), NR = 9, R = 118, Hh = 178, n = 34, S = [];
  begin(); seed(900); cM = MBK;
  const rp = (k, t, o) => { const a = k / NR * TAU + .3 * sin(t * 2.4 + k * 1.7) * t, r = mix(R, 23, pow(t, 1.7)) + R * .13 * sin(t * PI); o[0] = cos(a) * r; o[1] = Hh * pow(sin(t * PI / 2), .85) - 8; o[2] = sin(a) * r; };
  const tmp = [0, 0, 0], tm2 = [0, 0, 0];
  for (let k = 0; k < NR; k++) {
    const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { rp(k, i / (n - 1), tmp); P[i * 3] = tmp[0]; P[i * 3 + 1] = tmp[1]; P[i * 3 + 2] = tmp[2]; }
    S.push(P); cX = .15 + .3 * h2(k, 9); cS = 0;
    tube(P, t => 11 * (.32 + .68 * pow(1 - t, 1.1)) * (1 + 1.3 * exp(-t * 12)), 16, { m: (t, a) => 1 + .09 * cos(5 * a + t * 8) + 1.1 * exp(-t * 11) * pow(.5 + .5 * cos(4 * a + k), 3), vf: t => { cA = .4 + .6 * sstep(0, .08, t); col(.05, .045, .075, .7); }, us: 8 });
    const v0 = nv; roots(10, 120, 900 + k, 0, 5); xf(v0, P[0], 0, P[2], 1, 0, 1, 0, 0);
    for (let d = -1; d <= 1; d += 2) { // diagonal tracery
      rp(k, .3, tmp); rp(k + d, .74, tm2); const mx = (tmp[0] + tm2[0]) * .56, mz = (tmp[2] + tm2[2]) * .56;
      cM = MBK; tube(spl(new Float32Array([tmp[0], tmp[1], tmp[2], mx, (tmp[1] + tm2[1]) * .5 + 8, mz, tm2[0], tm2[1], tm2[2]]), 12), t => 3.2 - 1.6 * sin(t * PI), 8, { vf: () => { cA = .8; col(.05, .045, .075, .6); }, us: 5 });
    }
  }
  for (const t of [.52, .78, 1]) { const m = NR * 4 + 1, P = new Float32Array(m * 3); for (let i = 0; i < m; i++) { const f = i / 4, k = floor(f), u = f - k; rp(k, t, tmp); rp(k + 1, t, tm2); const sag = 1 - .12 * sin(u * PI); P[i * 3] = mix(tmp[0], tm2[0], u) * sag; P[i * 3 + 1] = mix(tmp[1], tm2[1], u) + 5 * sin(u * PI); P[i * 3 + 2] = mix(tmp[2], tm2[2], u) * sag; } tube(P, () => t == 1 ? 3.4 : 2.2, 7, { vf: () => { cA = .8; col(.05, .045, .075, .6); }, us: 9 }); }
  const m0 = end(0, 0); uniq(m0, x0, y0, z0);
  begin(); seed(901);
  for (let k = 0; k < NR; k++) for (let j = 0; j < 2; j++) { rp(k, .62 + .22 * j, tmp); const a = atan2(tmp[2], tmp[0]); fan(tmp[0] + cos(a) * 6, tmp[1] + 4, tmp[2] + sin(a) * 6, cos(a) * .8, 1, sin(a) * .8, rr(34, 52), 13, rr(.3, .5), 0, 910 + k * 2 + j, j ? [.07, .03, .16] : [.015, .1, .12], j ? [.45, .2, .85] : [.08, .55, .55], .5); }
  for (let i = 0; i < 9; i++) { const k = rnd() * NR | 0, t = rr(.5, .98); rp(k, t, tmp); rp(k + 1, t, tm2); const u = rr(.2, .8), x = mix(tmp[0], tm2[0], u) * .9, y = mix(tmp[1], tm2[1], u), z = mix(tmp[2], tm2[2], u) * .9, ln = rr(22, 75), sd = 9100 + i, c = i % 4 == 0 ? [1, .7, .3] : i % 3 == 0 ? LV : CY; tendril(x, y, z, ln, .35, sd, 0, [.3, .3, .4], 0, .05); chamber(x, y - ln - 5, z, rr(3, 6.5), 0, c, ln * .05, h2(sd, 5)); }
  for (let i = 0; i < 80; i++) { const k = rnd() * NR | 0, t = rr(.42, 1); rp(k, t, tmp); rp(k + 1, t, tm2); const u = rnd(); tendril(mix(tmp[0], tm2[0], u) * .92, mix(tmp[1], tm2[1], u), mix(tmp[2], tm2[2], u) * .92, rr(15, 60) * (t > .9 ? 1.6 : 1), .26, 9300 + i, 0, i % 6 == 0 ? LV : CY, i % 3 == 0 ? 1 : 0); }
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, L = rr(40, 85), nn = 10, P = new Float32Array(nn * 3); for (let j = 0; j < nn; j++) { const t = j / (nn - 1); P[j * 3] = cos(a) * (23 - 3 * t); P[j * 3 + 1] = Hh - 9 - L * t; P[j * 3 + 2] = sin(a) * (23 - 3 * t); } cM = MLF; cX = rnd(); ribbon(P, t => 2.4 * sin(PI * pow(t, .5)) + .1, { fold: .3, n: [cos(a), 0, sin(a)], vf: t => { colm([.1, .04, .25], [.5, .25, .95], t, .35 + .45 * t); cA = 1; sw(L * .07 * t * t); } }); }
  cS = 0; uniq(end(1, 0), x0, y0, z0);
  // the Lumen Bloom
  begin(); seed(902); const cy = 46;
  for (let k = 0; k < 3; k++) { const nn = 16, P = new Float32Array(nn * 3); for (let i = 0; i < nn; i++) { const t = i / (nn - 1), a = k / 3 * TAU + t * 5; P[i * 3] = cos(a) * 3.4 * (1 + 2 * exp(-t * 6)); P[i * 3 + 1] = (cy - 6) * t - 3; P[i * 3 + 2] = sin(a) * 3.4 * (1 + 2 * exp(-t * 6)); } cM = MBK; cX = .1; tube(P, t => 2.8 * (1 + exp(-t * 7)) * (1 - .3 * t), 10, { vf: t => { cA = .5 + .5 * t; col(.05, .06, .09, 1); }, us: 4 }); }
  cM = MEM; cX = 0; cS = 0; col(.75, .95, 1, 1); { const v0 = nv; blob(3, (x, y, z) => 1 + .05 * sin(y * 7 + atan2(z, x) * 5)); xf(v0, 0, cy, 0, 10.5, 0, 1, 0, 0); }
  for (let tier = 0; tier < 3; tier++) for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU + tier * .45, L = 30 + 13 * tier + rr(0, 8), nn = 22, P = new Float32Array(nn * 3), op = .5 + .35 * tier;
    for (let i = 0; i < nn; i++) { const t = i / (nn - 1), th = 1.35 - op * 1.6 * t * t, s = t * L; P[i * 3] = cos(a) * (5 + s * cos(th) * .9 + 9 * t); P[i * 3 + 1] = cy - 9 + s * sin(th) * 1 - 4 * tier; P[i * 3 + 2] = sin(a) * (5 + s * cos(th) * .9 + 9 * t); }
    cM = MLF; cX = rnd(); ribbon(P, t => L * .19 * sin(PI * pow(t, .6)) + .2, { fold: .12, n: [-cos(a), .5, -sin(a)], vf: t => { colm(tier == 1 ? [.1, .04, .28] : [.02, .12, .2], tier == 1 ? [.6, .3, 1] : [.2, .8, .95], t, .45 + .4 * t); cA = .6 + .4 * t; sw(L * .03 * t * t); } });
  }
  for (let i = 0; i < 26; i++) { const a = rnd() * TAU, L = rr(22, 55), B = grow(cos(a) * 5, cy + 8, sin(a) * 5, cos(a) * .6, 1, sin(a) * .6, L, 10, -1.5, .4, 40 + i); cM = MFL; cX = rnd(); tube(B, t => .28 * (1 - .6 * t), 4, { vf: t => { colm([.2, .6, .7], [1, .75, .3], t, .5 + .5 * t); sw(L * .05 * t * t); } }); const e = B.length - 3, v0 = nv; col(1, .75, .3, 1); sw(L * .05); blob(1, () => 1); xf(v0, B[e], B[e + 1], B[e + 2], .9, 0, 1, 0, 0); }
  cS = 0; const m2 = end(1, 0); uniq(m2, x0, y0, z0); M.gl[m2] = [.3, .85, 1, 230];
  LIGHTS.push(x0, y0 + cy, z0, 240, 1.6, 3., 3.4);
}
const ISL = []; // x,y,z,R,top()
function island(R, D, sd) {
  const rim = a => R * (.75 + .5 * fbm2(cos(a) * 1.3 + sd, sin(a) * 1.3, 3));
  const top = (x, z) => { const r = hypot(x, z), rm = rim(atan2(z, x)), k = min(r / rm, 1); return 6 * (fbm2(x / 22 + sd, z / 22, 3) - .5) + R * .07 * (1 - k * k) - 3 * sstep(.8, 1, k); };
  const bot = (x, z) => { const r = hypot(x, z), a = atan2(z, x), rm = rim(a), s = min(r / rm, 1); return top(cos(a) * rm, sin(a) * rm) * s - 2 - D * (1 - pow(s, 1.7)) * (.45 + 1.1 * fbm2(x / (R * .4) + sd * 3, z / (R * .4), 3)) - D * .5 * pow(1 - abs(2 * vn2(x / (R * .22) + sd, z / (R * .22)) - 1), 3) * (1 - s); };
  cM = MRK; col(1, 1, 1, 0); cX = h2(sd, 1); const m = 30, prof = new Float32Array(m * 2);
  lathe(prof, 56, { df: (t, a) => { const rm = rim(a); if (t < .5) { const s = pow(t * 2, .8); _x = rm * s; _y = top(cos(a) * _x, sin(a) * _x); cA = 1; } else { const s = 2 - 2 * t; _x = rm * s; _y = bot(cos(a) * _x, sin(a) * _x); cA = .5 + .4 * s; } } });
  for (let j = 0; j < R * .9; j++) { const a = rnd() * TAU, d = sqrt(rnd()) * rim(a) * .95, x = cos(a) * d, z = sin(a) * d; tendril(x, bot(x, z) + 1, z, rr(.3, 1.3) * R + 8, .25 + R * .004, sd * 100 + j, 0, j % 3 ? [.05, .3, .36] : CY, j % 3 ? 0 : .8, .02); }
  return { top, rim };
}
function gardens() {
  const x0 = GAR[0], z0 = GAR[1], pool = getH(x0, z0) + 15; seed(600);
  begin(); cM = MWT; cX = 1; col(.1, .8, .9, 1); const pr = []; for (let i = 0; i <= 10; i++) pr.push(i * 19, 0); lathe(pr, 40, {}); uniq(end(1, 0), x0, pool, z0);
  LIGHTS.push(x0, pool + 20, z0, 260, .4, 1.6, 1.7); LIGHTS.push(x0, 150, z0, 240, .5, 2., 2.4);
  const defs = [[0, 215, 0, 88, 115]];
  for (let i = 0; i < 400 && defs.length < 13; i++) {
    const a = rnd() * TAU, d = rr(110, 340), R = rr(17, 46), x = cos(a) * d, z = sin(a) * d, y = rr(70, 330); let ok = pathClear(x0 + x, y - R * .3, z0 + z, R * 1.5 + 30);
    for (const q of defs) if (hypot(q[0] - x, q[1] - y, q[2] - z) < q[3] + R + 22) ok = false;
    if (ok) defs.push([x, y, z, R, R * rr(.9, 1.7)]);
  }
  defs.forEach((d, i) => {
    begin(); const g = island(d[3], d[4], 610 + i * 3); const m = end(1, 0); uniq(m, x0 + d[0], d[1], z0 + d[2]); ISL.push(x0 + d[0], d[1], z0 + d[2], d[3]);
    const wx = x0 + d[0], wy = d[1], wz = z0 + d[2], R = d[3];
    const put = (f, n, smin, smax) => { for (let j = 0; j < n; j++) { const a = rnd() * TAU, r = sqrt(rnd()) * g.rim(a) * .8, x = cos(a) * r, z = sin(a) * r; f(wx + x, wy + g.top(x, z), wz + z, rr(smin, smax)); } };
    put((x, y, z, s) => { const t = TREES[rnd() * TREES.length | 0]; if (t.type != 3) prop(t.id, x, y - 1, z, s, rnd() * 6, rr(0, .08), rnd() * 6, rr(.8, 1.2), rr(.8, 1.2), rr(.8, 1.2), 1, rnd()); }, i ? 2 + R * .12 | 0 : 16, i ? .1 : .13, i ? .2 : .3);
    put((x, y, z, s) => prop(FUNGI[rnd() * 6 | 0], x, y - .5, z, s, rnd() * 6, rr(0, .1), rnd() * 6, 1, 1, 1, 1, rnd()), i ? 2 : 9, .2, .6);
    put((x, y, z, s) => prop(MID[rnd() * 12 | 0], x, y - .2, z, s, rnd() * 6, rr(0, .15), rnd() * 6, rr(.8, 1.3), rr(.8, 1.1), rr(.8, 1.3), 1, rnd()), R * R * .045 | 0, 1.6, 5);
    put((x, y, z, s) => prop(CLUST[rnd() * 6 | 0], x, y - .2, z, s, rnd() * 6, rr(0, .3), rnd() * 6, 1, 1, 1, 1, rnd()), R * .25 | 0, 1, 5);
    if (i < 4) { // waterfall
      const a = i ? rnd() * TAU : 2.2, rm = g.rim(a) * .93, fx = cos(a) * rm, fz = sin(a) * rm, fy = g.top(fx, fz), L = wy + fy - pool, nn = 26, P = new Float32Array(nn * 3);
      for (let j = 0; j < nn; j++) { const t = j / (nn - 1), o = 14 * (1 - exp(-t * 5)); P[j * 3] = wx + fx + cos(a) * o - wx; P[j * 3 + 1] = fy + 1 - L * t * (.25 + .75 * t); P[j * 3 + 2] = fz + sin(a) * o; }
      begin(); cM = MWT; cX = 0; col(.3, .9, 1, 1); ribbon(P, t => (i ? 1.3 : 2.4) * (1 + 1.6 * t), { n: [cos(a), 0, sin(a)] }); for (let v = mb; v < nv; v++) vf[v * 8 + 5] *= L / 6;
      const v1 = nv; for (let j = 0; j < nn; j++) { P[j * 3] += -sin(a) * .8; P[j * 3 + 2] += cos(a) * .8; } ribbon(P, t => (i ? 1.3 : 2.4) * (1 + 1.6 * t), { n: [-sin(a), 0, cos(a)] }); for (let v = v1; v < nv; v++) vf[v * 8 + 5] *= L / 6;
      uniq(end(2, 0), wx, wy, wz);
    }
  });
  // root bridges
  begin(); seed(640); cM = MBK;
  for (let i = 1; i < defs.length; i++) {
    let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const dd = hypot(defs[i][0] - defs[j][0], defs[i][1] - defs[j][1], defs[i][2] - defs[j][2]); if (dd < bd) { bd = dd; b = j; } }
    const p = defs[i], q = defs[b], C = new Float32Array([p[0], p[1] - p[4] * .35, p[2], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - bd * .22 - p[4] * .3, (p[2] + q[2]) / 2, q[0], q[1] - q[4] * .35, q[2]]), P = spl(C, 22);
    cM = MBK; cX = .2; tube(P, t => 1.5 + 1.6 * abs(1 - 2 * t), 7, { vf: () => { cA = .8; col(.06, .05, .08, .5); }, us: bd / 10 });
    for (let j = 0; j < 9; j++) { at(P, rr(.1, .9)); tendril(_x, _y - 1, _z, rr(15, 55), .22, 6400 + i * 10 + j, 0, CY, j % 2 ? .8 : 0); }
  }
  cS = 0; uniq(end(1, 0), x0, 0, z0);
}
function sanctuary() {
  const x0 = SAN[0], z0 = SAN[1], y0 = getH(x0, z0); let nx = .15, ny = .37, nz = -.92; const nl = hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const hh = hypot(nx, nz), Xx = nz / hh, Xz = -nx / hh, Zx = -Xz * ny, Zy = Xz * nx - Xx * nz, Zz = Xx * ny, cx = 0, cy = 58, cz = 78, R = 92, o3 = [0, 0, 0];
  const rp = (th, r, ax) => { const c = cos(th) * r, s = sin(th) * r; o3[0] = cx + Xx * c + Zx * s + nx * ax; o3[1] = cy + Zy * s + ny * ax; o3[2] = cz + Xz * c + Zz * s + nz * ax; };
  begin(); seed(700); cM = MST; cX = 0; cS = 0;
  const arc = (a0, a1, dr, dax) => {
    const n = max(12, (a1 - a0) * 50 | 0), NBk = Math.round((a1 - a0) * R / 24), P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { rp(mix(a0, a1, i / (n - 1)), R + dr, dax); P[i * 3] = o3[0]; P[i * 3 + 1] = o3[1]; P[i * 3 + 2] = o3[2]; }
    rp(a0, 1, 0); const n0 = [o3[0] - cx, o3[1] - cy, o3[2] - cz];
    tube(P, t => sstep(0, .014, t) * sstep(1, .986, t) + .02, 24, { n0, m: (t, a) => { const p = 6, e = min(t, 1 - t) * (a1 - a0), br = e < .12 ? .75 + .5 * vn2(a * 3 + a0 * 9, t * 60) : 1, g = (abs(sin(a)) > .86 || abs(cos(a)) > .93) ? .9 : 1, bf = t * NBk, bi = floor(bf), fr = bf - bi, sm = (fr < .07 || fr > .93 ? .88 : 1) * (.93 + .14 * h2(bi, a0 * 10)); return sm * br * g / pow(pow(abs(cos(a)) / 8.5, p) + pow(abs(sin(a)) / 5.5, p), 1 / p); }, vf: (t, a) => { col(1, 1, 1, cos(a) < -.5 ? 1 : abs(sin(a)) > .86 ? .5 : .12); cA = .7 + .3 * abs(sin(a)); }, us: (a1 - a0) * R / 12 });
  };
  arc(4.52, 6.86, 0, 0); arc(6.93, 10.3, 1.5, -1.2);
  for (let i = 0; i < 7; i++) { const th = rr(4.06, 4.5), v0 = nv; rp(th, R + rr(-14, 16), rr(-16, 16)); col(1, 1, 1, .6); crystal(rr(8, 18), rr(3, 5.5), 5, 720 + i, { sh: .7, tip: 1.2 }); xf(v0, o3[0], o3[1] + rr(-5, 12), o3[2], 1, rr(-1, 1), rr(-1, 1), rr(-1, 1), rnd() * 6); }
  // monoliths
  for (let i = 0; i < 10; i++) {
    const a = 1.9 + i / 10 * TAU * .86 + rr(-.1, .1), d = rr(84, 128), x = cos(a) * d, z = sin(a) * d, v0 = nv, len = rr(24, 72); col(1, 1, 1, .55);
    crystal(len, rr(4.5, 8.5), 4 + (rnd() * 2 | 0), 740 + i, { sh: .9, tip: 1.5, taper: .72 }); xf(v0, x, getH(x0 + x, z0 + z) - y0 - 4, z, 1, rr(-.16, .16), 1, rr(-.16, .16), rnd() * 6);
  }
  // central sculpture
  { const sv = nv; const P = spl(new Float32Array([0, -3, 0, .8, 22, .5, -.5, 46, 0]), 14); col(1, 1, 1, .7); prism(P, t => 7.5 - 4 * t, 3, 2.3, { us: 6 });
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5, Q = spl(new Float32Array([cos(a) * 2, 44, sin(a) * 2, cos(a) * 15, 55, sin(a) * 15, cos(a) * 17, 70, sin(a) * 17, cos(a) * 7, 84, sin(a) * 7]), 12); prism(Q, t => 2.6 * (1 - .75 * t) + .2, 4, 1.2, { us: 6 }); }
    let v0 = nv; cM = MEM; col(1, .48, .1, .38); crystal(11, 4.2, 6, 760, { sh: .5, tip: .2 }); xf(v0, 0, 66, 0, 1, 0, 1, 0, 0); v0 = nv; crystal(8, 4.2, 6, 760, { sh: .6, tip: .2 }); xf(v0, 0, 66, 0, 1, 0, -1, 0, 0); cM = MST;
    xf(sv, 0, -2, 0, 1.5, 0, 1, 0, 0); }
  const m = end(0, 0); uniq(m, x0, y0, z0); M.gl[m] = [.2, .6, .9, 120];
  LIGHTS.push(x0, y0 + 98, z0, 200, 3., 2., .9);
  // roots creeping over the plaza + ring vines
  begin(); seed(701); cM = MBK;
  for (let i = 0; i < 16; i++) {
    const a = rnd() * TAU, C = []; let d = rr(120, 150), b = a; for (let j = 0; j < 6; j++) { const x = cos(b) * d, z = sin(b) * d; C.push(x, getH(x0 + x, z0 + z) - y0 + .5 + (j % 2) * 1.2, z); d *= rr(.6, .8); b += rr(-.5, .5); }
    cX = .3; tube(spl(new Float32Array(C), 30), t => 1.5 * (1 - .8 * t) + .2, 6, { vf: () => { cA = .7; col(.06, .05, .085, .5); }, us: 12 });
  }
  for (let i = 0; i < 50; i++) { const th = rr(4.6, 8.2); if (abs(th - 6.9) < .08) continue; rp(th, R + rr(-7, 7), rr(-5, 5)); if (o3[1] + y0 < y0 + 20) continue; tendril(o3[0], o3[1] - 4, o3[2], rr(12, 60), .25, 7100 + i, 0, i % 5 == 0 ? LV : CY, i % 3 == 0 ? .9 : 0); }
  cS = 0; uniq(end(1, 0), x0, y0, z0);
  // path slabs toward the grove side
  seed(702); for (let i = 0; i < 26; i++) { const t = i / 25, x = x0 + sin(t * 5) * 9 - t * 40, z = z0 - 20 - t * 170; prop(A.slab, x + rr(-1, 1), getH(x, z) - .6, z, rr(5, 8), rnd() * 6, rr(0, .06), rnd() * 6, 1, 1, 1, 1, rnd()); }
  for (let i = 0; i < 26; i++) { const a = rnd() * TAU, d = rr(30, 150), s = rr(1.2, 5.5); prop(CLUST[5 - (i % 3)], x0 + cos(a) * d, y0 + rr(30, 130), z0 + sin(a) * d + 40, s, rnd() * 6, rr(.3, 2.8), rnd() * 6, 1, 1, 1, 1.2, rnd(), 1); }
}
function stream() {
  const n = 460, C = []; for (let i = 0; i < STR.length; i += 2) C.push(STR[i], 0, STR[i + 1]);
  const P = spl(new Float32Array(C), n); let L = 0; for (let i = 0; i < n; i++) { P[i * 3 + 1] = getH(P[i * 3], P[i * 3 + 2]) + 1.25; }
  for (let k = 0; k < 3; k++) for (let i = 1; i < n - 1; i++) P[i * 3 + 1] = (P[i * 3 - 2] + P[i * 3 + 1] * 2 + P[i * 3 + 4]) / 4;
  for (let i = 1; i < n; i++) L += hypot(P[i * 3] - P[i * 3 - 3], P[i * 3 + 2] - P[i * 3 - 1]);
  begin(); cM = MWT; cX = .5; col(.2, .85, 1, 1); ribbon(P, t => 6.5 + 2.5 * sin(t * 90), {}); for (let v = mb; v < nv; v++) vf[v * 8 + 5] *= L / 6; uniq(end(2, 0), 0, 0, 0);
  seed(41); for (let i = 6; i < n - 4; i += 2) { at(P, i / n); const s = i % 4 ? 1 : -1, d = rr(6, 10), x = _x - _dz * d * s, z = _z + _dx * d * s; if (rnd() < .8) prop(CLUST[rnd() * 6 | 0], x, getH(x, z) - .1, z, rr(.5, 2.6) * (rnd() < .08 ? 2.5 : 1), rnd() * 6, rr(0, .35), rnd() * 6, 1, 1, 1, 1, rnd()); }
}
// ===== scatter the world =====
const FBT = new Uint8Array(256 * 256 * 4); let SUN = [0, 1, 0];
const MANTA = [];
function buildWorldProps() {
  for (let i = 0; i <= 240; i++) { tourAt(i / 4); TPS[i * 3] = _tp[0]; TPS[i * 3 + 1] = _tp[1]; TPS[i * 3 + 2] = _tp[2]; }
  buildTerrain(); stream(); heartTree(); crown(); cathedral(); gardens(); sanctuary();
  // grove hero ring
  seed(4000); const hero = [[.55, 0], [1.25, 4], [2.05, 0], [2.75, 3], [3.5, 5], [4.1, 1], [5.35, 6], [6.2, 12]];
  for (const h of hero) { const d = h[1] == 3 ? 100 : rr(112, 138), x = GR[0] + cos(h[0]) * d, z = GR[1] + sin(h[0]) * d; prop(TREES[h[1]].id, x, getH(x, z) - 3, z, rr(1.05, 1.3), h[1] == 3 ? h[0] + 1.9 : rnd() * 6, .05, h[0] + PI, 1, 1, 1, 1, rnd()); }
  // megatrees
  seed(4242);
  for (let gz = -1500; gz < 1500; gz += 64) for (let gx = -1500; gx < 1500; gx += 64) {
    const x = gx + rr(6, 58), z = gz + rr(6, 58), r = hypot(x, z), k = rnd() * TREES.length | 0, s = rr(.72, 1.28), yaw = rnd() * 6, tl = rr(0, .06), td = rnd() * 6, c1 = rr(.8, 1.2), c2 = rr(.8, 1.2), c3 = rr(.8, 1.2), ph = rnd(), dn = fbm2(x / 280 + 9, z / 280, 2);
    const bad = (x, z) => dist2(x, z, GR) < 150 || dist2(x, z, HTP) < 110 || ravD(x, z) < 118 || polyD(CHS, x, z) < 95 || polyD(STR, x, z) < 30 || dist2(x, z, CAT) < 225 || dist2(x, z, GAR) < 135 || dist2(x, z, SAN) < 165 || dist2(x, z, CRN) < 150 || !pathClear(x, null, z, 62);
    if (r > 1500 || bad(x, z)) continue;
    if (dn < .36 && r < 1050) continue; const sl = slopeAt(x, z); if (sl > .5 || (TREES[k].type == 3 && sl > .14)) continue;
    if (TREES[k].ar) { const ar = TREES[k].ar, c = cos(yaw), sn = sin(yaw), x2 = x + (ar[0] * c + ar[1] * sn) * s, z2 = z + (-ar[0] * sn + ar[1] * c) * s; if (bad(x2, z2) || abs(getH(x2, z2) - getH(x, z)) > 5 || !pathClear((x + x2) / 2, null, (z + z2) / 2, 70)) continue; }
    prop(TREES[k].id, x, getH(x, z) - 3 * s, z, s, yaw, tl, td, c1, c2, c3, 1, ph);
  }
  // giant fungi
  seed(4300);
  for (let gz = -1300; gz < 1300; gz += 78) for (let gx = -1300; gx < 1300; gx += 78) {
    const x = gx + rr(0, 78), z = gz + rr(0, 78), k = rnd() * 6 | 0, s = rr(.5, 1) * (rnd() < .25 ? 2.3 : 1), yaw = rnd() * 6, ph = rnd(), zn = fbm2(x / 190 + 30, z / 190, 2) + .25 * getB(x, z, 2);
    if (zn < .5 || getB(x, z, 0) < .5 || !pathClear(x, null, z, 40) || dist2(x, z, GR) < 125 || dist2(x, z, CAT) < 130 || dist2(x, z, SAN) < 120) continue;
    prop(FUNGI[k], x, getH(x, z) - 1, z, s, yaw, rr(0, .1), yaw, 1, 1, 1, 1, ph);
  }
  [[-598, -62, 1., 2], [-398, -52, .8, 0], [-570, -168, .7, 4], [520, -350, 1.6, 1], [655, -510, 1.3, 3], [-300, 520, 1.2, 5]].forEach(f => prop(FUNGI[f[3]], f[0], getH(f[0], f[1]) - 1, f[1], f[2], f[0], .05, 1, 1, 1, 1, 1, .3));
  // mid flora
  seed(4400);
  for (let gz = -1320; gz < 1320; gz += 12) for (let gx = -1320; gx < 1320; gx += 12) {
    const x = gx + rr(0, 12), z = gz + rr(0, 12), a = rnd(), b = rnd(), yaw = rnd() * 6, tl = rr(0, .18), s = rr(2.5, 7), ph = rnd(), w = rnd() < .5 ? 0 : 1, c1 = rr(.75, 1.25), c2 = rr(.8, 1.15);
    if (hypot(x, z) > 1320) continue; const dens = getB(x, z, 0); if (a > dens * .62 || !pathClear(x, null, z, s * 1.3 + 7)) continue;
    const v = floor(vn2(x / 60 + 3, z / 60) * 5.99 + b * 1.6) % 6, g = getB(x, z, 1);
    prop(MID[v * 2 + w], x, getH(x, z) - .25, z, s * (v == 2 ? .8 : 1), yaw, tl, yaw * 2, mix(.8, 1.35, g) * c1, c2 * .9, mix(1.3, .8, g) * c1, 1, ph);
  }
  // rocks
  seed(4500);
  for (let gz = -1450; gz < 1450; gz += 44) for (let gx = -1450; gx < 1450; gx += 44) {
    const x = gx + rr(0, 44), z = gz + rr(0, 44), a = rnd(), k = rnd() * 8 | 0, big = rnd() < .035, s = big ? rr(32, 60) : pow(rnd(), 3) * 26 + 2.5, yaw = rnd() * 6, tl = rr(0, .4), g = rr(.8, 1.1), ph = rnd();
    if (a > .3 + getB(x, z, 3) * .6 || dist2(x, z, GR) < (s > 7 ? 260 : 60) || dist2(x, z, HTP) < s * 3 + 60 || dist2(x, z, CAT) < 125 || dist2(x, z, SAN) < 120 || polyD(STR, x, z) < 14 || ravD(x, z) < 30) continue;
    if (!pathClear(x, null, z, s * 2 + 14)) continue;
    prop(ROCKS[k], x, getH(x, z) - s * .3, z, s, yaw, tl, yaw, g, g, g * 1.05, 1, ph);
  }
  // ravine + chasm dressing
  seed(4600);
  const dress = (PL, n, floorY) => {
    for (let i = 0; i < n; i++) {
      const t = (i + rnd()) / n, f = t * (PL.length / 2 - 1), k = min(floor(f), PL.length / 2 - 2), u = f - k, cx = mix(PL[k * 2], PL[k * 2 + 2], u), cz = mix(PL[k * 2 + 1], PL[k * 2 + 3], u);
      let dx = PL[k * 2 + 2] - PL[k * 2], dz = PL[k * 2 + 3] - PL[k * 2 + 1]; const l = hypot(dx, dz); dx /= l; dz /= l; const sd = rnd() < .5 ? 1 : -1, off = rr(26, 74), x = cx - dz * off * sd, z = cz + dx * off * sd, y = getH(x, z), kind = rnd(), s1 = rnd(), yaw = rnd() * 6, hue = rnd() * 6 | 0, ph = rnd();
      if (y > -6 && kind > .12) continue;
      if (kind < .12) { const rx = cx - dz * (off + 26) * sd, rz = cz + dx * (off + 26) * sd; prop(A.vine, rx, getH(rx, rz) + 1, rz, 1.2 + s1 * 1.6, atan2(-dz, dx), 0, 0, 1, 1, 1, 1, ph); }
      else if (kind < .5) { const s = 6 + s1 * 11; if (off > 44 && pathClear(x, y, z, s * 1.6 + 12)) prop(ROCKS[1 + hue % 7], x, y - s * .15, z, s, yaw, .5, atan2(dx * sd, -dz * sd), .9, .9, 1, 1, ph); }
      else if (kind < .82) { const s = (s1 < .14 ? rr(42, 70) : 7 + s1 * 26); qdir(dz * sd * .9 + rr(-.3, .3), rr(.5, 1.1), -dx * sd * .9 + rr(-.3, .3), yaw); if (pathClear(x, y + s * .4, z, s * .55 + 8)) propQ(CLUST[hue], x, y - 1, z, s, 1, 1, 1, 1.1, ph); }
    }
    for (let i = 0; i < n / 24; i++) { const t = rr(.1, .92), f = t * (PL.length / 2 - 1), k = min(floor(f), PL.length / 2 - 2), u = f - k, x = mix(PL[k * 2], PL[k * 2 + 2], u) + rr(-34, 34), z = mix(PL[k * 2 + 1], PL[k * 2 + 3], u) + rr(-34, 34), y = rr(floorY + 12, 25), s = rr(2.5, 9), ph = rnd(), yaw = rnd() * 6; if (y > getH(x, z) + s + 4 && pathClear(x, y, z, s * 1.5 + 9)) prop(A.fb[i % 3], x, y, z, s, yaw, rr(0, .3), yaw, 1, 1, 1, 1, ph, 1); }
  };
  dress(RAV, 620, -118); dress(CHS, 300, -105);
  // crystal gardens
  seed(4700);
  for (let i = 0; i < 230; i++) { const a = rnd() * TAU, d = sqrt(rnd()) * 1250, x0 = cos(a) * d, z0 = sin(a) * d, n = 6 + rnd() * 12 | 0, hue = rnd() * 6 | 0; for (let j = 0; j < n; j++) { const x = x0 + rr(-15, 15), z = z0 + rr(-15, 15), s = rr(.5, 3.4) * (rnd() < .06 ? 3 : 1), yaw = rnd() * 6, tl = rr(0, .35), ph = rnd(), e = rnd(); if (getB(x, z, 0) > .2 && pathClear(x, null, z, s + 4)) prop(CLUST[e < .7 ? hue : rnd() * 6 | 0], x, getH(x, z) - .15, z, s, yaw, tl, yaw, 1, 1, 1, 1, ph); } }
  for (let i = 0, n0 = np; i < n0; i++) { const m = pM[i]; if (TREES.some(t => t.id == m) && h2(i, 3) < .35) for (let j = 0; j < 3; j++) { const a = h2(i, j + 5) * TAU, d = (11 + 12 * h2(i, j + 9)) * pS[i], x = pf[i * 10] + cos(a) * d, z = pf[i * 10 + 2] + sin(a) * d, s = 2.5 + 5 * h2(i, j + 14); prop(CLUST[(i + j) % 6], x, getH(x, z) - .4, z, s, a, .2 + .4 * h2(i, j + 20), a, 1, 1, 1, 1, h2(i, j)); } }
  for (let i = 0; i < 46; i++) { const a = rnd() * TAU, d = rr(60, 170), x = CRN[0] + cos(a) * d, z = CRN[1] + sin(a) * d, s = rr(6, 30), ph = rnd(); qdir(cos(a) * rr(.2, .8), 1, sin(a) * rr(.2, .8), a); propQ(CLUST[i % 6], x, getH(x, z) - 1, z, s, 1, 1, 1, 1.2, ph); }
  // jellies
  seed(4800); const JZ = [[GR, 170, 40, 6, 70], [CAT, 105, 50, 8, 120], [GAR, 300, 90, 20, 330], [SAN, 160, 40, 10, 120], [[30, -362], 170, 40, -90, 30], [HTP, 120, 30, 20, 250]];
  for (const j of JZ) for (let i = 0; i < j[2]; i++) { const a = rnd() * TAU, d = sqrt(rnd()) * j[1], x = j[0][0] + cos(a) * d, z = j[0][1] + sin(a) * d, y = max(getH(x, z) + 5, rr(j[3], j[4])), k = rnd(), c = k < .6 ? CY : k < .9 ? LV : PK; if (pathClear(x, y, z, 24)) prop(A.jelly, x, y, z, rr(.8, 2.8), rnd() * 6, rr(0, .25), rnd() * 6, c[0] * 2, c[1] * 2, c[2] * 2, rr(.6, 1.4), rnd(), 1); }
  // mantas (dynamic)
  const MC = [[GR[0], 70, GR[1] - 40, 150, 26], [HTP[0], 210, HTP[1], 190, 40], [30, -55, -362, 150, 10], [CAT[0], 95, CAT[1], 190, 30], [GAR[0], 250, GAR[1], 300, 70], [GAR[0], 150, GAR[1], 230, 50], [SAN[0], 130, SAN[1] + 60, 210, 40], [CRN[0], 330, CRN[1], 330, 70], [-300, 260, 250, 420, 60], [200, 230, -100, 450, 50], [-500, 45, -60, 95, 12], [-250, 150, 500, 330, 60]];
  MC.forEach((c, i) => { MANTA.push({ i: prop(A.manta, c[0], c[1], c[2], .55 + .5 * h2(i, 77) + (i == 7 ? .6 : 0), 0, 0, 0, 1, 1, 1, 1, h2(i, 5)), c, w: (.05 + .04 * h2(i, 9)) * (i % 2 ? 1 : -1) * 150 / c[3], ph: h2(i, 11) * 9 }); });
}
// ===== tile flora instances =====
const TILE = 48; let FIB = null, FLN = 0;
function buildFlora() {
  let tot = 0; for (const f of FLORA) tot += f.n; FLN = tot; FIB = new ArrayBuffer(tot * 40); const ff = new Float32Array(FIB), fu = new Uint8Array(FIB); let o = 0; seed(5000);
  for (const f of FLORA) {
    f.first = o;
    for (let i = 0; i < f.n; i++, o++) {
      const b = o * 40, w = o * 10, s = mix(f.s0, f.s1, pow(rnd(), 1.6)), k = rnd();
      ff[w] = rnd() * TILE; ff[w + 1] = -.04; ff[w + 2] = rnd() * TILE; ff[w + 3] = s;
      qyt(rnd() * TAU, rr(0, .22), rnd() * TAU); ff[w + 4] = _q[0]; ff[w + 5] = _q[1]; ff[w + 6] = _q[2]; ff[w + 7] = _q[3];
      let r = rr(.75, 1.25), g = rr(.8, 1.15), bl = rr(.75, 1.25), e = rr(.6, 1.4);
      if (f.k == 5 || f.k == 8) { if (k < .25) { r *= 1.6; g *= .7; bl *= .5; } }
      fu[b + 32] = c8(r * .5); fu[b + 33] = c8(g * .5); fu[b + 34] = c8(bl * .5); fu[b + 35] = c8(e * .5); fu[b + 36] = rnd() * 255; fu[b + 37] = min(255, (i + rnd()) / f.n * 256); fu[b + 38] = 2 + rnd() * 250; fu[b + 39] = 0;
    }
  }
}
// ===== glow map bake =====
const GLW = new Uint8Array(512 * 512 * 4);
function bakeGlow() {
  const g = new Float32Array(512 * 512 * 3);
  for (let i = 0; i < np; i++) {
    const gl = M.gl[pM[i]]; if (!gl) continue; const s = pS[i], rad = gl[3] * (s < .5 ? s * 2 : sqrt(s)) / 6, cx = pf[i * 10] / 6 + 256, cz = pf[i * 10 + 2] / 6 + 256, R = ceil(rad * 1.6), a = (pu[i * 40 + 35] / 127.5) * (gl[3] > 20 ? .5 : .32);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const x = floor(cx) + dx, z = floor(cz) + dz; if (x < 0 || z < 0 || x > 511 || z > 511) continue; const d = hypot(x + .5 - cx, z + .5 - cz) / rad, w = a * exp(-d * d * 1.6), k = (z * 512 + x) * 3; g[k] += gl[0] * w; g[k + 1] += gl[1] * w; g[k + 2] += gl[2] * w; }
  }
  for (let i = 0; i < 512 * 512; i++) { for (let c = 0; c < 3; c++) { const v = g[i * 3 + c]; GLW[i * 4 + c] = c8(sqrt(min(v / (1 + v * .35), 4) / 4)); } GLW[i * 4 + 3] = 255; }
}
