// ===== procedural ambient sound (WebAudio). Starts on the first click or key press; M mutes =====
const AU = { c: null, on: 1, t: 0, chime: 2, call: 9, stride: 0, g: 1, vy: 0, nv: 0 };
let _as = 77123; const arn = () => { _as = (_as * 1664525 + 1013904223) >>> 0; return _as / 4294967296; };
const NOTES = [220, 262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047];
function audioStart() {
  if (AU.c) { if (AU.c.state != 'running') AU.c.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = AU.c = new AC(), sr = c.sampleRate, out = AU.out = c.createGain(), cmp = c.createDynamicsCompressor();
  out.gain.value = 0; out.gain.setTargetAtTime(.9, c.currentTime, 2); out.connect(cmp); cmp.connect(c.destination);
  // echo bus (cheap space)
  const wet = AU.wet = c.createGain(), dl = c.createDelay(1), fbk = c.createGain(), lp = c.createBiquadFilter();
  dl.delayTime.value = .41; fbk.gain.value = .58; lp.type = 'lowpass'; lp.frequency.value = 2200; wet.connect(dl); dl.connect(lp); lp.connect(fbk); fbk.connect(dl); lp.connect(out);
  // noise layers
  const nb = c.createBuffer(1, sr * 5, sr), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = arn() * 2 - 1;
  const noise = (type, f, q, o) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(out); s.start(0, o); return { f: fl.frequency, g: g.gain }; };
  AU.wind = noise('lowpass', 200, .3, 0); AU.rum = noise('lowpass', 85, .8, 2.1); AU.water = noise('bandpass', 1700, .7, 3.2); AU.step = noise('lowpass', 420, 1.2, .7);
  // drone: slow breathing chord
  const dlp = c.createBiquadFilter(), dg = AU.drone = c.createGain(); dlp.type = 'lowpass'; dlp.frequency.value = 520; dg.gain.value = .5; dlp.connect(dg); dg.connect(out); dg.connect(wet);
  [[55, .16, 'sine'], [82.5, .1, 'triangle'], [110.4, .07, 'sine'], [164.6, .045, 'triangle'], [220.7, .03, 'sine'], [329.2, .014, 'sine']].forEach((v, i) => {
    const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = v[2]; o.frequency.value = v[0]; g.gain.value = v[1] * .6;
    l.frequency.value = .03 + .017 * i; lg.gain.value = v[1] * .4; l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(dlp); o.start(); l.start();
  });
  // voice pool: chimes (0-5) and creature calls (6-7)
  AU.v = []; for (let i = 0; i < 8; i++) { const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner(), w = c.createGain(); g.gain.value = 0; w.gain.value = i < 6 ? .7 : .9; o.connect(g); g.connect(p); p.connect(out); p.connect(w); w.connect(wet); o.start(); AU.v.push({ f: o.frequency, g: g.gain, p: p.pan }); }
}
function audioMute() { if (!AU.c) return; AU.on = 1 - AU.on; document.getElementById('b3').textContent = 'Sound: ' + (AU.on ? 'on' : 'off'); AU.out.gain.setTargetAtTime(AU.on * .9, AU.c.currentTime, .15); }
function audioTick(dt, cam, walking, P, speed, time) {
  const c = AU.c; if (!c || c.state != 'running') return; const now = c.currentTime, v = AU.v;
  // chimes: quicker among the crystals of the ravine and the crown
  AU.chime -= dt * (1 + 1.6 * clamp(1 - min(polyD(RAV, cam.x, cam.z), hypot(cam.x - CRN[0], cam.z - CRN[1])) / 260, 0, 1));
  if (AU.chime < 0) {
    AU.chime = 1 + 4.5 * arn(); const k = arn() * 12 | 0, m = arn() < .35 ? 3 : 1;
    for (let j = 0; j < m; j++) { const o = v[AU.nv = (AU.nv + 1) % 6], t = now + j * (.16 + .1 * arn()), a = (.035 + .05 * arn()) / (1 + j * .5); o.f.setValueAtTime(NOTES[(k + j * 2) % 12] * (arn() < .25 ? 2 : 1), t); o.p.setValueAtTime(arn() * 1.6 - .8, t); o.g.cancelScheduledValues(t); o.g.setTargetAtTime(a, t, .008); o.g.setTargetAtTime(0, t + .04, .5 + .7 * arn()); }
  }
  // distant calls of the mantas: louder and panned towards the nearest one
  AU.call -= dt;
  if (AU.call < 0) {
    AU.call = 11 + 20 * arn(); let bd = 1e9, bx = 0, bz = 0; for (let k = 0; k < MANTA.length; k++) { const o = MANTA[k].i * 10, dx = pf[o] - cam.x, dy = pf[o + 1] - cam.y, dz = pf[o + 2] - cam.z, dd = hypot(dx, dy, dz); if (dd < bd) { bd = dd; bx = dx; bz = dz; } }
    const a = .028 + .1 * clamp(1 - bd / 500, 0, 1), pan = clamp((bx * cos(cam.yaw) - bz * sin(cam.yaw)) / (bd + 1), -1, 1), f0 = 150 + 130 * arn();
    for (let j = 0; j < 2; j++) { const o = v[6 + j], f = f0 * (j ? 1.5 : 1), t = now + j * .05; o.p.setValueAtTime(pan * .8, t); o.f.cancelScheduledValues(t); o.f.setValueAtTime(f, t); o.f.exponentialRampToValueAtTime(f * (1.25 + .3 * arn()), t + 1.1); o.f.exponentialRampToValueAtTime(f * .8, t + 2.8); o.g.cancelScheduledValues(t); o.g.setTargetAtTime(a * (j ? .35 : 1), t, .35); o.g.setTargetAtTime(0, t + 1.5, .6); }
  }
  // footsteps and landings
  if (walking) {
    if (P.g && !AU.g && AU.vy < -12) { AU.step.f.setValueAtTime(160, now); AU.step.g.cancelScheduledValues(now); AU.step.g.setTargetAtTime(min(.9, -AU.vy * .02), now, .006); AU.step.g.setTargetAtTime(0, now + .05, .12); AU.stride = 0; }
    if (P.g) AU.stride += min(speed, 40) * dt;
    if (AU.stride > 5.2) { AU.stride = 0; AU.step.f.setValueAtTime(260 + 260 * arn(), now); AU.step.g.cancelScheduledValues(now); AU.step.g.setTargetAtTime(.2 + .12 * arn(), now, .005); AU.step.g.setTargetAtTime(0, now + .03, .05); }
    AU.g = P.g; AU.vy = P.vy;
  }
  // slow mix changes, 8 times a second
  AU.t -= dt; if (AU.t > 0) return; AU.t = .125;
  const gh = getH(cam.x, cam.z), h = clamp((cam.y - gh) / 300, 0, 1), deep = clamp((-10 - cam.y) / 50, 0, 1), gust = .5 + .3 * sin(time * .23) + .2 * sin(time * .61 + 1.7), ws = hypot(polyD(STR, cam.x, cam.z), (cam.y - gh) * .6);
  AU.wind.g.setTargetAtTime((.012 + .04 * h) * (.4 + gust) * (1 - .6 * deep), now, .6); AU.wind.f.setTargetAtTime(130 + 150 * gust + 90 * h, now, .8);
  AU.rum.g.setTargetAtTime(.05 + .2 * deep, now, .8); AU.water.g.setTargetAtTime(.045 * clamp(1 - ws / 110, 0, 1) ** 2, now, .5);
  AU.drone.gain.setTargetAtTime(.5 - .2 * h, now, 1);
}
