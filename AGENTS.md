# PhysicsLab AI Agent Notes

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test`
- Smoke tests: `npm run test:smoke`
- Quick smoke: `npm run test:smoke:chromium`
- Lint: `npm run lint`
- Audit: `npm audit`

## Conventions

- Keep simulation logic outside React components.
- Put physics models under `src/simulation`, rendering adapters under `src/rendering`, assistant logic under `src/assistant`, and UI under `src/components`.
- Keep formal scene preset schema code under `src/scene`.
- Keep saved user preset library code under `src/library`.
- Avoid hardcoded secrets, paid services, or backend requirements for the local demo.
- Prefer deterministic local behavior for tests and demos.
- Add comments only for non-obvious simulation or rendering choices.

## Performance Priorities

- Keep frame interaction responsive before increasing visual complexity.
- Watch particle count, trail length, solver iterations, and debug rendering.
- Preserve fixed-step simulation behavior when changing the animation loop.
- Keep quality presets and auto performance rules in `src/performance`, not React components.
- Keep benchmark scene automation in `src/performance/BenchmarkRunner.ts`.
- Keep benchmark persistence and baseline comparison in `src/performance/BenchmarkHistory.ts`.
- Validate imported scene JSON through `src/utils/sceneConfig.ts`.
- Keep assistant scene generation, optimization, and stability logic modular under `src/assistant`.
- Keep future LLM-provider notes in `docs/llm-provider.md`; do not add browser API keys.
- Preserve the renderer abstraction so WebGPU compute can be added without rewriting UI.
- Keep CI aligned with the local verification commands in `.github/workflows/ci.yml`.
