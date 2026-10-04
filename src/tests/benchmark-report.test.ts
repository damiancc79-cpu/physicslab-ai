import { describe, expect, it } from 'vitest';
import { createBenchmarkReport } from '../performance/BenchmarkReport';
import type { BenchmarkResult, BenchmarkRun } from '../performance/types';

const result = (presetName: string, averageFps: number): BenchmarkResult => ({
  presetId: presetName === 'Soft Body Cube' ? 'soft-body-cube' : 'cloth-sheet',
  presetName,
  averageFps,
  averageFrameTimeMs: 1000 / averageFps,
  maxFrameTimeMs: 24,
  averageSimulationTimeMs: 4,
  objectCount: 120,
  frames: 180,
});

describe('BenchmarkReport', () => {
  it('summarizes latest benchmark results and selected baseline', () => {
    const latestResults = [result('Soft Body Cube', 120), result('Cloth Sheet', 48)];
    const history: BenchmarkRun[] = [
      { id: 'run-latest', label: 'Latest', ranAt: '2026-06-28T14:00:00Z', results: latestResults },
      { id: 'run-base', label: 'Baseline', ranAt: '2026-06-28T13:00:00Z', results: latestResults },
    ];
    const report = createBenchmarkReport(latestResults, history, 'run-base', new Date('2026-06-28T15:00:00Z'));

    expect(report.app).toBe('PhysicsLab AI');
    expect(report.baselineLabel).toBe('Baseline');
    expect(report.summary.fastestPreset).toBe('Soft Body Cube');
    expect(report.summary.slowestPreset).toBe('Cloth Sheet');
    expect(report.summary.runCount).toBe(2);
  });
});
