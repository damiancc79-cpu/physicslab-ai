import type { PresetId } from '../simulation/core/types';

export type RendererMode = 'WebGPU' | 'WebGL' | 'WebGL fallback';

export type QualityPresetId = 'low' | 'medium' | 'high' | 'extreme';

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTimeMs: number;
  simulationTimeMs: number;
  renderTimeMs: number;
  objectCount: number;
  rendererMode: RendererMode;
  spikeCount: number;
}

export interface PerformanceInsight {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  recommendation: string;
}

export interface BenchmarkResult {
  presetId: PresetId;
  presetName: string;
  averageFps: number;
  averageFrameTimeMs: number;
  maxFrameTimeMs: number;
  averageSimulationTimeMs: number;
  objectCount: number;
  frames: number;
  baselineAverageFps?: number;
  fpsDelta?: number;
  fpsDeltaPercent?: number;
}

export interface BenchmarkRun {
  id: string;
  label: string;
  ranAt: string;
  results: BenchmarkResult[];
}

export interface BenchmarkHistoryState {
  baselineRunId?: string;
  runs: BenchmarkRun[];
}
