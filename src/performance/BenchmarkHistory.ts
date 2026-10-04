import type { BenchmarkHistoryState, BenchmarkResult, BenchmarkRun } from './types';

const STORAGE_KEY = 'physicslab-ai.benchmark-history.v1';
const MAX_HISTORY_RUNS = 8;

export const loadBenchmarkHistoryState = (): BenchmarkHistoryState => {
  const storage = getStorage();
  if (!storage) return { runs: [] };

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (Array.isArray(parsed)) {
      return normalizeHistoryState({ runs: parsed.filter(isBenchmarkRunLike) });
    }
    if (!parsed || typeof parsed !== 'object') return { runs: [] };

    const candidate = parsed as BenchmarkHistoryState;
    return normalizeHistoryState({
      baselineRunId: typeof candidate.baselineRunId === 'string' ? candidate.baselineRunId : undefined,
      runs: Array.isArray(candidate.runs) ? candidate.runs.filter(isBenchmarkRunLike) : [],
    });
  } catch {
    return { runs: [] };
  }
};

export const loadBenchmarkHistory = (): BenchmarkRun[] => loadBenchmarkHistoryState().runs;

export const appendBenchmarkRun = (
  state: BenchmarkHistoryState,
  results: BenchmarkResult[],
  label: string,
  ranAt = new Date(),
): BenchmarkHistoryState => {
  const run: BenchmarkRun = {
    id: `benchmark-${ranAt.getTime()}-${Math.random().toString(16).slice(2)}`,
    label: cleanLabel(label, state.runs.length),
    ranAt: ranAt.toISOString(),
    results,
  };
  const fallbackBaselineId = state.baselineRunId ?? state.runs[state.runs.length - 1]?.id ?? run.id;
  const nextState = normalizeHistoryState({
    baselineRunId: fallbackBaselineId,
    runs: [run, ...state.runs].slice(0, MAX_HISTORY_RUNS),
  });
  persistBenchmarkHistory(nextState);
  return nextState;
};

export const setBenchmarkBaselineRun = (
  state: BenchmarkHistoryState,
  baselineRunId: string,
): BenchmarkHistoryState => {
  const nextState = normalizeHistoryState({
    baselineRunId,
    runs: state.runs,
  });
  persistBenchmarkHistory(nextState);
  return nextState;
};

export const clearStoredBenchmarkHistory = (): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing modes can reject storage writes; benchmark history is optional.
  }
};

const normalizeHistoryState = (state: BenchmarkHistoryState): BenchmarkHistoryState => {
  const runs = state.runs
    .filter(isBenchmarkRunLike)
    .slice(0, MAX_HISTORY_RUNS)
    .map((run, index) => ({
      ...run,
      label: cleanLabel(run.label, index),
      results: run.results.map(stripBenchmarkComparison),
    }));
  const fallbackBaselineId = runs[runs.length - 1]?.id;
  const baselineRunId =
    runs.some((run) => run.id === state.baselineRunId) ? state.baselineRunId : fallbackBaselineId;
  const baselineRun = runs.find((run) => run.id === baselineRunId);

  return {
    baselineRunId,
    runs: runs.map((run) => ({
      ...run,
      results: withBaselineComparison(baselineRun, run.results),
    })),
  };
};

const withBaselineComparison = (baselineRun: BenchmarkRun | undefined, results: BenchmarkResult[]): BenchmarkResult[] => {
  const baselineByPreset = getBaselineByPreset(baselineRun);

  return results.map((result) => {
    const baselineAverageFps = baselineByPreset.get(result.presetId) ?? result.averageFps;
    const fpsDelta = result.averageFps - baselineAverageFps;
    const fpsDeltaPercent = baselineAverageFps > 0 ? (fpsDelta / baselineAverageFps) * 100 : 0;

    return {
      ...result,
      baselineAverageFps,
      fpsDelta,
      fpsDeltaPercent,
    };
  });
};

const getBaselineByPreset = (baselineRun: BenchmarkRun | undefined): Map<string, number> => {
  const baselineByPreset = new Map<string, number>();

  for (const result of baselineRun?.results ?? []) {
    baselineByPreset.set(result.presetId, result.averageFps);
  }

  return baselineByPreset;
};

const persistBenchmarkHistory = (state: BenchmarkHistoryState): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is a convenience only; current benchmark results still render in memory.
  }
};

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const cleanLabel = (label: string | undefined, index: number): string => {
  const trimmed = label?.trim().slice(0, 42);
  if (trimmed) return trimmed;
  return index === 0 ? 'Demo baseline' : `Benchmark run ${index + 1}`;
};

const stripBenchmarkComparison = (result: BenchmarkResult): BenchmarkResult => ({
  presetId: result.presetId,
  presetName: result.presetName,
  averageFps: result.averageFps,
  averageFrameTimeMs: result.averageFrameTimeMs,
  maxFrameTimeMs: result.maxFrameTimeMs,
  averageSimulationTimeMs: result.averageSimulationTimeMs,
  objectCount: result.objectCount,
  frames: result.frames,
});

const isBenchmarkRunLike = (value: unknown): value is BenchmarkRun => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as BenchmarkRun;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.ranAt === 'string' &&
    Array.isArray(candidate.results) &&
    candidate.results.every(isBenchmarkResult)
  );
};

const isBenchmarkResult = (value: unknown): value is BenchmarkResult => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as BenchmarkResult;
  return (
    typeof candidate.presetId === 'string' &&
    typeof candidate.presetName === 'string' &&
    typeof candidate.averageFps === 'number' &&
    typeof candidate.averageFrameTimeMs === 'number' &&
    typeof candidate.maxFrameTimeMs === 'number' &&
    typeof candidate.averageSimulationTimeMs === 'number' &&
    typeof candidate.objectCount === 'number' &&
    typeof candidate.frames === 'number'
  );
};
