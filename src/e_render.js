// ===== procedural textures =====
const NZT = new Uint8Array(256 * 256 * 4);
function genNoise() {
  seed(9); for (let i = 0; i < 65536; i++) NZT[i * 4 + 1] = rnd() * 256;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) NZT[(y * 256 + x) * 4] = NZT[(((y + 17) & 255) * 256 + ((x + 37) & 255)) * 4 + 1];
  for (let c = 0; c < 4; c++) for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    let a = .5, s = 0, p = 4;
    for (let o = 0; o < 5; o++) {
      const fx = x * p / 256, fy = y * p / 256, xi = floor(fx), yi = floor(fy); let u = fx - xi, v = fy - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      const g = (i, j) => h3(i % p, j % p, c * 31 + o * 7 + 1);
      s += a * mix(mix(g(xi, yi), g(xi + 1, yi), u), mix(g(xi, yi + 1), g(xi + 1, yi + 1), u), v); a *= .5; p *= 2;
    }
    FBT[(y * 256 + x) * 4 + c] = clamp((s / .96875 - .5) * 1.5 + .5, 0, 1) * 255;
  }
}
// ===== main =====
async function main() {
  const cv = document.getElementById('c'), msg = document.getElementById('m'), menu = document.getElementById('u'), B = i => document.getElementById('b' + i), show = v => { menu.style.display = v ? 'flex' : 'none'; };
  const fail = t => { msg.textContent = t; msg.style.opacity = 1; };
  if (!navigator.gpu) return fail('WebGPU is required (a recent Chromium browser).');
  const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!ad) return fail('No WebGPU adapter available.');
  const hasTS = ad.features.has('timestamp-query');
  const dev = await ad.requestDevice({ requiredFeatures: hasTS ? ['timestamp-query'] : [] });
  const ctx = cv.getContext('webgpu'), fmt = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device: dev, format: fmt, alphaMode: 'opaque' });
  const Q = new URLSearchParams(location.search), BENCH = Q.has('bench'), FIX = BENCH || Q.has('fix');
  msg.textContent = 'growing the forest…'; msg.style.opacity = 1;
  await new Promise(r => setTimeout(r, 30));
  const T0 = performance.now();
  genNoise(); { const l = hypot(.33, .78, -.44); SUN = [.33 / l, .78 / l, -.44 / l]; }
  buildWorld(); buildAssets(); buildWorldProps(); buildFlora(); bakeGlow(); buildCollision();
  const genMs = performance.now() - T0;
  // typed mesh tables
  const NM = M.v0.length, mV0 = new Int32Array(M.v0), mI0 = new Uint32Array(M.i0), mIC = new Uint32Array(M.ic), mFL = new Uint8Array(M.fl), mLN = new Int32Array(M.ln), mLD = new Float32Array(M.ld), mMX = new Float32Array(M.mx);
  const ORD = [[], [], []]; for (let m = 0; m < NM; m++) ORD[mFL[m]].push(m);
  const ord = ORD.map(a => new Int32Array(a));
  // ----- GPU resources -----
  const U = GPUBufferUsage, TU = GPUTextureUsage;
  const mkbuf = (data, usage) => { const b = dev.createBuffer({ size: (data.byteLength + 3) & ~3, usage, mappedAtCreation: true }); new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength)); b.unmap(); return b; };
  const vbuf = mkbuf(new Uint8Array(VB, 0, nv * 32), U.VERTEX), ibuf = mkbuf(new Uint32Array(IB.buffer, 0, ni), U.INDEX), fbuf = mkbuf(new Uint8Array(FIB), U.VERTEX);
  const MAXVIS = 60000, stage = new Uint32Array(MAXVIS * 10), ibufI = dev.createBuffer({ size: MAXVIS * 40, usage: U.VERTEX | U.COPY_DST });
  const GU = new Float32Array(120), gbuf = dev.createBuffer({ size: 480, usage: U.UNIFORM | U.COPY_DST });
  const MAXC = 96, DU = new Float32Array((MAXC + 1) * 64), dbuf = dev.createBuffer({ size: (MAXC + 1) * 256, usage: U.UNIFORM | U.COPY_DST });
  const tex = (w, h, format, data, bpp, mips) => { const t = dev.createTexture({ size: [w, h], format, usage: TU.TEXTURE_BINDING | TU.COPY_DST, mipLevelCount: mips || 1 }); dev.queue.writeTexture({ texture: t }, data, { bytesPerRow: w * bpp }, [w, h]); return t; };
  const tN = tex(256, 256, 'rgba8unorm', NZT, 4), tF = tex(256, 256, 'rgba8unorm', FBT, 4, 9);
  { let src = FBT, w = 256; for (let l = 1; l < 9; l++) { const nw = w >> 1, d = new Uint8Array(nw * nw * 4); for (let y = 0; y < nw; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 4; c++) d[(y * nw + x) * 4 + c] = (src[((y * 2) * w + x * 2) * 4 + c] + src[((y * 2) * w + x * 2 + 1) * 4 + c] + src[((y * 2 + 1) * w + x * 2) * 4 + c] + src[((y * 2 + 1) * w + x * 2 + 1) * 4 + c]) / 4; dev.queue.writeTexture({ texture: tF, mipLevel: l }, d, { bytesPerRow: nw * 4 }, [nw, nw]); src = d; w = nw; } }
  const tH = tex(NH, NH, 'r32float', H, 4), tB = tex(1024, 1024, 'rgba8unorm', BIO, 4), tG = tex(512, 512, 'rgba8unorm', GLW, 4);
  const sR = dev.createSampler({ addressModeU: 'repeat', addressModeV: 'repeat', magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear' });
  const sC = dev.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const L0 = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: {} }, { binding: 1, visibility: VF, sampler: {} }, { binding: 2, visibility: VF, sampler: {} }, { binding: 3, visibility: VF, texture: {} }, { binding: 4, visibility: VF, texture: {} }, { binding: 5, visibility: VF, texture: { sampleType: 'unfilterable-float' } }, { binding: 6, visibility: VF, texture: {} }, { binding: 7, visibility: VF, texture: {} }, { binding: 8, visibility: VF, texture: { sampleType: 'depth' } }, { binding: 9, visibility: VF, sampler: { type: 'comparison' } }] });
  const L1 = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { hasDynamicOffset: true, minBindingSize: 32 } }] });
  const L2 = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', multisampled: true } }] });
  // sun shadow map: the static world rendered once from the sun (orthographic)
  const SHN = min(8192, dev.limits.maxTextureDimension2D), mkSh = n => dev.createTexture({ size: [n, n], format: 'depth16unorm', usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING });
  const tSh = mkSh(SHN), vSh = tSh.createView(), sS = dev.createSampler({ compare: 'less', magFilter: 'linear', minFilter: 'linear' });
  const mkBg0 = sh => dev.createBindGroup({ layout: L0, entries: [{ binding: 0, resource: { buffer: gbuf } }, { binding: 1, resource: sR }, { binding: 2, resource: sC }, { binding: 3, resource: tN.createView() }, { binding: 4, resource: tF.createView() }, { binding: 5, resource: tH.createView() }, { binding: 6, resource: tB.createView() }, { binding: 7, resource: tG.createView() }, { binding: 8, resource: sh }, { binding: 9, resource: sS }] });
  const bg0 = mkBg0(vSh), bg0b = mkBg0(mkSh(1).createView());
  const bg1 = dev.createBindGroup({ layout: L1, entries: [{ binding: 0, resource: { buffer: dbuf, size: 32 } }] });
  const smS = dev.createShaderModule({ code: W_SCENE }), smV = dev.createShaderModule({ code: W_VOL }), smP = dev.createShaderModule({ code: W_PART }), smK = dev.createShaderModule({ code: W_SKY }), smQ = dev.createShaderModule({ code: W_POST });
  /*DBG*/for (const s of [smS, smV, smP, smK, smQ]) { const inf = await s.getCompilationInfo(); for (const m of inf.messages) if (m.type == 'error') { console.error(m.lineNum + ':' + m.linePos + ' ' + m.message); fail('shader error: ' + m.message); } }/*END*/
  const vbl = [{ arrayStride: 32, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'snorm8x4' }, { shaderLocation: 2, offset: 16, format: 'unorm8x4' }, { shaderLocation: 3, offset: 20, format: 'float32x2' }, { shaderLocation: 4, offset: 28, format: 'unorm8x4' }] },
  { arrayStride: 40, stepMode: 'instance', attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x4' }, { shaderLocation: 6, offset: 16, format: 'float32x4' }, { shaderLocation: 7, offset: 32, format: 'unorm8x4' }, { shaderLocation: 8, offset: 36, format: 'unorm8x4' }] }];
  const HDR = 'rgba16float', PL01 = dev.createPipelineLayout({ bindGroupLayouts: [L0, L1] }), PL012 = dev.createPipelineLayout({ bindGroupLayouts: [L0, L1, L2] });
  const add = { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } };
  const mkScene = cull => dev.createRenderPipeline({ layout: PL01, vertex: { module: smS, entryPoint: 'vs', buffers: vbl }, fragment: { module: smS, entryPoint: 'fs', targets: [{ format: HDR }] }, primitive: { cullMode: cull, frontFace: 'ccw' }, depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'greater' }, multisample: { count: 4 } });
  const pCull = mkScene('back'), pNo = mkScene('none');
  const pSky = dev.createRenderPipeline({ layout: PL01, vertex: { module: smK, entryPoint: 'vk' }, fragment: { module: smK, entryPoint: 'fk', targets: [{ format: HDR }] }, depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'equal' }, multisample: { count: 4 } });
  const pAdd = dev.createRenderPipeline({ layout: PL012, vertex: { module: smS, entryPoint: 'vs', buffers: vbl }, fragment: { module: smS, entryPoint: 'fsa', targets: [{ format: HDR, blend: add }] }, primitive: { cullMode: 'none' } });
  const pShd = dev.createRenderPipeline({ layout: PL01, vertex: { module: smS, entryPoint: 'vs', buffers: vbl }, fragment: { module: smS, entryPoint: 'fsd', targets: [] }, primitive: { cullMode: 'none' }, depthStencil: { format: 'depth16unorm', depthWriteEnabled: true, depthCompare: 'less', depthBias: 3, depthBiasSlopeScale: 2.5 } });
  const pVol = dev.createRenderPipeline({ layout: PL012, vertex: { module: smV, entryPoint: 'vv' }, fragment: { module: smV, entryPoint: 'fv', targets: [{ format: HDR }] } });
  const pPart = dev.createRenderPipeline({ layout: PL012, vertex: { module: smP, entryPoint: 'vp' }, fragment: { module: smP, entryPoint: 'fp', targets: [{ format: HDR, blend: add }] }, primitive: { topology: 'triangle-strip' } });
  const LQ = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} }, { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} }, { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} }] });
  const PLQ = dev.createPipelineLayout({ bindGroupLayouts: [LQ] });
  const mkPost = (ep, format, blend) => dev.createRenderPipeline({ layout: PLQ, vertex: { module: smQ, entryPoint: 'vq' }, fragment: { module: smQ, entryPoint: ep, targets: [{ format, blend }] } });
  const pD0 = mkPost('fd0', HDR), pD = mkPost('fd', HDR), pU = mkPost('fu', HDR, add), pF = mkPost('ff', fmt), pVC = mkPost('fc', HDR, add);
  // ----- size-dependent targets -----
  const NB = 6; let W = 0, Hh = 0, tMS, tDP, tHD, tVL, bl = [], bgD = [], bgU = [], bgF, bgV, bg2, vMS, vDP, vHD, vBL = [];
  const pV = { colorAttachments: [{ view: null, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] };
  const p1 = { colorAttachments: [{ view: null, resolveTarget: null, clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'discard' }], depthStencilAttachment: { view: null, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' } };
  const p1t = { colorAttachments: p1.colorAttachments, depthStencilAttachment: p1.depthStencilAttachment, timestampWrites: null };
  const p2 = { colorAttachments: [{ view: null, loadOp: 'load', storeOp: 'store' }] };
  const pB = []; for (let i = 0; i < NB * 2; i++) pB.push({ colorAttachments: [{ view: null, loadOp: i < NB ? 'clear' : 'load', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
  const pFin = { colorAttachments: [{ view: null, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] }, pFinT = { colorAttachments: pFin.colorAttachments, timestampWrites: null };
  function resize(w, h) {
    W = w; Hh = h; cv.width = w; cv.height = h;
    for (const t of [tMS, tDP, tHD, tVL, ...bl]) if (t) t.destroy();
    tVL = dev.createTexture({ size: [max(1, w >> 1), max(1, h >> 1)], format: HDR, usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING });
    tMS = dev.createTexture({ size: [w, h], format: HDR, sampleCount: 4, usage: TU.RENDER_ATTACHMENT });
    tDP = dev.createTexture({ size: [w, h], format: 'depth32float', sampleCount: 4, usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING });
    tHD = dev.createTexture({ size: [w, h], format: HDR, usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING });
    vMS = tMS.createView(); vDP = tDP.createView(); vHD = tHD.createView(); bl = []; vBL = [];
    for (let i = 0; i < NB; i++) { const t = dev.createTexture({ size: [max(1, w >> (i + 1)), max(1, h >> (i + 1))], format: HDR, usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING }); bl.push(t); vBL.push(t.createView()); }
    const q = (a, b) => dev.createBindGroup({ layout: LQ, entries: [{ binding: 0, resource: sC }, { binding: 1, resource: a }, { binding: 2, resource: b }] });
    bgD = []; bgU = []; for (let i = 0; i < NB; i++) bgD.push(q(i ? vBL[i - 1] : vHD, vHD)); for (let i = NB - 1; i > 0; i--) bgU.push(q(vBL[i], vHD));
    { const v = tVL.createView(); pV.colorAttachments[0].view = v; bgV = q(v, v); }
    bgF = q(vHD, vBL[0]); bg2 = dev.createBindGroup({ layout: L2, entries: [{ binding: 0, resource: vDP }] });
    p1.colorAttachments[0].view = vMS; p1.colorAttachments[0].resolveTarget = vHD; p1.depthStencilAttachment.view = vDP; p2.colorAttachments[0].view = vHD;
    for (let i = 0; i < NB; i++) pB[i].colorAttachments[0].view = vBL[i]; for (let i = 0; i < NB - 1; i++) pB[NB + i].colorAttachments[0].view = vBL[NB - 2 - i];
  }
  function fit() { if (FIX) { if (!W) resize(2560, 1440); return; } const d = devicePixelRatio || 1, w = max(1, floor(cv.clientWidth * d)), h = max(1, floor(cv.clientHeight * d)); if (w != W || h != Hh) resize(min(w, 4096), min(h, 4096)); }
  // ----- GPU timing -----
  let qs = null, qbuf = null; const RB = [], NR = 8, GT = new Float32Array(24000), CT = new Float32Array(24000); let nG = 0, nC = 0;
  if (hasTS) {
    qs = dev.createQuerySet({ type: 'timestamp', count: 2 }); qbuf = dev.createBuffer({ size: 16, usage: U.QUERY_RESOLVE | U.COPY_SRC });
    for (let i = 0; i < NR; i++) { const r = { b: dev.createBuffer({ size: 16, usage: U.MAP_READ | U.COPY_DST }), busy: false, rec: false, cb: null }; r.cb = () => { const a = new BigInt64Array(r.b.getMappedRange()); const ms = Number(a[1] - a[0]) / 1e6; r.b.unmap(); r.busy = false; if (r.rec && nG < GT.length && ms > 0 && ms < 1000) GT[nG++] = ms; }; RB.push(r); }
    p1t.timestampWrites = { querySet: qs, beginningOfPassWriteIndex: 0 }; pFinT.timestampWrites = { querySet: qs, endOfPassWriteIndex: 1 };
  }
  // ----- camera / input -----
  const cam = { x: SHOTS[0][0], y: SHOTS[0][1], z: SHOTS[0][2], yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0 }, keys = {};
  const lookAt = (lx, ly, lz) => { const dx = lx - cam.x, dy = ly - cam.y, dz = lz - cam.z, l = hypot(dx, dy, dz); cam.pitch = Math.asin(dy / l); cam.yaw = atan2(-dx, -dz); };
  lookAt(SHOTS[0][3], SHOTS[0][4], SHOTS[0][5]);
  let tour = -1, pose = -1, time = 20, benchState = 0, warm = 0, walk = false, probe = null;
  const touch = () => { if (!BENCH) audioStart(); };
  const tog = () => { walk = !walk; PL.x = cam.x; PL.y = cam.y - EYE; PL.z = cam.z; PL.vy = 0; cam.vx = cam.vy = cam.vz = 0; B(2).textContent = 'Mode: ' + (walk ? 'walk' : 'fly'); };
  addEventListener('keydown', e => { keys[e.code] = 1; touch(); if (e.code == 'KeyT') { tour = tour < 0 ? 0 : -1; } if (e.code == 'KeyF') tog(); if (e.code == 'Escape') show(1); if (e.code == 'KeyM') audioMute(); if (e.code == 'Space') e.preventDefault(); });
  addEventListener('keyup', e => { keys[e.code] = 0; });
  cv.addEventListener('click', () => { cv.requestPointerLock(); touch(); });
  B(0).onclick = () => { show(0); touch(); tour = -1; cv.requestPointerLock(); }; B(1).onclick = () => { show(0); touch(); tour = 0; }; B(2).onclick = tog; B(3).onclick = () => { touch(); audioMute(); };
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement != cv && tour < 0) show(1); });
  addEventListener('mousemove', e => { if (document.pointerLockElement == cv) { cam.yaw -= e.movementX * .0022; cam.pitch = clamp(cam.pitch - e.movementY * .0022, -1.55, 1.55); if (tour >= 0 && !BENCH) tour = -1; } });
  // ----- per-frame scratch -----
  const cnt = new Uint32Array(NM), cur = new Uint32Array(NM), off = new Uint32Array(NM), vI = new Uint32Array(MAXP), vMm = new Int32Array(MAXP), dyn = new Uint32Array(1);
  const cMin = new Float32Array(4096), cMax = new Float32Array(4096); cMin.fill(1e9); cMax.fill(-1e9);
  for (let j = 0; j < 1024; j++) for (let i = 0; i < 1024; i++) { const c = (j >> 4) * 64 + (i >> 4), h = H[j * NH + i]; if (h < cMin[c]) cMin[c] = h; if (h > cMax[c]) cMax[c] = h; }
  const cSlot = new Int32Array(MAXC), cDen = new Float32Array(MAXC); let nCell = 0, nVis = 0;
  const FLn = FLORA.length, flId = new Int32Array(FLORA.map(f => f.id)), flN = new Int32Array(FLORA.map(f => f.n)), flF = new Int32Array(FLORA.map(f => f.first));
  const NL = LIGHTS.length / 7; for (let i = 0; i < min(NL, 8); i++) { GU[40 + i * 4] = LIGHTS[i * 7]; GU[41 + i * 4] = LIGHTS[i * 7 + 1]; GU[42 + i * 4] = LIGHTS[i * 7 + 2]; GU[43 + i * 4] = LIGHTS[i * 7 + 3]; GU[72 + i * 4] = LIGHTS[i * 7 + 4]; GU[73 + i * 4] = LIGHTS[i * 7 + 5]; GU[74 + i * 4] = LIGHTS[i * 7 + 6]; }
  for (let i = NL; i < 8; i++) GU[43 + i * 4] = 1;
  const NEAR = .25, TY = Math.tan(60 * PI / 360);
  let wsp = 0, wox = 0, woz = 0, fx = 0, fy = 0, fz = -1, rx = 1, ry = 0, rz = 0, ux = 0, uy = 1, uz = 0;
  function setCam() {
    const cp = cos(cam.pitch), sp = sin(cam.pitch), cy = cos(cam.yaw), sy = sin(cam.yaw), asp = W / Hh;
    fx = -sy * cp; fy = sp; fz = -cy * cp; rx = cy; ry = 0; rz = -sy; ux = ry * fz - rz * fy; uy = rz * fx - rx * fz; uz = rx * fy - ry * fx;
    const sx = 1 / (TY * asp), s2 = 1 / TY, ex = cam.x, ey = cam.y, ez = cam.z;
    GU[0] = sx * rx; GU[4] = sx * ry; GU[8] = sx * rz; GU[12] = -sx * (rx * ex + ry * ey + rz * ez);
    GU[1] = s2 * ux; GU[5] = s2 * uy; GU[9] = s2 * uz; GU[13] = -s2 * (ux * ex + uy * ey + uz * ez);
    GU[2] = 0; GU[6] = 0; GU[10] = 0; GU[14] = NEAR;
    GU[3] = fx; GU[7] = fy; GU[11] = fz; GU[15] = -(fx * ex + fy * ey + fz * ez);
    GU[16] = ex; GU[17] = ey; GU[18] = ez; GU[19] = time; GU[20] = SUN[0]; GU[21] = SUN[1]; GU[22] = SUN[2]; GU[23] = 1;
    GU[24] = W; GU[25] = Hh; GU[26] = NEAR; GU[27] = TY; GU[28] = rx; GU[29] = ry; GU[30] = rz; GU[31] = asp; GU[32] = ux; GU[33] = uy; GU[34] = uz; GU[36] = fx; GU[37] = fy; GU[38] = fz;
  }
  function mantas() {
    for (let k = 0; k < MANTA.length; k++) {
      const m = MANTA[k], c = m.c, i = m.i, o = i * 10, a = time * m.w + m.ph, a2 = a + .02 * (m.w > 0 ? 1 : -1);
      const R1 = c[3] * (1 + .25 * sin(3 * a)), R2 = c[3] * (1 + .25 * sin(3 * a2));
      const x = c[0] + cos(a) * R1, y = c[1] + sin(a * 2 + m.ph) * c[4], z = c[2] + sin(a) * R1 * .75, x2 = c[0] + cos(a2) * R2, y2 = c[1] + sin(a2 * 2 + m.ph) * c[4], z2 = c[2] + sin(a2) * R2 * .75;
      let dx = x2 - x, dy = y2 - y, dz = z2 - z; const l = hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const yaw = atan2(-dx, -dz), pit = Math.asin(dy), roll = (m.w > 0 ? 1 : -1) * (.42 + .2 * sin(3 * a + 1));
      // q = qyaw * qpitch(x) * qroll(z)
      const sy = sin(yaw / 2), cy = cos(yaw / 2), sp = sin(pit / 2), cp = cos(pit / 2), sr = sin(roll / 2), cr = cos(roll / 2);
      // qp*qr
      const ax = sp * cr, ay = -sp * sr, az = cp * sr, aw = cp * cr;
      pf[o] = x; pf[o + 1] = y; pf[o + 2] = z; pf[o + 4] = cy * ax + sy * az; pf[o + 5] = cy * ay + sy * aw; pf[o + 6] = cy * az - sy * ax; pf[o + 7] = cy * aw - sy * ay; pcen(i);
    }
  }
  // counting sort of the n chosen instances (vI / vMm) by mesh into the instance buffer
  function flush(n) {
    let o = 0; for (let g = 0; g < 3; g++) { const a = ord[g]; for (let k = 0; k < a.length; k++) { const m = a[k]; off[m] = o; cur[m] = o; o += cnt[m]; } }
    for (let j = 0; j < n; j++) { const d = cur[vMm[j]]++ * 10, s = vI[j] * 10; for (let e = 0; e < 10; e++) stage[d + e] = pw[s + e]; }
    nVis = n; if (n) dev.queue.writeBuffer(ibufI, 0, stage, 0, n * 10);
  }
  function cull() {
    cnt.fill(0); let n = 0; const ex = cam.x, ey = cam.y, ez = cam.z, tx = TY * W / Hh, kx = sqrt(1 + tx * tx), ky = sqrt(1 + TY * TY);
    for (let i = 0; i < np; i++) {
      const cx = pC[i * 4] - ex, cy = pC[i * 4 + 1] - ey, cz = pC[i * 4 + 2] - ez, r = pC[i * 4 + 3], z = cx * fx + cy * fy + cz * fz; if (z < -r) continue;
      let m = pM[i]; const s = pS[i], d2 = cx * cx + cy * cy + cz * cz, mx = mMX[m] * s; if (mx > 0 && d2 > (mx + r) * (mx + r)) continue;
      const x = cx * rx + cy * ry + cz * rz; if (abs(x) > z * tx + r * kx) continue; const y = cx * ux + cy * uy + cz * uz; if (abs(y) > z * TY + r * ky) continue;
      const d = sqrt(d2); while (mLN[m] >= 0 && d > mLD[m] * s) m = mLN[m];
      if (n >= MAXVIS) break; vI[n] = i; vMm[n] = m; cnt[m]++; n++;
    }
    flush(n);
    // flora cells
    nCell = 0; const c0x = floor(ex / TILE), c0z = floor(ez / TILE);
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      const cxi = c0x + dx, czi = c0z + dz; if (cxi < -32 || cxi > 31 || czi < -32 || czi > 31 || nCell >= MAXC) continue;
      const ci = (czi + 32) * 64 + cxi + 32, lo = cMin[ci], hi = cMax[ci], px = cxi * TILE + 24 - ex, pz = czi * TILE + 24 - ez, py = clamp(ey, lo, hi + 3) - ey, dd = hypot(px, py, pz) - 34; if (dd > 211) continue;
      const my = (lo + hi) / 2 + 1.5 - ey, r = 35 + (hi - lo) / 2 + 3, z = px * fx + my * fy + pz * fz; if (z < -r) continue;
      const x = px * rx + my * ry + pz * rz; if (abs(x) > z * tx + r * kx) continue; const y = px * ux + my * uy + pz * uz; if (abs(y) > z * TY + r * ky) continue;
      const d = max(dd, 1), dn = min(1, pow(22 / d, 1.5)), rot = (h2(cxi, czi) * 4 | 0) * PI / 2, b = (nCell + 1) * 64;
      DU[b] = cxi * TILE; DU[b + 1] = czi * TILE; DU[b + 2] = 1; DU[b + 4] = cos(rot); DU[b + 5] = sin(rot); cDen[nCell] = dn; nCell++;
    }
    dev.queue.writeBuffer(dbuf, 0, DU, 0, (nCell + 1) * 64);
  }
  function drawGroup(ps, g) { const a = ord[g]; for (let k = 0; k < a.length; k++) { const m = a[k], c = cnt[m]; if (c) ps.drawIndexed(mIC[m], c, mI0[m], mV0[m], off[m]); } }
  // ----- benchmark / capture API -----
  let last = 0, shotQ = null, CAP = 0, kick = 0; /*DBG*/{ const mc = new MessageChannel(); CAP = Q.has('fix') && !BENCH; kick = () => mc.port2.postMessage(0); mc.port1.onmessage = () => frame(performance.now()); }/*END*/
  const stats = a => { const s = Float32Array.from(a).sort(), n = s.length; let t = 0; for (let i = 0; i < n; i++) t += s[i]; return n ? { n, avg: t / n, p50: s[n >> 1], p99: s[min(n - 1, floor(n * .99))], max: s[n - 1] } : null; };
  /*DBG*/window.__lum = {
    gen: genMs, verts: nv, tris: ni / 3, props: () => np, meshes: NM, vis: () => nVis, cells: () => nCell,
    pose: i => { pose = i; tour = -1; }, tourTime: t => { pose = -2; tour = -1; tourAt(t); cam.x = _tp[0]; cam.y = _tp[1]; cam.z = _tp[2]; lookAt(_tp[3], _tp[4], _tp[5]); time = 20 + t; },
 au: AU,
    walkTo: (x, y, z) => { pose = -1; tour = -1; walk = true; PL.x = x; PL.y = y; PL.z = z; PL.vy = 0; }, pl: PL, keys, getH,
    flick: async (t0, t1, st) => { const c2 = document.createElement('canvas'); c2.width = 32; c2.height = 18; const g = c2.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; const out = []; let p1 = null, p2 = null, tp = 0;
      for (let t = t0; t < t1; t += st || 1 / 60) { window.__lum.tourTime(t); await new Promise(r => { probe = r; }); g.drawImage(cv, 0, 0, 32, 18); const d = g.getImageData(0, 0, 32, 18).data, b = new Float32Array(576); for (let i = 0; i < 576; i++) b[i] = (d[i * 4] * .3 + d[i * 4 + 1] * .6 + d[i * 4 + 2] * .1) / 255;
        if (p2) { let w = 0, wi = 0; for (let i = 0; i < 576; i++) { const x = i % 32, y = i / 32 | 0; let nb = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx > 31 || yy > 17) { nb = 1; continue; } const j = yy * 32 + xx; nb = max(nb, p2[j], b[j]); } const s = p1[i] - nb; if (s > w) { w = s; wi = i; } } if (w > .06) out.push([+tp.toFixed(3), +w.toFixed(2), wi % 32, wi / 32 | 0]); } p2 = p1; p1 = b; tp = t; }
      return out; },
    shot: (name, small) => new Promise(r => { shotQ = { name, r, wait: 12, small }; }), cam, setTime: t => { time = t; }, near: (x, z, r) => { const o = []; for (let i = 0; i < np; i++) { const d = hypot(pf[i * 10] - x, pf[i * 10 + 2] - z); if (d < r && M.r[pM[i]] * pS[i] > 25) o.push([pM[i], Math.round(pf[i * 10]), Math.round(pf[i * 10 + 2]), +pS[i].toFixed(2), Math.round(M.r[pM[i]])]); } return o; }, trees: TREES.map(t => t.id), fungi: FUNGI,
    clearance: () => { let worst = 1e9, at = 0; for (let t = 0; t < 60; t += .1) { tourAt(t); const c = _tp[1] - getH(_tp[0], _tp[2]); if (c < worst) { worst = c; at = t; } } return [worst, at]; }

  };/*END*/
  function frame(now) {
    const dtr = last ? (now - last) / 1000 : .016; last = now; const dt = min(dtr, .1);
    fit();
    if (BENCH) {
      if (benchState == 0) { if (++warm > 120) { benchState = 1; tour = 0; nG = 0; nC = 0; } tourAt(0); }
      else if (benchState == 1) { if (nC < CT.length) CT[nC++] = dtr * 1000; tour += dtr; if (tour >= 60) { benchState = 2; tour = -1; setTimeout(finish, 600); } }
    } else if (tour >= 0) { tour += dt; if (tour >= 60) { tour = -1; if (document.pointerLockElement != cv) show(1); } }
    if (pose != -2) time += dt;
    if (tour >= 0 || (BENCH && benchState == 0)) { tourAt(max(tour, 0)); cam.x = _tp[0]; cam.y = _tp[1]; cam.z = _tp[2]; lookAt(_tp[3], _tp[4], _tp[5]); if (BENCH) time = 20 + max(tour, 0); }
    else if (pose >= 0) { const s = SHOTS[pose]; cam.x = s[0]; cam.y = s[1]; cam.z = s[2]; lookAt(s[3], s[4], s[5]); }
    else if (pose == -1 && walk) {
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 30 : 13), f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), l = hypot(f, st) || 1;
      walkStep(dt, (-sin(cam.yaw) * f + cos(cam.yaw) * st) * sp / l, (-cos(cam.yaw) * f - sin(cam.yaw) * st) * sp / l, keys.Space);
      const r = hypot(PL.x, PL.z); if (r > 1280) { PL.x *= 1280 / r; PL.z *= 1280 / r; }
      cam.x = PL.x; cam.z = PL.z; const ty = PL.y + EYE; cam.y = PL.g ? cam.y + (ty - cam.y) * (1 - exp(-dt * 14)) : ty;
      wsp = hypot(PL.x - wox, PL.z - woz) / max(dt, 1e-3); wox = PL.x; woz = PL.z;
    }
    else if (pose == -1) {
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 190 : 34), f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), up = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
      const cp = cos(cam.pitch), wx = (-sin(cam.yaw) * cp * f + cos(cam.yaw) * st) * sp, wy = (sin(cam.pitch) * f + up) * sp, wz = (-cos(cam.yaw) * cp * f - sin(cam.yaw) * st) * sp, k = 1 - exp(-dt * 9);
      cam.vx += (wx - cam.vx) * k; cam.vy += (wy - cam.vy) * k; cam.vz += (wz - cam.vz) * k; cam.x += cam.vx * dt; cam.y += cam.vy * dt; cam.z += cam.vz * dt;
      const r = hypot(cam.x, cam.z); if (r > 1280) { cam.x *= 1280 / r; cam.z *= 1280 / r; }
      cam.y = clamp(cam.y, getH(cam.x, cam.z) + 1.6, 720);
    }
    else wsp = 0;
    audioTick(dt, cam, walk && pose == -1 && tour < 0, PL, wsp, time);
    setCam(); mantas(); cull(); dev.queue.writeBuffer(gbuf, 0, GU);
    let rb = null; if (BENCH && hasTS) for (let i = 0; i < NR; i++) if (!RB[i].busy) { rb = RB[i]; break; }
    const enc = dev.createCommandEncoder();
    let ps = enc.beginRenderPass(rb ? p1t : p1);
    ps.setBindGroup(0, bg0); dyn[0] = 0; ps.setBindGroup(1, bg1, dyn, 0, 1);
    ps.setVertexBuffer(0, vbuf); ps.setVertexBuffer(1, ibufI); ps.setIndexBuffer(ibuf, 'uint32');
    ps.setPipeline(pCull); drawGroup(ps, 0); ps.setPipeline(pNo); drawGroup(ps, 1);
    ps.setVertexBuffer(1, fbuf);
    for (let c = 0; c < nCell; c++) { dyn[0] = (c + 1) * 256; ps.setBindGroup(1, bg1, dyn, 0, 1); const dn = cDen[c]; for (let f = 0; f < FLn; f++) { const m = flId[f], k = min(flN[f], ceil(flN[f] * dn) + 1); ps.drawIndexed(mIC[m], k, mI0[m], mV0[m], flF[f]); } }
    ps.setPipeline(pSky); ps.draw(3); ps.end();
    ps = enc.beginRenderPass(pV); ps.setPipeline(pVol); ps.setBindGroup(0, bg0); dyn[0] = 0; ps.setBindGroup(1, bg1, dyn, 0, 1); ps.setBindGroup(2, bg2); ps.draw(3); ps.end();
    ps = enc.beginRenderPass(p2); ps.setPipeline(pVC); ps.setBindGroup(0, bgV); ps.draw(3); ps.setBindGroup(0, bg0); dyn[0] = 0; ps.setBindGroup(1, bg1, dyn, 0, 1); ps.setBindGroup(2, bg2);
    ps.setVertexBuffer(0, vbuf); ps.setVertexBuffer(1, ibufI); ps.setIndexBuffer(ibuf, 'uint32'); ps.setPipeline(pAdd); drawGroup(ps, 2);
    ps.setPipeline(pPart); ps.draw(4, 24000); ps.end();
    for (let i = 0; i < NB; i++) { ps = enc.beginRenderPass(pB[i]); ps.setPipeline(i ? pD : pD0); ps.setBindGroup(0, bgD[i]); ps.draw(3); ps.end(); }
    for (let i = 0; i < NB - 1; i++) { ps = enc.beginRenderPass(pB[NB + i]); ps.setPipeline(pU); ps.setBindGroup(0, bgU[i]); ps.draw(3); ps.end(); }
    pFin.colorAttachments[0].view = ctx.getCurrentTexture().createView();
    ps = enc.beginRenderPass(rb ? pFinT : pFin); ps.setPipeline(pF); ps.setBindGroup(0, bgF); ps.draw(3); ps.end();
    if (rb) { enc.resolveQuerySet(qs, 0, 2, qbuf, 0); enc.copyBufferToBuffer(qbuf, 0, rb.b, 0, 16); }
    dev.queue.submit([enc.finish()]);
    if (rb) { rb.busy = true; rb.rec = benchState == 1; rb.b.mapAsync(GPUMapMode.READ).then(rb.cb); }
    /*DBG*/if (shotQ && --shotQ.wait <= 0) { const q = shotQ; shotQ = null; let src = cv; if (q.small) { src = document.createElement('canvas'); src.width = 1280; src.height = 720; src.getContext('2d').drawImage(cv, 0, 0, 1280, 720); } src.toBlob(b => fetch('/save?name=' + q.name, { method: 'POST', body: b }).then(() => q.r(q.name)), 'image/png'); }
    if (probe) { const p = probe; probe = null; p(); }/*END*/
    if (benchState == 2) return; if (CAP) kick(); else requestAnimationFrame(frame);
  }
  function finish() {
    const g = stats(GT.subarray(0, nG)), c = stats(CT.subarray(0, nC));
    const res = { resolution: W + 'x' + Hh, frames: nC, gpuFrames: nG, gpu: g, cpuInterval: c, timestampQuery: hasTS, ua: navigator.userAgent, adapter: (ad.info || {}).vendor + ' ' + (ad.info || {}).architecture + ' ' + (ad.info || {}).description, genMs, verts: nv, tris: ni / 3 };
    window.__bench = res;
    msg.style.opacity = 1; msg.style.whiteSpace = 'pre'; msg.textContent = 'benchmark ' + res.resolution + '\nGPU ' + (g ? 'avg ' + g.avg.toFixed(2) + ' p99 ' + g.p99.toFixed(2) + ' max ' + g.max.toFixed(2) + ' ms (' + g.n + ' frames)' : 'timestamp queries unavailable') + '\nCPU interval avg ' + c.avg.toFixed(2) + ' p99 ' + c.p99.toFixed(2) + ' max ' + c.max.toFixed(2) + ' ms';
    if (Q.has('save')) fetch('/save?name=bench.json', { method: 'POST', body: JSON.stringify({ res, gpu: Array.from(GT.subarray(0, nG)), cpu: Array.from(CT.subarray(0, nC)) }) });
  }
  // ----- bake the sun shadow map -----
  {
    const L = SUN, xl = hypot(L[2], L[0]), Xx = L[2] / xl, Xz = -L[0] / xl, Yx = L[1] * Xz, Yy = L[2] * Xx - L[0] * Xz, Yz = -L[1] * Xx, S = 1 / 1500;
    const m = [Xx * S, Yx * S, -L[0] / 2500, 0, 0, Yy * S, -L[1] / 2500, 0, Xz * S, Yz * S, -L[2] / 2500, 0, 0, -120 * S, .56, 1];
    GU.fill(0, 0, 40); GU.set(m, 0); GU.set(m, 104); GU[23] = 2; GU[19] = 20; GU[16] = 1e6; dev.queue.writeBuffer(gbuf, 0, GU);
    cnt.fill(0); let n = 0; for (let i = 0; i < np; i++) { const k = pM[i]; if (pu[i * 40 + 39] || mFL[k] == 2 || k == A.manta || k == A.jelly) continue; vI[n] = i; vMm[n] = k; cnt[k]++; n++; }
    flush(n);
    const enc = dev.createCommandEncoder(), ps = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: vSh, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } });
    ps.setPipeline(pShd); ps.setBindGroup(0, bg0b); dyn[0] = 0; ps.setBindGroup(1, bg1, dyn, 0, 1); ps.setVertexBuffer(0, vbuf); ps.setVertexBuffer(1, ibufI); ps.setIndexBuffer(ibuf, 'uint32'); drawGroup(ps, 0); drawGroup(ps, 1); ps.end();
    dev.queue.writeBuffer(dbuf, 0, DU, 0, 64); dev.queue.submit([enc.finish()]);
  }
  msg.style.opacity = 0; tog(); show(!FIX); /*DBG*/if (Q.has('pose')) pose = +Q.get('pose');/*END*/
  fit(); if (CAP) kick(); else requestAnimationFrame(frame);
}
main().catch(e => { console.error(e); const m = document.getElementById('m'); m.textContent = 'Could not start: ' + (e.message || e); m.style.opacity = 1; });
