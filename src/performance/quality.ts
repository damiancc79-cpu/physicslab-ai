import type { QualityPresetId } from './types';
import type { PresetId, SimulationParameters } from '../simulation/core/types';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';
import type { PerformanceMetrics } from './types';

const qualityOverrides: Record<QualityPresetId, Partial<Record<PresetId, SimulationParameters>>> = {
  low: {
    'soft-body-cube': { resolution: 3, solverIterations: 1 },
    'particle-fluid': { particleCount: 96, particleRadius: 0.085 },
    'gravity-sandbox': { bodyCount: 56, trailLength: 18 },
    'cloth-sheet': { segmentsX: 10, segmentsY: 8, solverIterations: 2 },
  },
  medium: {},
  high: {
    'soft-body-cube': { resolution: 5, solverIterations: 3 },
    'particle-fluid': { particleCount: 240, particleRadius: 0.07 },
    'gravity-sandbox': { bodyCount: 144, trailLength: 62 },
    'cloth-sheet': { segmentsX: 20, segmentsY: 14, solverIterations: 4 },
  },
  extreme: {
    'soft-body-cube': { resolution: 6, solverIterations: 5 },
    'particle-fluid': { particleCount: 380, particleRadius: 0.06 },
    'gravity-sandbox': { bodyCount: 232, trailLength: 88 },
    'cloth-sheet': { segmentsX: 28, segmentsY: 20, solverIterations: 5, windTurbulence: 2.6 },
  },
};

export const qualityPresetLabels: Record<QualityPresetId, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  extreme: 'Extreme',
};

export const getQualityParameters = (
  presetId: PresetId,
  qualityPreset: QualityPresetId,
): SimulationParameters => {
  const preset = presetLoader.load(presetId);
  const defaults = getDefaultParameters(preset);
  return presetLoader.validate(preset, {
    ...defaults,
    ...(qualityOverrides[qualityPreset][presetId] ?? {}),
  });
};

export const getAutoPerformanceParameters = (
  presetId: PresetId,
  parameters: SimulationParameters,
  metrics: PerformanceMetrics,
): SimulationParameters | null => {
  if (metrics.averageFps === 0 || metrics.averageFps >= 44) return null;

  const scale = metrics.averageFps < 30 ? 0.7 : 0.84;
  const next: SimulationParameters = {};

  switch (presetId) {
    case 'soft-body-cube':
      next.resolution = Math.max(3, Math.round((parameters.resolution ?? 4) - 1));
      next.solverIterations = Math.max(1, Math.round((parameters.solverIterations ?? 2) - 1));
      break;
    case 'particle-fluid':
      next.particleCount = Math.max(64, Math.round((parameters.particleCount ?? 180) * scale));
      next.particleRadius = Math.min(0.12, (parameters.particleRadius ?? 0.075) + 0.004);
      break;
    case 'gravity-sandbox':
      next.bodyCount = Math.max(40, Math.round((parameters.bodyCount ?? 96) * scale));
      next.trailLength = Math.max(10, Math.round((parameters.trailLength ?? 44) * scale));
      break;
    case 'cloth-sheet':
      next.segmentsX = Math.max(8, Math.round((parameters.segmentsX ?? 16) * scale));
      next.segmentsY = Math.max(6, Math.round((parameters.segmentsY ?? 12) * scale));
      next.solverIterations = Math.max(1, Math.round((parameters.solverIterations ?? 3) - 1));
      break;
  }

  const preset = presetLoader.load(presetId);
  const validated = presetLoader.validate(preset, { ...parameters, ...next });
  const changed = Object.entries(next).some(([key]) => validated[key] !== parameters[key]);
  return changed ? validated : null;
};
