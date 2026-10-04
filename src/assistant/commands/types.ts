import type { PresetId, SimulationParameters } from '../../simulation/core/types';
import type { BenchmarkResult, PerformanceInsight, PerformanceMetrics } from '../../performance/types';
import type {
  AssistantAction,
  AssistantDebugState,
  AssistantPerformanceState,
  AssistantRenderingState,
  OptimizationReport,
  ParameterChange,
} from '../types';
import type { ScenePreset } from '../../scene/ScenePresetSchema';

export interface AssistantCommand {
  text: string;
  presetId: PresetId;
  parameters: SimulationParameters;
  debug: AssistantDebugState;
  rendering: AssistantRenderingState;
  performance: AssistantPerformanceState;
  metrics: PerformanceMetrics;
  insights: PerformanceInsight[];
  benchmarkResults?: BenchmarkResult[];
  benchmarkBaselineLabel?: string;
}

export interface AssistantResponse {
  action?: AssistantAction;
  explanation: string;
  presetId?: PresetId;
  parameterChanges: SimulationParameters;
  debugChanges?: Partial<AssistantDebugState>;
  renderingChanges?: Partial<AssistantRenderingState>;
  performanceChanges?: Partial<AssistantPerformanceState>;
  parameterDiff?: ParameterChange[];
  optimizationReport?: OptimizationReport;
  warnings: string[];
  scenePreset?: ScenePreset;
  generatedPreset?: {
    name: string;
    presetId: PresetId;
    parameters: SimulationParameters;
  };
}
