# Simulation Models

## Soft Body Cube

The cube is a mass-spring lattice. Nodes carry mass, velocity, and force. Structural and diagonal springs use Hooke-style forces with damping. A simple box collision system keeps the body inside the scene.

The runtime uses fixed substeps and velocity clamping to keep high stiffness values from exploding during interactive slider changes.

The soft body snapshot exposes a simple six-sided triangle skin built from exterior lattice nodes. Vertices are shared within each face and duplicated across cube edges for cleaner normals. It is useful for shaded presentation, while the debug nodes and springs remain the primary way to inspect the mass-spring structure.

## Particle Fluid

The fluid approximation uses a spatial neighbor grid so particles only compare against nearby cells. Nearby particles repel strongly, cohere weakly, blend velocity for viscosity, and collide against a box boundary. This is visually convincing for v0.3 but not a complete SPH solver.

## Gravity Sandbox

Bodies orbit one to three gently moving attractors. Force falls off with squared distance plus softening. Trails are stored per body and rendered as line segments. Velocity limiting and out-of-bounds recentering keep chaotic scenes from permanently ejecting every body.

## Cloth Sheet

The cloth is a spring grid with a pinned top edge. `pinSpacing` controls how many top-row nodes are fixed. Wind applies animated lateral and depth forces, while turbulence changes the gust profile. Solver passes, damping, and velocity limiting keep the sheet readable under strong wind.

In v0.3, the cloth snapshot also exposes a simple triangle grid for shaded surface rendering. The presenter updates vertex positions and normals each frame. Debug particles and springs remain available through the surface mode toggle.
