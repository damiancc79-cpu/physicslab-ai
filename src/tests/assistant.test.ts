import { describe, expect, it } from 'vitest';
import type { AssistantCommand } from '../assistant/commands/types';
import { localAssistant } from '../assistant/providers/LocalRuleBasedAssistant';
import type { PerformanceMetrics } from '../performance/types';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';

const metrics: PerformanceMetrics = {
  fps: 60,
  averageFps: 60,
  frameTimeMs: 16,
  simulationTimeMs: 4,
  renderTimeMs: 6,
  objectCount: 100,
  rendererMode: 'WebGL',
  spikeCount: 0,
};

const command = (overrides: Partial<AssistantCommand>): AssistantCommand => {
  const presetId = overrides.presetId ?? 'soft-body-cube';
  return {
    text: 'status',
    presetId,
    parameters: getDefaultParameters(presetLoader.load(presetId)),
    debug: { debugEnabled: true, showParticles: true, showSprings: true, showTrails: true },
    rendering: { surfaceMode: 'both' },
    performance: { qualityPreset: 'medium', autoPerformanceEnabled: false },
    metrics,
    insights: [],
    ...overrides,
  };
};

describe('LocalRuleBasedAssistant', () => {
  it('turns jelly-like language into a soft body preset update', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'Make it more jelly-like',
        presetId: 'gravity-sandbox',
        parameters: getDefaultParameters(presetLoader.load('gravity-sandbox')),
      }),
    );

    expect(response.presetId).toBe('soft-body-cube');
    expect(response.parameterChanges.stiffness).toBeLessThan(30);
    expect(response.parameterDiff?.length).toBeGreaterThan(0);
  });

  it('recommends lower cost parameters for particle fluid performance', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'reduce performance cost',
        presetId: 'particle-fluid',
        parameters: { ...getDefaultParameters(presetLoader.load('particle-fluid')), particleCount: 320 },
        metrics: { ...metrics, averageFps: 31 },
      }),
    );

    expect(response.parameterChanges.particleCount).toBeLessThan(320);
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it.each([
    ['Create a low-gravity jelly cube scene', 'soft-body-cube'],
    ['Generate a chaotic orbital scene with three attractors', 'gravity-sandbox'],
    ['Make a heavy fluid with slow motion', 'particle-fluid'],
    ['Create a cloth flag in strong wind', 'cloth-sheet'],
    ['Make a stable high-performance soft body demo', 'soft-body-cube'],
    ['Generate a cinematic particle fluid scene', 'particle-fluid'],
    ['Create a benchmark-friendly gravity scene', 'gravity-sandbox'],
  ] as const)('generates a valid scene for "%s"', async (text, presetId) => {
    const response = await localAssistant.execute(command({ text }));

    expect(response.action).toBe('scene-generation');
    expect(response.scenePreset?.presetId).toBe(presetId);
    expect(response.generatedPreset?.presetId).toBe(presetId);
    expect(response.parameterDiff?.length).toBeGreaterThan(0);
    expect(response.scenePreset?.schemaVersion).toBe('0.3');
  });

  it('handles syrup-like fluid commands', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'Make the fluid thicker like honey',
        presetId: 'soft-body-cube',
      }),
    );

    expect(response.presetId).toBe('particle-fluid');
    expect(response.parameterChanges.viscosity).toBeGreaterThan(0.9);
    expect(response.parameterChanges.cohesion).toBeGreaterThan(5);
  });

  it('explains parameters outside known stable ranges', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'Compare current parameters against known stable ranges',
        presetId: 'gravity-sandbox',
        parameters: { ...getDefaultParameters(presetLoader.load('gravity-sandbox')), timestep: 2.4 },
      }),
    );

    expect(response.action).toBe('explain');
    expect(response.parameterChanges).toEqual({});
    expect(response.explanation).toContain('timestep');
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it('optimizes the active scene with an aggressive mode', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'optimize aggressively for 60 FPS',
        presetId: 'particle-fluid',
        parameters: { ...getDefaultParameters(presetLoader.load('particle-fluid')), particleCount: 320 },
        metrics: { ...metrics, averageFps: 30 },
      }),
    );

    expect(response.action).toBe('performance-optimization');
    expect(response.optimizationReport?.mode).toBe('aggressive');
    expect(response.parameterChanges.particleCount).toBeLessThan(320);
    expect(response.parameterDiff?.length).toBeGreaterThan(0);
  });

  it('answers benchmark questions when benchmark data is available', async () => {
    const response = await localAssistant.execute(
      command({
        text: 'What does the latest benchmark say about performance?',
        benchmarkBaselineLabel: 'Launch baseline',
        benchmarkResults: [
          {
            presetId: 'soft-body-cube',
            presetName: 'Soft Body Cube',
            averageFps: 120,
            averageFrameTimeMs: 8.3,
            maxFrameTimeMs: 11,
            averageSimulationTimeMs: 2,
            objectCount: 125,
            frames: 180,
          },
          {
            presetId: 'cloth-sheet',
            presetName: 'Cloth Sheet',
            averageFps: 48,
            averageFrameTimeMs: 20.8,
            maxFrameTimeMs: 28,
            averageSimulationTimeMs: 8,
            objectCount: 315,
            frames: 180,
            baselineAverageFps: 60,
            fpsDelta: -12,
            fpsDeltaPercent: -20,
          },
        ],
      }),
    );

    expect(response.explanation).toContain('Soft Body Cube');
    expect(response.explanation).toContain('Cloth Sheet');
    expect(response.explanation).toContain('Launch baseline');
    expect(response.parameterChanges).toEqual({});
  });
});
