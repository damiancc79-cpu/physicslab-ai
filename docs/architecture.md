# Architecture

PhysicsLab AI is separated into six boundaries:

- UI: React components in `src/components` and `src/app`.
- State: Zustand store in `src/state/useLabStore.ts`.
- Simulation: world, presets, objects, integrators, solvers, and collision helpers in `src/simulation`.
- Rendering: Three.js/WebGPU/WebGL adapter code in `src/rendering`.
- Assistant and performance: deterministic assistant providers in `src/assistant`, quality presets, and benchmark automation in `src/performance`.
- Scene schema and import/export: v0.3 preset schema in `src/scene` and compatibility normalization in `src/utils/sceneConfig.ts`.
- Local library: user-saved scene presets and generated thumbnails in `src/library`.

React owns user interaction and high-level orchestration. The simulation world owns stepping and snapshots. The renderer consumes snapshots and does not mutate simulation state.

## Runtime Loop

`SimulationViewport` uses a fixed-step accumulator for simulation updates and publishes measured frame, simulation, and render timings to the store. This keeps physics behavior more consistent across fast and slow displays while the renderer remains free to draw at the browser's refresh rate.

## Rendering Boundary

`RendererManager` tries WebGPU first and falls back to WebGL. `SimulationScenePresenter` is the only layer that translates simulation snapshots into Three.js meshes, debug lines, bounds, and trails.

## v0.3 Boundaries

Quality presets and auto performance tuning live in `src/performance/quality.ts`, not the UI. The control panel only invokes store actions. Imported JSON is normalized and validated before it can mutate application state.

The AI assistant remains local and deterministic. `LocalRuleBasedAssistant` routes commands into scene generation, stability, optimization, benchmark summary, and legacy tuning paths. `FutureOpenAIProvider` can later return the same `ScenePreset` and `AssistantResponse` shapes without changing UI/store contracts.

`ScenePresetSchema` defines the formal v0.3 scene preset format and validation rules. Exported scenes include preset id, preset type, description, parameters, rendering settings, performance settings, debug flags, and optional assistant metadata. Legacy v0.1-v0.2.1 configs still normalize through `sceneConfig.ts`.

`StabilityAnalyzer` returns structured warnings with severity, affected parameter, current value, safer range/value, and explanation. `PerformanceOptimizer` consumes current parameters, metrics, benchmark results, and stability warnings to produce conservative, balanced, or aggressive changes.

## Benchmark And Rendering Boundaries

`BenchmarkRunner` owns fixed-frame benchmark scenes and reports summarized metrics back through the Zustand store. `BenchmarkHistory` persists named browser-local runs, tracks the selected baseline run, and recomputes per-preset FPS deltas. The metrics panel displays current results plus compact history bars, while the assistant can reference the most recent benchmark data without owning the benchmark loop.

`BenchmarkReport` turns latest results, saved history, and selected baseline metadata into an exportable JSON report.

`UserPresetLibrary` stores validated v0.3 scenes in browser storage with generated SVG thumbnails. It does not depend on screenshots, backend storage, or API services.

`SimulationScenePresenter` owns debug particles, spring lines, trails, bounds, and optional surface meshes. Simulation objects expose renderable surface snapshots when available, keeping Three.js-specific mesh work out of the physics models.

`App` lazy-loads the viewport so React controls and assistant UI can initialize separately from the heavier Three.js renderer path.

Playwright smoke tests live under `tests/e2e` and are excluded from Vitest unit runs through `vite.config.ts`. The config includes Chromium, Firefox, and WebKit projects; `npm run test:smoke:chromium` remains available for quick Chromium-only checks.

GitHub Actions runs the same build, unit, lint, and Playwright smoke gates used locally. The workflow does not require backend services, paid services, or API keys.
