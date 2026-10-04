import type { QualityPresetId } from '../performance/types';
import type { SurfaceMode } from '../rendering/types';
import type { SimulationParameters } from '../simulation/core/types';

export type AssistantAction = 'scene-generation' | 'stability-fix' | 'performance-optimization' | 'parameter-tune' | 'explain';

export interface ParameterChange {
  parameter: string;
  previousValue: number | string | boolean | undefined;
  nextValue: number | string | boolean | undefined;
  reason: string;
}

export interface AssistantDebugState {
  debugEnabled: boolean;
  showParticles: boolean;
  showSprings: boolean;
  showTrails: boolean;
}

export interface AssistantRenderingState {
  surfaceMode: SurfaceMode;
}

export interface AssistantPerformanceState {
  qualityPreset: QualityPresetId;
  autoPerformanceEnabled: boolean;
}

export interface OptimizationReport {
  mode: 'conservative' | 'balanced' | 'aggressive';
  summary: string;
  beforeParameters: SimulationParameters;
  afterParameters: SimulationParameters;
  tradeoffs: string[];
}
