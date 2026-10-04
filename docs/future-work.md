# Future Work

- WebGPU compute kernels for particle neighbor search, spring constraints, and trail buffers.
- A more advanced spatial hash or uniform grid implemented on the GPU.
- Full SPH-style fluid with density, pressure, viscosity, and boundary kernels.
- Higher-quality mesh generation, skinning, and collision-aware remeshing for soft bodies and cloth surfaces.
- Additional cloth variants and collision field presets.
- Preset collection import/export and shareable URLs.
- Richer benchmark report charts, run notes, and statistical historical comparisons.
- A more advanced optimizer that can predict quality settings before FPS drops.
- Animation export through short frame sequences or video generation.
- Real LLM provider integration through a secure backend or user-managed local provider.
- Saved user preset library thumbnail customization.
- Playwright smoke tests in CI for desktop and mobile viewport checks.

## Tradeoffs In v0.3

- WebGPU is attempted for rendering, but compute remains a documented future path.
- Fluid behavior favors visual quality and understandable controls over a full SPH implementation.
- The assistant uses deterministic rules so the app runs without API keys or paid services.
- The viewport uses fixed substeps for stability, so very expensive settings may slow simulation time rather than allowing unstable large timesteps.
- The v0.3 optimizer uses deterministic heuristics rather than a predictive model.
- The shaded surface mesh is intentionally simple for both cloth and soft body; production-grade skinning remains future work.
- Cross-browser smoke coverage exists; deeper per-browser visual assertions remain future work.
