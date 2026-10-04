import { describe, expect, it } from 'vitest';
import { getAutoPerformanceParameters, getQualityParameters } from '../performance/quality';
import type { PerformanceMetrics } from '../performance/types';
import { createSceneConfig, normalizeSceneConfig } from '../utils/sceneConfig';

const slowMetrics: PerformanceMetrics = {
  fps: 28,
  averageFps: 28,
  frameTimeMs: 36,
  simulationTimeMs: 14,
  renderTimeMs: 8,
  objectCount: 300,
  rendererMode: 'WebGL',
  spikeCount: 3,
};

describe('quality presets and scene config', () => {
  it('applies high quality settings for cloth', () => {
    const parameters = getQualityParameters('cloth-sheet', 'high');

    expect(parameters.segmentsX).toBe(20);
    expect(parameters.segmentsY).toBe(14);
    expect(parameters.solverIterations).toBe(4);
  });

  it('auto performance reduces expensive fluid settings', () => {
    const adjusted = getAutoPerformanceParameters(
      'particle-fluid',
      { particleCount: 360, particleRadius: 0.07 },
      slowMetrics,
    );

    expect(adjusted?.particleCount).toBeLessThan(360);
    expect(adjusted?.particleRadius).toBeGreaterThan(0.07);
  });

  it('normalizes imported scene config safely', () => {
    const config = normalizeSceneConfig({
      app: 'PhysicsLab AI',
      version: '0.2.1',
      presetId: 'cloth-sheet',
      parameters: { segmentsX: 999, windStrength: 6 },
      toggles: { debugEnabled: false, surfaceMode: 'shaded' },
      qualityPreset: 'extreme',
      autoPerformanceEnabled: true,
    });

    expect(config?.presetId).toBe('cloth-sheet');
    expect(config?.parameters.segmentsX).toBe(28);
    expect(config?.toggles?.debugEnabled).toBe(false);
    expect(config?.toggles?.surfaceMode).toBe('shaded');
    expect(config?.qualityPreset).toBe('extreme');
    expect(config?.autoPerformanceEnabled).toBe(true);
  });

  it('exports and normalizes the v0.3 scene schema', () => {
    const scene = createSceneConfig({
      presetId: 'soft-body-cube',
      parameters: getQualityParameters('soft-body-cube', 'medium'),
      toggles: { debugEnabled: true, surfaceMode: 'both' },
      qualityPreset: 'medium',
      autoPerformanceEnabled: false,
    });
    const normalized = normalizeSceneConfig(scene);

    expect(scene.schemaVersion).toBe('0.3');
    expect(normalized?.presetId).toBe('soft-body-cube');
    expect(normalized?.toggles?.surfaceMode).toBe('both');
  });
});
