import type { AssistantDebugState, AssistantRenderingState } from '../types';
import type { PerformanceMetrics } from '../../performance/types';
import type { PresetId, SimulationParameters } from '../../simulation/core/types';

export type StabilitySeverity = 'info' | 'warning' | 'danger';

interface StableRange {
  min: number;
  max: number;
  explanation: string;
}

export interface StabilityWarning {
  severity: StabilitySeverity;
  parameter: string;
  currentValue: number | string | boolean;
  suggestedValue?: number | string | boolean;
  suggestedRange?: {
    min: number;
    max: number;
  };
  explanation: string;
}

export interface StabilityAnalysisInput {
  presetId: PresetId;
  parameters: SimulationParameters;
  debug?: Partial<AssistantDebugState>;
  rendering?: Partial<AssistantRenderingState>;
  metrics?: PerformanceMetrics;
}

export const stableRanges: Record<PresetId, Record<string, StableRange>> = {
  'soft-body-cube': {
    resolution: { min: 3, max: 5, explanation: 'Higher lattices add many springs and can amplify oscillation.' },
    stiffness: { min: 12, max: 70, explanation: 'Extreme stiffness needs more solver passes to avoid jitter.' },
    damping: { min: 0.08, max: 1.1, explanation: 'Very low damping lets spring energy accumulate.' },
    gravity: { min: 1, max: 14, explanation: 'Extreme gravity can slam the body into boundaries and excite springs.' },
    solverIterations: { min: 2, max: 5, explanation: 'Soft bodies need repeated spring passes for stable deformation.' },
  },
  'particle-fluid': {
    particleCount: { min: 64, max: 280, explanation: 'Dense fluids increase local neighbor work and collision pressure.' },
    viscosity: { min: 0.08, max: 1.05, explanation: 'Low viscosity splashes aggressively; very high viscosity can clump.' },
    gravity: { min: 1, max: 14, explanation: 'Extreme gravity can compress particles into the floor boundary.' },
    repulsion: { min: 5, max: 18, explanation: 'Repulsion outside this range can collapse or explode the particle field.' },
    cohesion: { min: 0.5, max: 6.4, explanation: 'Cohesion outside this range can make the fluid disperse or over-clump.' },
  },
  'gravity-sandbox': {
    bodyCount: { min: 32, max: 190, explanation: 'Large body counts make trails and instancing heavier.' },
    attractorStrength: { min: 14, max: 112, explanation: 'Very strong attractors fling bodies out of readable orbits.' },
    timestep: { min: 0.35, max: 1.65, explanation: 'Large timesteps skip orbital curvature and create chaotic jumps.' },
    damping: { min: 0.965, max: 0.999, explanation: 'Damping controls whether orbits decay or explode.' },
    trailLength: { min: 0, max: 76, explanation: 'Long trails increase geometry updates every frame.' },
  },
  'cloth-sheet': {
    segmentsX: { min: 8, max: 22, explanation: 'Very dense cloth creates many spring constraints.' },
    segmentsY: { min: 6, max: 18, explanation: 'Very dense cloth creates many spring constraints.' },
    stiffness: { min: 20, max: 95, explanation: 'Stiff cloth needs enough solver passes to stay calm.' },
    damping: { min: 0.08, max: 1.1, explanation: 'Low damping makes wind-driven cloth flutter uncontrollably.' },
    gravity: { min: 1, max: 14, explanation: 'Extreme gravity can yank the cloth against its pinned edge.' },
    windStrength: { min: 0, max: 12, explanation: 'Strong wind can overpower spring constraints.' },
    windTurbulence: { min: 0, max: 3, explanation: 'High turbulence adds rapidly changing force directions.' },
    solverIterations: { min: 2, max: 5, explanation: 'Pinned cloth needs enough passes to preserve its sheet shape.' },
  },
};

export const analyzeSceneStability = (input: StabilityAnalysisInput): StabilityWarning[] => {
  const warnings: StabilityWarning[] = [];
  const ranges = stableRanges[input.presetId];

  for (const [parameter, range] of Object.entries(ranges)) {
    const currentValue = input.parameters[parameter];
    if (typeof currentValue !== 'number') continue;
    if (currentValue < range.min || currentValue > range.max) {
      const suggestedValue = clamp(currentValue, range.min, range.max);
      warnings.push({
        severity: getSeverity(currentValue, range),
        parameter,
        currentValue,
        suggestedValue,
        suggestedRange: { min: range.min, max: range.max },
        explanation: range.explanation,
      });
    }
  }

  const expensiveDebug = isDebugExpensive(input);
  if (expensiveDebug) {
    warnings.push({
      severity: 'warning',
      parameter: 'debug visualization',
      currentValue: true,
      suggestedValue: false,
      explanation: 'Debug particles, spring lines, or trails are expensive for this scene density.',
    });
  }

  if (input.metrics && input.metrics.averageFps > 0 && input.metrics.averageFps < 40) {
    warnings.push({
      severity: input.metrics.averageFps < 28 ? 'danger' : 'warning',
      parameter: 'average FPS',
      currentValue: Number(input.metrics.averageFps.toFixed(1)),
      suggestedRange: { min: 50, max: 60 },
      explanation: 'Measured frame rate is below the smooth interaction target.',
    });
  }

  return warnings;
};

export const getStabilityParameterChanges = (
  presetId: PresetId,
  parameters: SimulationParameters,
): SimulationParameters => {
  const changes: SimulationParameters = {};

  for (const warning of analyzeSceneStability({ presetId, parameters })) {
    if (typeof warning.suggestedValue === 'number') {
      changes[warning.parameter] = warning.suggestedValue;
    }
  }

  return changes;
};

export const explainStabilityWarnings = (warnings: StabilityWarning[]): string => {
  if (warnings.length === 0) return 'Current scene settings are inside the known stable ranges.';

  return warnings
    .slice(0, 4)
    .map((warning) => {
      const range = warning.suggestedRange
        ? ` Safer range: ${warning.suggestedRange.min}-${warning.suggestedRange.max}.`
        : '';
      return `${warning.parameter} is ${warning.currentValue}. ${warning.explanation}${range}`;
    })
    .join(' ');
};

const isDebugExpensive = (input: StabilityAnalysisInput): boolean => {
  const debugActive =
    input.debug?.debugEnabled === true &&
    (input.debug.showParticles === true || input.debug.showSprings === true || input.debug.showTrails === true);
  const shadedAndDebug = input.rendering?.surfaceMode === 'both';

  if (!debugActive && !shadedAndDebug) return false;

  if (input.presetId === 'particle-fluid') return (input.parameters.particleCount ?? 0) > 260;
  if (input.presetId === 'gravity-sandbox') {
    return (input.parameters.bodyCount ?? 0) > 160 || (input.parameters.trailLength ?? 0) > 70;
  }
  if (input.presetId === 'cloth-sheet') {
    return (input.parameters.segmentsX ?? 0) * (input.parameters.segmentsY ?? 0) > 360;
  }
  if (input.presetId === 'soft-body-cube') return (input.parameters.resolution ?? 0) >= 5;
  return false;
};

const getSeverity = (value: number, range: StableRange): StabilitySeverity => {
  const below = value < range.min ? range.min - value : 0;
  const above = value > range.max ? value - range.max : 0;
  const distance = Math.max(below, above);
  const span = Math.max(0.001, range.max - range.min);
  return distance / span > 0.35 ? 'danger' : 'warning';
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
