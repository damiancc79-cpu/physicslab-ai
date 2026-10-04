import type { BenchmarkResult } from './types';
import type { PresetId, SimulationParameters } from '../simulation/core/types';
import { SimulationWorld } from '../simulation/core/SimulationWorld';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';

interface BenchmarkScene {
  presetId: PresetId;
  frames: number;
  parameters?: SimulationParameters;
}

const benchmarkScenes: BenchmarkScene[] = [
  { presetId: 'soft-body-cube', frames: 180, parameters: { resolution: 5, solverIterations: 3 } },
  { presetId: 'particle-fluid', frames: 180, parameters: { particleCount: 260, viscosity: 0.42 } },
  { presetId: 'gravity-sandbox', frames: 180, parameters: { bodyCount: 160, trailLength: 64 } },
  { presetId: 'cloth-sheet', frames: 180, parameters: { segmentsX: 20, segmentsY: 14, windStrength: 7.2 } },
];

export const runBenchmarkSuite = async (): Promise<BenchmarkResult[]> => {
  const results: BenchmarkResult[] = [];

  for (const scene of benchmarkScenes) {
    results.push(await runBenchmarkScene(scene));
  }

  return results;
};

const runBenchmarkScene = async (scene: BenchmarkScene): Promise<BenchmarkResult> => {
  const preset = presetLoader.load(scene.presetId);
  const parameters = presetLoader.validate(preset, {
    ...getDefaultParameters(preset),
    ...scene.parameters,
  });
  const world = new SimulationWorld(scene.presetId, parameters);
  const frameTimes: number[] = [];
  const simulationTimes: number[] = [];

  for (let frame = 0; frame < scene.frames; frame += 1) {
    const frameStart = performance.now();
    const simulationStart = performance.now();
    world.step(1 / 60, parameters);
    const simulationEnd = performance.now();
    const frameEnd = performance.now();

    simulationTimes.push(simulationEnd - simulationStart);
    frameTimes.push(frameEnd - frameStart);

    if (frame % 30 === 29) {
      await waitForBrowserFrame();
    }
  }

  const averageFrameTimeMs = average(frameTimes);
  const averageSimulationTimeMs = average(simulationTimes);

  return {
    presetId: scene.presetId,
    presetName: preset.name,
    averageFps: averageFrameTimeMs > 0 ? 1000 / averageFrameTimeMs : 0,
    averageFrameTimeMs,
    maxFrameTimeMs: Math.max(...frameTimes),
    averageSimulationTimeMs,
    objectCount: world.getObjectCount(),
    frames: scene.frames,
  };
};

const average = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);

const waitForBrowserFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
