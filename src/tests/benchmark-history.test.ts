import { afterEach, describe, expect, it } from 'vitest';
import {
  appendBenchmarkRun,
  clearStoredBenchmarkHistory,
  loadBenchmarkHistoryState,
  setBenchmarkBaselineRun,
} from '../performance/BenchmarkHistory';
import type { BenchmarkResult } from '../performance/types';

const benchmarkResult = (averageFps: number): BenchmarkResult => ({
  presetId: 'soft-body-cube',
  presetName: 'Soft Body Cube',
  averageFps,
  averageFrameTimeMs: 1000 / averageFps,
  maxFrameTimeMs: 14,
  averageSimulationTimeMs: 2.4,
  objectCount: 125,
  frames: 180,
});

describe('BenchmarkHistory', () => {
  afterEach(() => {
    clearStoredBenchmarkHistory();
  });

  it('persists named benchmark runs and compares against the selected baseline', () => {
    const firstRun = appendBenchmarkRun(
      { runs: [] },
      [benchmarkResult(100)],
      'Launch baseline',
      new Date('2026-06-28T12:00:00Z'),
    );
    const secondRun = appendBenchmarkRun(
      firstRun,
      [benchmarkResult(88)],
      'Polish pass',
      new Date('2026-06-28T12:05:00Z'),
    );

    expect(secondRun.runs).toHaveLength(2);
    expect(secondRun.runs[0].label).toBe('Polish pass');
    expect(secondRun.runs[0].results[0].baselineAverageFps).toBe(100);
    expect(secondRun.runs[0].results[0].fpsDelta).toBe(-12);
    expect(secondRun.runs[0].results[0].fpsDeltaPercent).toBe(-12);
    expect(loadBenchmarkHistoryState().runs[0].id).toBe(secondRun.runs[0].id);
  });

  it('can promote the latest run to the active baseline', () => {
    const firstRun = appendBenchmarkRun(
      { runs: [] },
      [benchmarkResult(100)],
      'Launch baseline',
      new Date('2026-06-28T12:00:00Z'),
    );
    const secondRun = appendBenchmarkRun(
      firstRun,
      [benchmarkResult(88)],
      'Polish pass',
      new Date('2026-06-28T12:05:00Z'),
    );
    const rebased = setBenchmarkBaselineRun(secondRun, secondRun.runs[0].id);

    expect(rebased.baselineRunId).toBe(secondRun.runs[0].id);
    expect(rebased.runs[0].results[0].baselineAverageFps).toBe(88);
    expect(rebased.runs[1].results[0].fpsDelta).toBe(12);
  });
});
