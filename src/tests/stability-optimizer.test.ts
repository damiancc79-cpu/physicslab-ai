import { describe, expect, it } from 'vitest';
import { performanceOptimizer } from '../assistant/optimization/PerformanceOptimizer';
import { analyzeSceneStability, getStabilityParameterChanges } from '../assistant/stability/StabilityAnalyzer';
import type { PerformanceMetrics } from '../performance/types';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';

const metrics: PerformanceMetrics = {
  fps: 30,
  averageFps: 30,
  frameTimeMs: 33,
  simulationTimeMs: 12,
  renderTimeMs: 9,
  objectCount: 320,
  rendererMode: 'WebGL',
  spikeCount: 2,
};

describe('stability analyzer and optimizer', () => {
  it('detects risky timestep, attractor strength, and debug cost', () => {
    const warnings = analyzeSceneStability({
      presetId: 'gravity-sandbox',
      parameters: {
        ...getDefaultParameters(presetLoader.load('gravity-sandbox')),
        timestep: 2.2,
        attractorStrength: 130,
        bodyCount: 210,
        trailLength: 88,
      },
      debug: { debugEnabled: true, showParticles: true, showSprings: true, showTrails: true },
      rendering: { surfaceMode: 'both' },
      metrics,
    });

    expect(warnings.some((warning) => warning.parameter === 'timestep')).toBe(true);
    expect(warnings.some((warning) => warning.parameter === 'attractorStrength')).toBe(true);
    expect(warnings.some((warning) => warning.parameter === 'debug visualization')).toBe(true);
  });

  it('returns safer parameter changes for unstable scenes', () => {
    const changes = getStabilityParameterChanges('cloth-sheet', {
      ...getDefaultParameters(presetLoader.load('cloth-sheet')),
      windStrength: 17,
      damping: 0.02,
    });

    expect(changes.windStrength).toBe(12);
    expect(changes.damping).toBe(0.08);
  });

  it('optimizes aggressively without creating invalid preset parameters', () => {
    const result = performanceOptimizer.optimize({
      presetId: 'particle-fluid',
      parameters: { ...getDefaultParameters(presetLoader.load('particle-fluid')), particleCount: 360 },
      metrics,
      benchmarkResults: [],
      debug: { debugEnabled: true, showParticles: true, showSprings: true, showTrails: true },
      rendering: { surfaceMode: 'both' },
      mode: 'aggressive',
    });

    expect(result.parameterChanges.particleCount).toBeLessThan(360);
    expect(result.qualityPreset).toBe('low');
    expect(result.diff.length).toBeGreaterThan(0);
  });
});
