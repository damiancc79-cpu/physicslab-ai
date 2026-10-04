import type { SimulationPreset } from '../core/types';

export const simulationPresets: SimulationPreset[] = [
  {
    id: 'soft-body-cube',
    name: 'Soft Body Cube',
    description: 'Elastic mass-spring lattice with floor and wall collisions.',
    kind: 'soft-body',
    parameterDefinitions: [
      { id: 'resolution', label: 'Resolution', min: 3, max: 6, step: 1, defaultValue: 4 },
      { id: 'stiffness', label: 'Stiffness', min: 8, max: 90, step: 1, defaultValue: 34 },
      { id: 'damping', label: 'Damping', min: 0.02, max: 1.8, step: 0.02, defaultValue: 0.34 },
      { id: 'gravity', label: 'Gravity', min: 0, max: 18, step: 0.1, defaultValue: 9.8 },
      { id: 'mass', label: 'Mass', min: 0.2, max: 4, step: 0.1, defaultValue: 1 },
      { id: 'size', label: 'Size', min: 1.2, max: 4, step: 0.1, defaultValue: 2.5 },
      { id: 'solverIterations', label: 'Solver Passes', min: 1, max: 5, step: 1, defaultValue: 2 },
    ],
  },
  {
    id: 'particle-fluid',
    name: 'Particle Fluid',
    description: 'Fluid-like particles using local cohesion, repulsion, viscosity, and boundaries.',
    kind: 'particle-fluid',
    parameterDefinitions: [
      { id: 'particleCount', label: 'Particles', min: 48, max: 420, step: 8, defaultValue: 180 },
      { id: 'viscosity', label: 'Viscosity', min: 0.01, max: 1.2, step: 0.01, defaultValue: 0.38 },
      { id: 'gravity', label: 'Gravity', min: 0, max: 18, step: 0.1, defaultValue: 8.2 },
      { id: 'cohesion', label: 'Cohesion', min: 0, max: 8, step: 0.1, defaultValue: 2.4 },
      { id: 'repulsion', label: 'Repulsion', min: 2, max: 22, step: 0.2, defaultValue: 11 },
      { id: 'boundarySize', label: 'Boundary', min: 3, max: 9, step: 0.25, defaultValue: 5.5 },
      { id: 'particleRadius', label: 'Radius', min: 0.035, max: 0.13, step: 0.005, defaultValue: 0.075 },
    ],
  },
  {
    id: 'gravity-sandbox',
    name: 'Gravity Sandbox',
    description: 'Orbital bodies pulled through configurable attractor fields.',
    kind: 'gravity',
    parameterDefinitions: [
      { id: 'bodyCount', label: 'Bodies', min: 24, max: 260, step: 4, defaultValue: 96 },
      { id: 'attractorStrength', label: 'Attractor', min: 8, max: 140, step: 1, defaultValue: 54 },
      { id: 'attractorCount', label: 'Attractors', min: 1, max: 3, step: 1, defaultValue: 2 },
      { id: 'timestep', label: 'Timestep', min: 0.25, max: 2.6, step: 0.05, defaultValue: 1 },
      { id: 'damping', label: 'Damping', min: 0.92, max: 1, step: 0.001, defaultValue: 0.992 },
      { id: 'trailLength', label: 'Trail', min: 0, max: 90, step: 2, defaultValue: 44 },
      { id: 'spawnRadius', label: 'Spawn Radius', min: 1.5, max: 7, step: 0.1, defaultValue: 4.2 },
    ],
  },
  {
    id: 'cloth-sheet',
    name: 'Cloth Sheet',
    description: 'Pinned spring cloth with adjustable wind, gravity, damping, and resolution.',
    kind: 'cloth',
    parameterDefinitions: [
      { id: 'segmentsX', label: 'Width Segments', min: 8, max: 28, step: 2, defaultValue: 16 },
      { id: 'segmentsY', label: 'Height Segments', min: 6, max: 22, step: 2, defaultValue: 12 },
      { id: 'stiffness', label: 'Stiffness', min: 10, max: 120, step: 1, defaultValue: 58 },
      { id: 'damping', label: 'Damping', min: 0.02, max: 1.4, step: 0.02, defaultValue: 0.42 },
      { id: 'gravity', label: 'Gravity', min: 0, max: 18, step: 0.1, defaultValue: 7.8 },
      { id: 'windStrength', label: 'Wind', min: 0, max: 18, step: 0.2, defaultValue: 5.6 },
      { id: 'windTurbulence', label: 'Turbulence', min: 0, max: 4, step: 0.1, defaultValue: 1.4 },
      { id: 'pinSpacing', label: 'Pin Spacing', min: 1, max: 6, step: 1, defaultValue: 2 },
      { id: 'solverIterations', label: 'Solver Passes', min: 1, max: 5, step: 1, defaultValue: 3 },
      { id: 'clothWidth', label: 'Width', min: 3, max: 7, step: 0.1, defaultValue: 5.2 },
      { id: 'clothHeight', label: 'Height', min: 2, max: 5.5, step: 0.1, defaultValue: 3.4 },
    ],
  },
];

export const getDefaultParameters = (preset: SimulationPreset): Record<string, number> =>
  Object.fromEntries(
    preset.parameterDefinitions.map((definition) => [definition.id, definition.defaultValue]),
  );
