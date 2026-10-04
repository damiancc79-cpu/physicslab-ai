import type { BenchmarkResult, BenchmarkRun } from './types';

export interface BenchmarkReport {
  app: 'PhysicsLab AI';
  reportVersion: '0.1';
  exportedAt: string;
  baselineRunId?: string;
  baselineLabel?: string;
  latestResults: BenchmarkResult[];
  history: BenchmarkRun[];
  summary: {
    runCount: number;
    fastestPreset?: string;
    slowestPreset?: string;
    averageFps: number;
    maxFrameTimeMs: number;
  };
}

export const createBenchmarkReport = (
  latestResults: BenchmarkResult[],
  history: BenchmarkRun[],
  baselineRunId: string | undefined,
  exportedAt = new Date(),
): BenchmarkReport => {
  const fastest = latestResults.reduce<BenchmarkResult | undefined>(
    (best, result) => (!best || result.averageFps > best.averageFps ? result : best),
    undefined,
  );
  const slowest = latestResults.reduce<BenchmarkResult | undefined>(
    (worst, result) => (!worst || result.averageFps < worst.averageFps ? result : worst),
    undefined,
  );
  const averageFps =
    latestResults.reduce((total, result) => total + result.averageFps, 0) / Math.max(1, latestResults.length);
  const maxFrameTimeMs = Math.max(0, ...latestResults.map((result) => result.maxFrameTimeMs));
  const baseline = history.find((run) => run.id === baselineRunId);

  return {
    app: 'PhysicsLab AI',
    reportVersion: '0.1',
    exportedAt: exportedAt.toISOString(),
    baselineRunId,
    baselineLabel: baseline?.label,
    latestResults,
    history,
    summary: {
      runCount: history.length,
      fastestPreset: fastest?.presetName,
      slowestPreset: slowest?.presetName,
      averageFps,
      maxFrameTimeMs,
    },
  };
};
