# The Luminous Abyss

A real-time, fully procedural bioluminescent alien forest, written for native WebGPU and delivered as **one self-contained `index.html`** (under 100 kB minified). No engine, no external assets, no network requests: every mesh, texture, shader, animation and sound is generated in the browser from a fixed seed.

## Run it

Open `index.html` in a recent Chromium browser (WebGPU needs `https://` or `localhost`):

```bash
npm run serve
```

Then visit `http://localhost:8377/`.

## Controls

| Key | Action |
|---|---|
| Mouse | look around (click **Explore** to capture the mouse) |
| W A S D | move |
| Shift | move fast / run |
| Space | jump (walking) |
| Q / E | down / up (flying) |
| F | switch between walking and flying |
| T | 60-second guided flight |
| M | sound on / off |
| Esc | menu |

The demo starts in walk mode. The menu lists the same controls.

## What is in it

- **World:** five regions (Awakening Grove, Crystal Ravine, Root Cathedral, Floating Gardens, Ancient Sanctuary) and five landmarks on a 3 km heightfield.
- **Life:** megatrees up to 300 m, giant fungi, ground flora, crystals, jellies, mantas and drifting spores.
- **Light:** baked sun shadow map, ray-marched light shafts, height fog, bloom and ACES tone mapping, 4x MSAA.
- **Walking:** triangle-accurate collision against trunks, roots, caps, rocks, crystals, ruins and floating islands.
- **Sound:** procedural WebAudio ambience (drone, wind, chimes, manta calls, water, footsteps).

## Build

```bash
npm install
```

```bash
npm run build
```

`npm run build` concatenates `src/*.js` into `src/shell.html`, minifies the WGSL and JavaScript, and writes `index.html`. `npm run dev` writes an unminified build that keeps the debug capture helpers.

| Path | Contents |
|---|---|
| `src/a_core.js` | math, seeded noise, world layout, geometry builder |
| `src/b_assets.js` | procedural meshes: trees, fungi, flora, rocks, creatures |
| `src/c_place.js` | world placement, landmarks, guided-flight path |
| `src/d2_collide.js` | collision and the walking character |
| `src/d3_audio.js` | ambient sound |
| `src/d_shaders.js` | WGSL shaders |
| `src/e_render.js` | WebGPU setup, frame loop, input, menu, benchmark |
| `tools/` | build script and dev server |

## Releases

Pushing a tag that starts with `v` runs `.github/workflows/release.yml`, which builds `index.html`, checks it is under 100 kB and attaches it to a GitHub release:

```bash
git tag v1.0.1
```

```bash
git push origin v1.0.1
```

## Benchmark

Add `?bench` to the URL to run the guided flight at a fixed 2560x1440 with GPU timestamp queries. Last measured on an RTX 3060 in Chrome 157: GPU average 8.9 ms, p99 13.5 ms, max 14.1 ms per frame.
