// ===== WGSL =====
const W_COMMON = /*wgsl*/`
struct Gl { vp: mat4x4f, cam: vec4f, sun: vec4f, res: vec4f, cr: vec4f, cu: vec4f, cf: vec4f, lp: array<vec4f,8>, lc: array<vec4f,8>, sm: mat4x4f }
@group(0) @binding(0) var<uniform> G: Gl;
@group(0) @binding(1) var sR: sampler;
@group(0) @binding(2) var sC: sampler;
@group(0) @binding(3) var tN: texture_2d<f32>;
@group(0) @binding(4) var tF: texture_2d<f32>;
@group(0) @binding(5) var tH: texture_2d<f32>;
@group(0) @binding(6) var tB: texture_2d<f32>;
@group(0) @binding(7) var tG: texture_2d<f32>;
@group(0) @binding(8) var tS: texture_depth_2d;
@group(0) @binding(9) var sS: sampler_comparison;
var<private> FP: f32 = 0.01;
fn sat(x: f32) -> f32 { return clamp(x, 0., 1.); }
fn n3(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f*f*(3.-2.*f);
  let uv = (i.xy + vec2f(37., 17.)*i.z) + u.xy;
  let rg = textureSampleLevel(tN, sR, (uv+.5)/256., 0.).yx;
  return mix(rg.x, rg.y, u.z);
}
fn fb(p: vec2f, s: f32) -> vec4f { return textureSampleLevel(tF, sR, p*s, log2(max(FP*s*256., 1.))); }
const SUNH = vec2f(.6, -.8);
fn skyc(rd: vec3f) -> vec3f {
  let az = dot(normalize(rd.xz + vec2f(1e-5)), SUNH)*.5+.5;
  let hor = mix(vec3f(.03,.075,.2), vec3f(.07,.28,.36), az*az);
  let zen = vec3f(.012,.024,.09);
  var c = mix(hor, zen, 1.-exp(-max(rd.y, 0.)*3.5));
  c = mix(c, hor*.55, sat(-rd.y*3.));
  return c;
}
fn glw(p: vec3f) -> vec3f { let g = textureSampleLevel(tG, sC, p.xz/3072.+.5, 0.).rgb; return g*g*4.; }
fn fogv(wp: vec3f) -> vec4f {
  let v = wp - G.cam.xyz; let d = length(v); let rd = v/max(d, 1e-3);
  let a = G.cam.y/170.; let b = wp.y/170.; let dd = b-a;
  var k = exp(-a);
  if (abs(dd) > 1e-3) { k = (exp(-a)-exp(-b))/dd; }
  let mid = G.cam.xyz + v*.5;
  let nz = fb(mid.xz + vec2f(G.cam.w*1.5, 0.), 1./800.).r;
  let tau = d*(.00045 + .0027*min(k, 6.)*(.6+.8*nz));
  let T = exp(-tau);
  let g1 = glw(G.cam.xyz + v*.3); let g2 = glw(G.cam.xyz + v*.7);
  let near = vec3f(.012,.026,.07) + (g1+g2)*.09;
  let far = skyc(normalize(vec3f(rd.x, abs(rd.y)*.2+.03, rd.z)))*.9 + g2*.05;
  let fc = mix(near, far, 1.-exp(-d/650.));
  return vec4f(fc*(1.-T), T);
}
// sun shadow map lookup: 1 = lit
fn shp(p: vec3f) -> vec3f { let c = G.sm*vec4f(p, 1.); return vec3f(c.x*.5 + .5, .5 - c.y*.5, min(c.z, .9999)); }
fn shd(p: vec3f) -> f32 { let c = shp(p); return textureSampleCompareLevel(tS, sS, c.xy, c.z); }
fn hgt(w: vec2f) -> f32 {
  let f = clamp(w/3. + 512., vec2f(0.), vec2f(1023.99)); let i = vec2i(floor(f)); let u = fract(f);
  let a = textureLoad(tH, i, 0).r; let b = textureLoad(tH, i+vec2i(1,0), 0).r; let c = textureLoad(tH, i+vec2i(0,1), 0).r; let d = textureLoad(tH, i+vec2i(1,1), 0).r;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;
const W_SCENE = W_COMMON + /*wgsl*/`
struct Dr { c: vec4f, r: vec4f }
@group(1) @binding(0) var<uniform> D: Dr;
@group(2) @binding(0) var tD: texture_depth_multisampled_2d;
struct VI { @location(0) pos: vec3f, @location(1) nrm: vec4f, @location(2) col: vec4f, @location(3) uv: vec2f, @location(4) mat: vec4f,
  @location(5) ipos: vec4f, @location(6) iq: vec4f, @location(7) itint: vec4f, @location(8) imisc: vec4f }
struct VO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) col: vec4f, @location(3) uv: vec2f,
  @location(4) @interpolate(flat) mid: u32, @location(5) tint: vec4f, @location(6) aux: vec3f }
fn qrot(q: vec4f, v: vec3f) -> vec3f { return v + 2.*cross(q.xyz, cross(q.xyz, v) + q.w*v); }
fn dens(d: f32) -> f32 { return min(1., pow(22./max(d, 1.), 1.5)) * (1.-smoothstep(170., 210., d)); }
@vertex fn vs(v: VI) -> VO {
  var o: VO; let mid = u32(v.mat.x*255.+.5); let t = G.cam.w;
  var s = v.ipos.w; var base = v.ipos.xyz; var tint = v.itint; let ph = v.imisc.x;
  var lp = v.pos; var fade = 1.;
  if (mid == 9u) {
    let a = abs(v.uv.x); let w = t*1.5*(.7+ph*.6) + ph*40.;
    lp.y += (sin(w - a*2.1)*a*a*.44 + sin(w-.6)*.05)*12.;
    lp.x *= 1. - .08*a*(.5+.5*sin(w - 1.));
    if (v.uv.y > 1.) { let k = v.uv.y-1.; lp.x += sin(w*1.3 - k*7.)*k*3.; lp.y += cos(w - k*5.)*k*2. + sin(w-.6)*.6; }
  }
  if (mid == 10u) { let pu = sin(t*1.2*(.6+ph) + ph*30. - v.uv.x*2.2); let k = min(v.uv.x, 1.); lp = vec3f(lp.x*(1.+.2*pu*k), lp.y + .15*pu*k, lp.z*(1.+.2*pu*k)); if (v.uv.x > 1.) { let j = v.uv.x-1.; lp.x += sin(t*.9+ph*20.+j*5.)*j*.5; lp.z += cos(t*.7+ph*10.+j*4.)*j*.5; } }
  if (D.c.z > .5) {
    let l = base.xz - 24.; let w2 = D.c.xy + vec2f(l.x*D.r.x - l.y*D.r.y, l.x*D.r.y + l.y*D.r.x) + 24.;
    let bio = textureSampleLevel(tB, sC, w2/3072.+.5, 0.);
    let h = hgt(w2); let p0 = vec3f(w2.x, h, w2.y);
    let dn = dens(distance(p0, G.cam.xyz));
    fade = sat((dn - v.imisc.y)/(.25*dn + .004));
    if (v.imisc.z > bio.r) { fade = 0.; }
    s *= 1. + .9*(1.-dn);
    base = vec3f(w2.x, h + base.y*s, w2.y);
    tint = vec4f(tint.rgb*mix(vec3f(.75,.95,1.4), vec3f(1.4,.85,.75), bio.g), tint.a*(.7+.8*bio.b));
  } else {
    let md = v.imisc.z*255.*8.;
    if (md > 0. && G.sun.w < 1.5) { fade = 1.-smoothstep(.8, 1., distance(base, G.cam.xyz)/md); }
    if (v.imisc.w > 0.) { base.y += sin(t*.23 + ph*40.)*1.6*sqrt(s); base.x += sin(t*.11 + ph*17.)*1.2*sqrt(s); }
  }
  let p = qrot(v.iq, lp*s*fade);
  var wp = base + p;
  let amp = v.mat.y*v.mat.y*16.*s*fade;
  if (amp > 0.) {
    let g = .5+.5*sin(t*.11 + dot(base.xz, vec2f(.004, .003)));
    let a = t*(.45+ph*.35) + ph*40. + v.mat.w*23. + base.x*.05 + base.z*.04;
    wp += vec3f(sin(a) + .5*sin(a*2.3+1.7), .12*sin(a*1.7), cos(a*.8+ph*9.) + .5*sin(a*1.9+v.mat.w*5.)) * (.3+.7*g) * amp;
  }
  o.cp = G.vp * vec4f(wp, 1.); o.wp = wp; o.n = qrot(v.iq, v.nrm.xyz); o.col = v.col; o.uv = v.uv; o.mid = mid; o.tint = tint;
  o.aux = vec3f(v.mat.z, v.mat.w, ph);
  return o;
}
fn sc(c: vec2f, z: f32) -> f32 { return textureSampleCompareLevel(tS, sS, c, z); }
fn shd5(p: vec3f) -> f32 {
  let c = shp(p); let d = 1.7/f32(textureDimensions(tS).x); let e = d*.4;
  return (sc(c.xy, c.z)*2. + sc(c.xy + vec2f(d, e), c.z) + sc(c.xy + vec2f(-e, d), c.z) + sc(c.xy + vec2f(-d, -e), c.z) + sc(c.xy + vec2f(e, -d), c.z))/6.;
}
fn shade(i: VO, ff: bool) -> vec4f {
  let t = G.cam.w; let nl0 = length(i.n); var n = vec3f(0., 1., 0.); if (nl0 > 1e-4) { n = i.n/nl0; } if (!ff) { n = -n; }
  let vv = G.cam.xyz - i.wp; let dist = max(length(vv), 1e-3); let V = vv/dist; let wp = i.wp;
  FP = dist*G.res.w*2./G.res.y;
  let L = G.sun.xyz; let tint = i.tint.rgb*2.; let eg = i.tint.a*2.;
  var alb = i.col.rgb*tint; var em = vec3f(0.); var tr = 0.; var spec = 0.; var gloss = 24.; var alpha = 1.;
  let ao = i.aux.x; let ex = i.aux.y; let ph = i.aux.z; let ev = i.col.a; let nv = sat(dot(n, V));
  let pulse = .65+.35*sin(t*.7 + ph*6.283 + ex*4.);
  switch (i.mid) {
    case 0u: {
      let bio = textureSampleLevel(tB, sC, wp.xz/3072.+.5, 0.);
      let f1 = fb(wp.xz, 1./31.); let f2 = fb(wp.xz, 1./5.3);
      let veg = mix(vec3f(.05,.02,.09), vec3f(.13,.02,.06), bio.g)*(.5+1.2*f1.r)*(.6+.8*f2.g);
      let st = fb(vec2f(wp.y + f1.b*14., (wp.x+wp.z)*.15), 1./40.).r;
      let rk = mix(vec3f(.05,.058,.08), vec3f(.14,.125,.18), st)*(.6+.8*f2.b);
      let rm = sat(bio.a*1.3 + smoothstep(.78, .5, n.y));
      alb = mix(veg, rk, rm);
      let moss = smoothstep(.35, .7, bio.b*(.4+f1.g*1.2))*(1.-rm*.7);
      alb = mix(alb, vec3f(.015,.11,.1), moss*.8);
      let sp = smoothstep(.62, .8, f2.a)*smoothstep(.5, .75, fb(wp.xz, 1./1.7).r);
      em = mix(vec3f(.5,.08,.4), vec3f(.05,.8,.75), sat(moss*1.5 + f1.a - .3))*sp*(.25+moss*.6)*(.7+.3*sin(t*.5 + f1.r*20.))*(1.-rm);
      spec = .15*rm; gloss = 30.;
    }
    case 1u: {
      let q = wp*vec3f(.11,.02,.11);
      let nq = n3(q*1.4 + vec3f(ex*7.));
      let v1 = abs(fract(wp.x*.13 + wp.z*.11 + 1.2*nq) - .5); let v2 = abs(fract(wp.x*.31 - wp.z*.27 + 2.3*n3(q*2.6 + 5.)) - .5);
      let w = .022 + dist*.00022; let mk = max(smoothstep(.3, .55, n3(q*.6 + 9.)), ev*1.6 - .8);
      let v3 = abs(fract(wp.y*.09 + 1.5*n3(q*3.3 + 11.)) - .5);
      let ln = ((1.-smoothstep(0., w, v1)) + .5*(1.-smoothstep(0., w, v2)) + .5*(1.-smoothstep(0., w*.8, v3))*smoothstep(.75, 1., ev))*mk;
      alb *= 1.2 + 2.2*n3(wp*.6);
      let wave = pow(.5+.5*sin(wp.y*.045 - t*.55 + ph*6.283 + v1*6.), 3.);
      em = mix(vec3f(.03,.75,1.), vec3f(.6,.3,1.), ex)*ln*ev*(.25+1.8*wave)*eg*(1.1 + 2.5*smoothstep(.75, 1., ev));
      spec = .08;
    }
    case 2u: {
      let u = i.uv.x; let v = abs(i.uv.y);
      let rib = 1.-smoothstep(0., .13, v); let sv = (1.-smoothstep(0., .22, abs(fract(u*7. - v*1.4) - .5)))*(1.-v)*.5;
      em = alb*(rib + sv + smoothstep(.55, 1., v)*.35 + .12)*ev*pulse*eg*1.; tr = .75; alb *= .6; spec = .1;
    }
    case 3u: {
      let u = i.uv.x; let a = i.uv.y*6.2832;
      if (ex > .75) { let g = mix(pow(abs(sin(a*16.)), 1.5), .5, sat(dist/200.)); em = alb*(.05+.3*g)*(.2+.8*u*u)*ev*eg*pulse; alb *= .2; }
      else {
        let nn = fb(vec2f(u*3., i.uv.y*8.), 1.).r;
        let rg = 1.-smoothstep(0., .2, abs(fract(u*3.5 + nn*.9 - t*.02) - .5));
        let mem = step(.25, ex);
        let rad = pow(abs(sin(a*mix(9., 24., mem))), 8.)*mix(smoothstep(.55,.75,nn), 1., mem);
        em = alb*(rg*.7*u + rad*mix(.8, .3, mem) + .12*mem + .55*smoothstep(.82, 1., u))*ev*eg*pulse*1.2; tr = max(smoothstep(.6, 1., u)*.8, mem*.7); alb *= .7; spec = .04;
      }
    }
    case 4u: {
      let f1 = fb(wp.xz + wp.y*.7, 1./23.); let st = fb(vec2f(wp.y*1.3 + f1.b*10., (wp.x-wp.z)*.2), 1./30.).r;
      alb = mix(vec3f(.07,.08,.11), vec3f(.2,.18,.26), st)*(.55+.9*n3(wp*.8))*tint;

      let ms = smoothstep(.45, .8, n.y)*smoothstep(.3, .6, f1.g + .15);
      alb = mix(alb, mix(vec3f(.02,.1,.09), vec3f(.08,.025,.1), f1.a), ms);
      em = vec3f(.05,.7,.65)*ms*smoothstep(.66, .8, fb(wp.xz, 1./2.3).a)*.35 + skyc(vec3f(-V.x, .15, -V.z))*pow(1.-nv, 2.5)*1.2;
      spec = .25*(1.-ms); gloss = 40.;
    }
    case 5u: {
      let hx = fract(ex*7.31); let c = mix(mix(vec3f(.08,.65,.85), vec3f(.5,.3,.95), smoothstep(.3, .7, ex + dot(n, vec3f(.12,.05,.1)))), vec3f(.9,.35,.6), step(.96, hx)*.6)*tint;
      let fr = pow(1.-nv, 3.); let R = reflect(-V, n);
      let cu = 1.-i.uv.x; let frc = (1.-smoothstep(0., .04, abs(n3(vec3f(i.uv.x*5., i.uv.y*9., ex*9.)) - .5)))*.5;
      let inner = c*(.05 + .25*pow(nv, 1.5) + (1.9*cu*cu + frc*cu)*(.7+.3*sin(t*.6 + ph*6.283 + i.uv.x*3.)))*ev*eg;
      alb = c*.14; em = inner + (skyc(R)*6. + glw(wp)*.6)*c*fr*1.2 + c*fr*.25; spec = 1.2; gloss = 120.;
    }
    case 6u: {
      let f1 = fb(wp.xz + wp.y*.6, 1./19.);
      alb = vec3f(.1,.09,.13)*(.5+1.*f1.r)*(.6+.8*n3(wp*1.3))*(.7+.6*fb(wp.xz + wp.y, 1./2.1).b);
      let q = vec2f(i.uv.x*6., i.uv.y*24.); let cell = floor(q); let fq = fract(q);
      let hs = fract(sin(dot(cell, vec2f(12.9898, 78.233)))*43758.5453);
      let band = step(abs(fract(q.y/8.) - .5), .13)*step(.35, fract(hs*7.3)); let gl = band*step(.5, hs)*(1.-smoothstep(.05, .12, abs(abs(fq.x-.5) - .3*hs)))*step(abs(fq.y-.5), .38) + band*step(hs, .3)*(1.-smoothstep(.06, .14, abs(fq.y-.5)))*step(abs(fq.x-.5), .4);
      let crk = 1.-smoothstep(0., .035, abs(n3(wp*.33) - .5)); alb *= (1. - .6*crk)*(.8+.5*n3(wp*4.)); alb *= 1. - .4*(1.-smoothstep(0., .05, fq.x))*step(.6, fract(hs*3.1)) - .3*(1.-smoothstep(0., .1, abs(fract(q.y/8.) - .5) - .13 + .1));
      em = vec3f(.1,.75,.95)*gl*smoothstep(.4, .55, n3(wp*.06 + 7.))*ev*(.3+.7*pow(.5+.5*sin(t*.4 + cell.x*.7 + ph*6.), 2.))*1.5*smoothstep(700., 200., dist);
      let ms = smoothstep(.5, .85, n.y)*smoothstep(.35, .6, f1.g);
      alb = mix(alb, vec3f(.02,.09,.085), ms*.8); spec = .2; gloss = 50.;
    }
    case 7u: {
      let u = i.uv.x; let v = i.uv.y;
      if (ex > .75) {
        let f = fb(wp.xz + vec2f(t*.8, t*.5), 1./37.).r*fb(wp.xz - vec2f(t*.6, -t*.4), 1./21.).g;
        em = vec3f(.03,.5,.6)*(.25+3.2*f); alb = vec3f(.005,.02,.03); spec = 1.5; gloss = 200.;
      } else {
        let sp = select(1., 4., ex < .25);
        let uu = u*select(1., .12, ex < .25); let wv = v + .25*sin(u*.9 + t*.3); let f = fb(vec2f(wv*2.2, uu*.5 - t*.35*sp*.3), 1./3.).r; let g = fb(vec2f(wv*5.+7., uu*.9 - t*.6*sp*.3), 1./2.).g;
        let s = smoothstep(.3, .8, f*.6 + g*.5); let ed = pow(max(1.-v*v, 0.), 1.5)*(.75+.25*sin(u*.37));
        em = mix(vec3f(.0,.12,.2), vec3f(.08,.7,.85), s)*(.25+.9*s); alpha = ed*(.3+.7*s)*.55; alb = vec3f(0.); alb = vec3f(.01,.03,.04); spec = 1.; gloss = 150.;
      }
    }
    case 8u: { em = alb*ev*eg*pulse*1.5*(.45+.55*nv*nv); tr = .5; alb *= .7+.3*ao; }
    case 9u: {
      if (i.uv.y > 1.) { em = alb*ev*3.; }
      else { let a = abs(i.uv.x); let sp = smoothstep(.45, .6, fb(i.uv*vec2f(6., 3.), 1.).r); let ln = 1.-smoothstep(0., .2, abs(fract(a*7. - i.uv.y*1.5) - .5));
        em = mix(vec3f(.1,.8,1.), vec3f(.6,.3,1.), a)*(sp*.8 + ln*.6*a)*ev*1.6*pulse; }
      tr = .4; spec = .3;
    }
    case 10u: {
      let rim = pow(1.-nv, 1.5); let st = pow(abs(sin(i.uv.y*6.283*8.)), 6.)*step(i.uv.x, 1.);
      return vec4f(tint*(rim*.8 + .1 + st*.45*i.uv.x)*eg*.8, 1.);
    }
    case 12u: { em = alb*ev*eg*(1.1 + 2.*pow(nv, 2.) + 1.5*n3(wp*.25 + vec3f(0., t*.15, 0.)))*pulse*.9; alb *= .1; }
    default: {}
  }
  let lpj = wp.xz - L.xz*(wp.y/L.y);
  let ndl = dot(n, L);
  let sh = shd5(wp + n*(.7*step(0., ndl)) + L*(.4 + 1.6*tr));
  let ca = mix(.4, smoothstep(.2, .45, fb(lpj + vec2f(t*1.3, t*.7), 1./37.).r*fb(lpj - vec2f(t*.9, -t*1.1), 1./23.).g), 1.-smoothstep(120., 260., wp.y));
  let key = vec3f(.3,.55,.72)*5.5*sh*(.3+1.3*ca);
  let amb = mix(vec3f(.05,.035,.09), vec3f(.05,.09,.2), n.y*.5+.5);
  var lit = amb*ao + key*(max(ndl, 0.) + max(-ndl, 0.)*tr*.35 + tr*.08)*mix(.5, 1., ao) + glw(wp)*ao*.85;
  for (var k = 0; k < 8; k++) {
    let lv = G.lp[k].xyz - wp; let d2 = max(dot(lv, lv), 1e-4); let r = G.lp[k].w;
    var w = sat(1. - d2/(r*r)); w *= w;
    lit += G.lc[k].rgb*.4*w*(sat(dot(n, lv)*inverseSqrt(d2)*.6+.4) + tr*.5)*mix(.5, 1., ao);
  }
  var c = alb*lit + em;
  c += key*spec*pow(sat(dot(n, normalize(L+V))), gloss)*.6;
  c += skyc(vec3f(-V.x, .1, -V.z))*pow(1.-nv, 4.)*.5*ao;
  return vec4f(c, alpha);
}
@fragment fn fs(i: VO, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let o = shade(i, ff); let f = fogv(i.wp); return vec4f(min(max(o.rgb*f.a + f.rgb, vec3f(0.)), vec3f(24.)), 1.);
}
// shadow pass: foliage lets about half the light through in organic patches (dappled light)
@fragment fn fsd(i: VO) { if (i.mid == 2u || i.mid == 8u) { if (textureSampleLevel(tF, sR, i.wp.xz/23. + i.wp.y/31., 0.).r > .36) { discard; } } }
@fragment fn fsa(i: VO, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let o = shade(i, ff); let f = fogv(i.wp);
  let zs = textureLoad(tD, vec2i(i.cp.xy), 0); let sw = G.res.z/max(zs, 1e-7); let fw = 1./i.cp.w;
  let soft = sat((sw - fw)/2.);
  return vec4f(min(max(o.rgb*o.a*soft*f.a, vec3f(0.)), vec3f(24.)), 1.);
}
`;
// light shafts: march the view ray through the sun shadow map (half resolution)
const W_VOL = W_COMMON + /*wgsl*/`
@group(2) @binding(0) var tD: texture_depth_multisampled_2d;
struct SO { @builtin(position) cp: vec4f, @location(0) d: vec3f }
@vertex fn vv(@builtin(vertex_index) i: u32) -> SO {
  var o: SO; let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u))*2. - 1.;
  o.cp = vec4f(p, 0., 1.); o.d = G.cf.xyz + G.cr.xyz*p.x*G.res.w*G.cr.w + G.cu.xyz*p.y*G.res.w; return o;
}
@fragment fn fv(i: SO) -> @location(0) vec4f {
  let zs = textureLoad(tD, min(vec2i(i.cp.xy)*2, vec2i(G.res.xy) - 1), 0);
  let dl = length(i.d); let rd = i.d/dl;
  let tm = min(G.res.z/max(zs, 1e-7)*dl, 1200.);
  let j = fract(52.9829189*fract(dot(i.cp.xy, vec2f(.06711056, .00583715))));
  var od = 0.; var acc = 0.;
  for (var k = 0; k < 32; k++) {
    let u = (f32(k) + j)/32.; let t = tm*u*sqrt(u); let dt = tm*1.5*sqrt(u)/32.;
    let p = G.cam.xyz + rd*t;
    let w = textureSampleLevel(tF, sR, p.xz/260. + vec2f(p.y/190. + G.cam.w*.004, G.cam.w*.003), 1.).g;
    let s = (.0005 + .003*exp(-max(p.y, -70.)/170.))*smoothstep(340., 170., p.y)*(.35 + 1.3*w);
    acc += shd(p)*s*dt*exp(-od - s*dt*.5); od += s*dt;
  }
  let c = dot(rd, G.sun.xyz); let ph = .45 + .25*c*c + 1.6*pow(sat(c), 6.);
  return vec4f(vec3f(.2,.5,.75)*acc*ph*1.15, 1.);
}
`;
const W_PART = W_COMMON + /*wgsl*/`
@group(2) @binding(0) var tD: texture_depth_multisampled_2d;
struct PO { @builtin(position) cp: vec4f, @location(0) uv: vec2f, @location(1) col: vec3f, @location(2) sz: f32 }
fn h3u(n: u32) -> vec3f {
  var x = n*747796405u + 2891336453u; x = ((x >> ((x >> 28u) + 4u)) ^ x)*277803737u; x = (x >> 22u) ^ x;
  let y = x*1664525u + 1013904223u; let z = y*1664525u + 1013904223u;
  return vec3f(f32(x >> 8u), f32((y ^ (y >> 15u)) >> 8u), f32((z ^ (z >> 13u)) >> 8u))/16777216.;
}
const SC = array<vec3f,6>(vec3f(-500.,40.,-110.), vec3f(30.,-60.,-362.), vec3f(590.,50.,-430.), vec3f(400.,200.,320.), vec3f(-250.,90.,620.), vec3f(-480.,150.,-260.));
fn spath(c: vec3f, R: f32, w: f32, a: vec3f, tt: f32) -> vec3f { return c + vec3f(cos(tt*w + a.x)*R, sin(tt*w*1.7 + a.y)*R*.22, sin(tt*w*1.3 + a.z)*R); }
@vertex fn vp(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> PO {
  var o: PO; let h = h3u(ii); let g = h3u(ii + 91939u); let t = G.cam.w; let cam = G.cam.xyz; let fi = f32(ii)/24000.;
  var p = vec3f(0.); var pv = vec3f(0.); var col = vec3f(.1,.8,.9); var size = .1; var br = 1.; var stretch = 0.;
  let cyan = vec3f(.1,.85,1.); let vio = vec3f(.55,.3,1.); let pink = vec3f(1.,.25,.6); let gold = vec3f(1.,.7,.25);
  if (fi < .8) {
    let far = fi >= .55;
    let B = select(vec3f(150.,100.,150.), vec3f(800.,300.,800.), far);
    var q = h*B + vec3f((g.x-.5)*.8, .2+g.y*.9, (g.z-.5)*.8)*t;
    let sp = t*(.25+g.z*.5) + h.x*40.;
    q += vec3f(sin(sp), .3*sin(sp*.7), cos(sp))*(.4+2.5*g.x*g.x) + vec3f(1.2, 0., .7)*t*step(.6, h.z);
    let r = fract((q - cam)/B) - .5; p = cam + r*B;
    br = smoothstep(1., .8, max(abs(r.x), max(abs(r.y), abs(r.z)))*2.);
    size = select(.05+.16*g.y*g.y, .5+1.1*g.y*g.y, far);
    if (far) { br *= .05; }
    col = cyan;
    if (h.y > .62) { col = vio; } if (h.y > .86) { col = pink; }
    if (h.y > .94) { col = gold*1.6; br *= .35+.65*pow(.5+.5*sin(t*(1.5+g.x*2.) + h.x*50.), 4.); }
  } else if (fi < .9) {
    let k = u32((fi-.8)/.1*16.); let hs = h3u(k*7919u + 13u); let hs2 = h3u(k*104729u + 7u);
    var sc = SC; let c = sc[k % 6u] + (hs2 - .5)*vec3f(120., 40., 120.);
    let w = .1+.1*hs.x; let R = 45.+70.*hs.y; let tt = t - (g.x*2.5 + g.y*g.y*3.)/(w*10.);
    let off = vec3f(sin(t*.9 + h.x*6.3), sin(t*1.1 + h.y*6.3), cos(t*.8 + h.z*6.3))*(1.5+9.*g.z*g.z);
    p = spath(c, R, w, hs2*6.3, tt) + off; pv = spath(c, R, w, hs2*6.3, tt - .05) + off;
    stretch = 1.; size = .2+.12*g.y; col = mix(cyan, select(vio, gold, hs2.y > .7), hs.z*.8)*1.3;
  } else {
    let cs = 40.; let cl = floor(cam.xz/cs) + floor((h.xz - .5)*7. + .5); let ci = vec2i(cl);
    let hc = h3u(bitcast<u32>(ci.x*73856093) ^ bitcast<u32>(ci.y*19349663));
    let e = (cl + hc.xy)*cs; let age = fract(t/(5.+3.*hc.z) + hc.x + g.x*.12);
    let dir = normalize(g - .5 + vec3f(0., .7, 0.));
    p = vec3f(e.x, hgt(e) + 1.2, e.y) + dir*pow(age, .5)*(2.5+8.*g.y) - vec3f(0., age*age*2., 0.);
    br = (1.-age)*(1.-age)*smoothstep(150., 100., distance(p, cam)); size = .06+.05*g.z; col = select(gold, pink, hc.y > .6)*1.4;
  }
  FP = 1.; br *= fogv(p).a;
  let c0 = G.vp*vec4f(p, 1.);
  var px = size*G.res.y/(2.*G.res.w*max(c0.w, .01));
  if (px < 1.6) { br *= px*px/2.56; px = 1.6; }
  br *= smoothstep(4., 24., c0.w); if (px > 26.) { br *= 26./px; px = 26.; }
  let cn = vec2f(f32(vi & 1u), f32(vi >> 1u))*2. - 1.;
  var ax = vec2f(1., 0.); var ext = 1.;
  if (stretch > 0.) { let c1 = G.vp*vec4f(pv, 1.); if (c1.w > .1 && c0.w > .1) { let dp = (c0.xy/c0.w - c1.xy/c1.w)*G.res.xy*.5; let l = length(dp); if (l > .5) { ax = dp/l; ext = 1. + min(l/px, 2.); } } }
  let offp = ax*cn.x*px*ext + vec2f(-ax.y, ax.x)*cn.y*px;
  o.cp = vec4f(c0.xy + offp*2./G.res.xy*c0.w, c0.z, c0.w); o.uv = cn; o.col = col*br*.6/sqrt(ext); o.sz = size;
  return o;
}
@fragment fn fp(i: PO) -> @location(0) vec4f {
  let d = length(i.uv); let a = (exp(-d*d*4.5)*.8 + .7*exp(-d*d*30.))*smoothstep(1., .7, d);
  let zs = textureLoad(tD, vec2i(i.cp.xy), 0); let sw = G.res.z/max(zs, 1e-7); let fw = 1./i.cp.w;
  return vec4f(min(max(i.col*a*sat((sw - fw)/(i.sz*3. + .3)), vec3f(0.)), vec3f(8.)), 1.);
}
`;
const W_SKY = W_COMMON + /*wgsl*/`
struct SO { @builtin(position) cp: vec4f, @location(0) d: vec3f }
@vertex fn vk(@builtin(vertex_index) i: u32) -> SO {
  var o: SO; let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u))*2. - 1.;
  o.cp = vec4f(p, 0., 1.); o.d = G.cf.xyz + G.cr.xyz*p.x*G.res.w*G.cr.w + G.cu.xyz*p.y*G.res.w; return o;
}
@fragment fn fk(i: SO) -> @location(0) vec4f {
  let rd = normalize(i.d); var c = skyc(rd); FP = .001;
  let up = sat(rd.y*4.);
  let q = rd*260.; let ci = floor(q); let f = fract(q) - .5;
  let hs = fract(sin(dot(ci, vec3f(12.9898, 78.233, 37.719)))*43758.5453);
  c += vec3f(.6,.8,1.)*step(.985, hs)*exp(-dot(f, f)*22.)*(hs-.985)*90.*up;
  let nb = fb(rd.xz/(abs(rd.y)+.35), .35); c += vec3f(.1,.04,.2)*smoothstep(.4, .8, nb.r)*up + vec3f(.0,.05,.07)*nb.g*up;
  let m1 = normalize(vec3f(.8, .46, -.3)); let dm = dot(rd, m1);
  let disc = smoothstep(.985, .9862, dm);
  let rp = rd - m1*dm; let bx = normalize(cross(m1, vec3f(0., 1., 0.))); let by = cross(bx, m1);
  let p2 = vec2f(dot(rp, bx), dot(rp, by))/.1725; let pz = sqrt(max(1. - dot(p2, p2), 0.));
  let shd = sat(dot(vec3f(p2, pz), normalize(vec3f(-.55, .5, .45))))*.9 + .04;
  let bnd = .75 + .25*sin(p2.y*13. + 3.*fb(p2*vec2f(.3, 1.), .7).r);
  c = mix(c, vec3f(.2,.42,.5)*shd*bnd + vec3f(.05,.16,.22)*pow(1.-pz, 3.), disc*.92);
  let rr = length(vec2f(p2.x*.94 + p2.y*.34, (p2.y*.94 - p2.x*.34)*3.4))*.1725;
  c += (vec3f(.2,.4,.5)*smoothstep(.03, 0., abs(rr - .27))*.5 + vec3f(.15,.3,.4)*smoothstep(.016, 0., abs(rr - .33))*.4)*(1.-disc)*up;
  let m2 = normalize(vec3f(.75, .35, .4)); c = mix(c, vec3f(.5,.35,.6)*.6, smoothstep(.9992, .9995, dot(rd, m2)));
  c += vec3f(.03,.1,.13)*pow(sat(dm), 60.)*.5;
  return vec4f(min(max(c, vec3f(0.)), vec3f(24.)), 1.);
}
`;
const W_POST = /*wgsl*/`
@group(0) @binding(0) var s: sampler;
@group(0) @binding(1) var tA: texture_2d<f32>;
@group(0) @binding(2) var tB: texture_2d<f32>;
struct PV { @builtin(position) cp: vec4f, @location(0) uv: vec2f }
@vertex fn vq(@builtin(vertex_index) i: u32) -> PV { var o: PV; let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)); o.cp = vec4f(p*2. - 1., 0., 1.); o.uv = vec2f(p.x, 1. - p.y); return o; }
fn S(uv: vec2f) -> vec3f { return min(max(textureSampleLevel(tA, s, uv, 0.).rgb, vec3f(0.)), vec3f(24.)); }
fn down(uv: vec2f) -> vec3f {
  let d = 1./vec2f(textureDimensions(tA));
  var c = S(uv)*.125;
  c += (S(uv + d*vec2f(-1.,-1.)) + S(uv + d*vec2f(1.,-1.)) + S(uv + d*vec2f(-1.,1.)) + S(uv + d*vec2f(1.,1.)))*.125;
  c += (S(uv + d*vec2f(-2.,0.)) + S(uv + d*vec2f(2.,0.)) + S(uv + d*vec2f(0.,-2.)) + S(uv + d*vec2f(0.,2.)))*.0625;
  c += (S(uv + d*vec2f(-2.,-2.)) + S(uv + d*vec2f(2.,-2.)) + S(uv + d*vec2f(-2.,2.)) + S(uv + d*vec2f(2.,2.)))*.03125;
  return c;
}
@fragment fn fd0(i: PV) -> @location(0) vec4f { let c = down(i.uv); let l = max(c.r, max(c.g, c.b)); return vec4f(c*(max(l - .55, 0.)/(l + 1e-4)*.9 + .04), 1.); }
@fragment fn fd(i: PV) -> @location(0) vec4f { return vec4f(down(i.uv), 1.); }
@fragment fn fu(i: PV) -> @location(0) vec4f {
  let d = 1./vec2f(textureDimensions(tA)); let uv = i.uv;
  var c = S(uv)*4. + (S(uv + d*vec2f(-1.,0.)) + S(uv + d*vec2f(1.,0.)) + S(uv + d*vec2f(0.,-1.)) + S(uv + d*vec2f(0.,1.)))*2.;
  c += S(uv + d*vec2f(-1.,-1.)) + S(uv + d*vec2f(1.,-1.)) + S(uv + d*vec2f(-1.,1.)) + S(uv + d*vec2f(1.,1.));
  return vec4f(c/16.*.75, 1.);
}
@fragment fn fc(i: PV) -> @location(0) vec4f {
  let d = 1.1/vec2f(textureDimensions(tA)); let uv = i.uv;
  return vec4f((S(uv)*2. + S(uv + d) + S(uv - d) + S(uv + d*vec2f(1., -1.)) + S(uv + d*vec2f(-1., 1.)))/6., 1.);
}
fn aces(c0: vec3f) -> vec3f {
  let m1 = mat3x3f(.59719,.076,.0284, .35458,.90834,.13383, .04823,.01566,.83777);
  let m2 = mat3x3f(1.60475,-.10208,-.00327, -.53108,1.10813,-.07276, -.07367,-.00605,1.07602);
  let v = m1*c0; let a = v*(v + .0245786) - .000090537; let b = v*(.983729*v + .432951) + .238081;
  return clamp(m2*(a/b), vec3f(0.), vec3f(1.));
}
@fragment fn ff(i: PV) -> @location(0) vec4f {
  var c = max(textureSampleLevel(tA, s, i.uv, 0.).rgb, vec3f(0.)) + max(textureSampleLevel(tB, s, i.uv, 0.).rgb, vec3f(0.))*.5;
  let q = i.uv - .5; c *= 1.05*(1. - .4*pow(length(q*vec2f(1.1, 1.))*1.3, 2.5));
  c = aces(c); c = mix(c, c*c*(3. - 2.*c), .25);
  c = pow(c, vec3f(1./2.2));
  let ign = fract(52.9829189*fract(dot(i.cp.xy, vec2f(.06711056, .00583715))));
  return vec4f(c + (ign - .5)/255., 1.);
}
`;
