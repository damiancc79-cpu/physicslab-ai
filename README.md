# PhysicsLab AI

PhysicsLab AI is a browser-based 3D physics simulation sandbox for experimenting with soft bodies, particle fluids, gravity wells, pinned cloth, debug overlays, shaded cloth and soft-body surfaces, quality presets, scene JSON import/export, benchmark scenes, and local AI scene generation plus parameter optimization.

## Run

```bash
npm install
npm run dev
```

## Build And Test

```bash
npm run build
npm test
npm run lint
npm audit
```

GitHub Actions runs build, unit tests, lint, and Playwright smoke tests on pushes to `main` or `master` and on pull requests.

Playwright smoke tests are available for browser-level demo checks:

```bash
npx playwright install chromium firefox webkit
npm run test:smoke
npm run test:smoke:chromium
```

## Browser Requirements

The app requires a modern browser with WebGL2. It attempts to initialize a Three.js WebGPU renderer when `navigator.gpu` is available. If WebGPU is unavailable or initialization fails, it falls back to WebGL and shows the renderer mode in the viewport. v0.3 does not use GPU compute yet.

## Included Presets

- Soft Body Cube: mass-spring lattice with adjustable stiffness, damping, gravity, mass, resolution, size, solver passes, and velocity clamping for stability.
- Particle Fluid: fluid-like particles with cohesion, repulsion, viscosity, gravity, radius, boundary controls, and a lightweight spatial neighbor grid.
- Gravity Sandbox: orbital particles with attractor strength, attractor count, trails, damping, timestep, spawn radius, moving attractors, and speed limiting.
- Cloth Sheet: pinned spring cloth with adjustable resolution, wind, turbulence, pin spacing, damping, gravity, and solver passes.

## AI Lab Assistant

The assistant is deterministic and local. It supports scene generation commands such as "Create a low-gravity jelly cube scene", "Generate a chaotic orbital scene with three attractors", "Make a heavy fluid with slow motion", "Create a cloth flag in strong wind", and "Create a benchmark-friendly gravity scene". It also supports stability and optimization commands such as "why is this unstable?", "make this stable", "optimize this for 60 FPS", "reduce GPU load", and "optimize aggressively". `FutureOpenAIProvider` is a stub for a later secure integration and includes no API keys.

## v0.3 Features

- Scene preset schema: exported JSON uses a formal v0.3 schema with preset identity, preset type, description, simulation parameters, rendering settings, performance settings, debug settings, and assistant metadata.
- AI Scene Generator: natural-language scene requests generate complete validated presets and apply them immediately.
- Stability Analyzer: risky values surface as warnings in the performance rail and assistant explanations.
- Performance Optimizer: conservative, balanced, and aggressive optimization modes adjust parameters, debug rendering, surface mode, and quality settings while staying valid.
- Before/After Diff: assistant-generated changes show previous value, new value, and reason.
- User Preset Library: save local scene presets with generated thumbnails and reload them from the controls panel.
- Benchmark Reports: export the latest benchmark results, saved history, baseline, and summary as JSON.
- Cross-Browser Smoke Coverage: Playwright is configured for Chromium, Firefox, and WebKit, with a Chromium-only script for quick local checks.
- Quality presets: Low, Medium, High, and Extreme apply validated parameter sets for the active demo.
- Auto Performance: when enabled, the app reduces the highest-cost controls if average FPS drops below the target range.
- Run Benchmark: runs Soft Body, Particle Fluid, Gravity, and Cloth benchmark scenes for a fixed frame count, then displays average FPS, average frame time, max frame time, simulation step time, object count, named run history, compact history bars, and baseline FPS delta.
- Surface view: choose Debug particles/springs, Shaded surface, or Both. Cloth and soft-body presets expose simple shaded meshes with updated normals; soft body uses an exterior-only surface skin.
- Export JSON: saves the active scene as a v0.3 schema preset.
- Import JSON: loads v0.3 scene presets and legacy configs exported by PhysicsLab AI v0.1 through v0.2.1.
- Screenshot export remains available from the control panel.

## Benchmarking

Use the Run Benchmark button in the metrics panel. Results are saved in browser storage, can be named before each run, can promote the latest run to the active baseline, and can be referenced by the AI Lab Assistant with prompts such as "summarize benchmark performance" or "which benchmark was slowest?".

Use the Report button after a benchmark run to export `physicslab-ai-benchmark-report.json`.

## Preset Library

Use the Save preset field in the controls panel to store the current v0.3 scene locally. Saved presets include generated thumbnails and remain in browser storage until deleted.

## Build Chunk Note

The production build may warn that the Three.js vendor chunk is slightly larger than 500 kB. The app lazy-loads the viewport/renderer path, so the main app shell is split from the heavier Three.js path. The remaining warning is expected for a Three-powered 3D demo and is harmless for v0.3.

## Current Limitations

Physics models prioritize responsiveness and readability over physical accuracy. Particle fluid uses a local neighbor grid rather than a complete SPH implementation. Shaded surface mode uses simple generated meshes, not production-grade skinning or collision-aware remeshing. WebGPU compute, full SPH, animation export, and advanced mesh generation are reserved for future work.

## Roadmap

- Move particle kernels and constraints to WebGPU compute.
- Add better mesh generation and skinning for soft bodies and cloth surfaces.
- Add a deeper optimizer and richer benchmark report charts.
- Add import/export collections for the saved preset library.
- Add a real backend-mediated LLM provider with secure secret handling.
- Add deeper per-browser visual assertions after the cross-browser smoke path stays stable.
