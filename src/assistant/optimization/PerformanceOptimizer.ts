import type {
  AssistantDebugState,
  AssistantRenderingState,
  OptimizationReport,
  ParameterChange,
} from '../types';
import { diffParameters } from '../commands/parameterDiff';
import { analyzeSceneStability, getStabilityParameterChanges } from '../stability/StabilityAnalyzer';
import type { BenchmarkResult, PerformanceMetrics, QualityPresetId } from '../../performance/types';
import { validateScenePreset, createScenePreset } from '../../scene/ScenePresetSchema';
import type { PresetId, SimulationParameters } from '../../simulation/core/types';
import { presetLoader } from '../../simulation/presets/PresetLoader';

export type OptimizationMode = 'conservative' | 'balanced' | 'aggressive';

export interface PerformanceOptimizationInput {
  presetId: PresetId;
  parameters: SimulationParameters;
  metrics: PerformanceMetrics;
  benchmarkResults: BenchmarkResult[];
  debug: AssistantDebugState;
  rendering: AssistantRenderingState;
  mode: OptimizationMode;
}

export interface PerformanceOptimizationResult {
  parameterChanges: SimulationParameters;
  debugChanges: Partial<AssistantDebugState>;
  renderingChanges: Partial<AssistantRenderingState>;
  qualityPreset?: QualityPresetId;
  diff: ParameterChange[];
  report: OptimizationReport;
  warnings: string[];
}

export class PerformanceOptimizer {
  optimize(input: PerformanceOptimizationInput): PerformanceOptimizationResult {
    const preset = presetLoader.load(input.presetId);
    const before = input.parameters;
    const after = presetLoader.validate(preset, {
      ...before,
      ...getStabilityParameterChanges(input.presetId, before),
      ...this.performanceChanges(input),
    });
    const debugChanges = this.debugChanges(input);
    const renderingChanges = this.renderingChanges(input);
    const qualityPreset = this.qualityPreset(input.mode);
    const validation = validateScenePreset(
      createScenePreset({
        presetId: input.presetId,
        parameters: after,
        rendering: { ...input.rendering, ...renderingChanges },
        performance: { qualityPreset, autoPerformanceEnabled: input.mode !== 'conservative' },
        debug: { ...input.debug, ...debugChanges },
      }),
    );
    const diff = [
      ...diffParameters(before, after, (parameter) => reasonFor(parameter, input.mode)),
      ...diffBoolean('debugEnabled', input.debug.debugEnabled, debugChanges.debugEnabled, 'Reduce debug draw cost.'),
      ...diffBoolean('showSprings', input.debug.showSprings, debugChanges.showSprings, 'Reduce spring line uploads.'),
      ...diffBoolean('showTrails', input.debug.showTrails, debugChanges.showTrails, 'Reduce trail geometry updates.'),
      ...diffMode('surfaceMode', input.rendering.surfaceMode, renderingChanges.surfaceMode, 'Reduce shaded/debug overlap.'),
      ...diffMode('qualityPreset', 'current', qualityPreset, `Apply ${input.mode} quality budget.`),
    ];

    return {
      parameterChanges: Object.fromEntries(Object.entries(after).filter(([key, value]) => before[key] !== value)),
      debugChanges,
      renderingChanges,
      qualityPreset,
      diff,
      report: {
        mode: input.mode,
        summary: `Applied a ${input.mode} optimization pass for ${preset.name}.`,
        beforeParameters: before,
        afterParameters: after,
        tradeoffs: tradeoffsFor(input.mode),
      },
      warnings: [
        ...validation.warnings.map((warning) => warning.message),
        ...analyzeSceneStability({ presetId: input.presetId, parameters: after })
          .filter((warning) => warning.severity === 'danger')
          .map((warning) => warning.explanation),
        ...benchmarkWarnings(input),
      ],
    };
  }

  private performanceChanges(input: PerformanceOptimizationInput): SimulationParameters {
    const factor = input.mode === 'conservative' ? 0.9 : input.mode === 'balanced' ? 0.75 : 0.58;
    const iterationDrop = input.mode === 'conservative' ? 0 : input.mode === 'balanced' ? 1 : 2;

    switch (input.presetId) {
      case 'soft-body-cube':
        return {
          resolution: Math.max(3, Math.round((input.parameters.resolution ?? 4) - (input.mode === 'aggressive' ? 2 : 1))),
          solverIterations: Math.max(1, Math.round((input.parameters.solverIterations ?? 3) - iterationDrop)),
          damping: Math.max(0.28, input.parameters.damping ?? 0.34),
        };
      case 'particle-fluid':
        return {
          particleCount: Math.max(64, Math.round((input.parameters.particleCount ?? 180) * factor)),
          viscosity: Math.min(0.95, (input.parameters.viscosity ?? 0.38) + 0.12),
        };
      case 'gravity-sandbox':
        return {
          bodyCount: Math.max(40, Math.round((input.parameters.bodyCount ?? 96) * factor)),
          trailLength: Math.max(10, Math.round((input.parameters.trailLength ?? 44) * factor)),
          timestep: Math.min(1.15, input.parameters.timestep ?? 1),
        };
      case 'cloth-sheet':
        return {
          segmentsX: Math.max(8, Math.round((input.parameters.segmentsX ?? 16) * factor)),
          segmentsY: Math.max(6, Math.round((input.parameters.segmentsY ?? 12) * factor)),
          solverIterations: Math.max(1, Math.round((input.parameters.solverIterations ?? 3) - iterationDrop)),
          damping: Math.max(0.38, input.parameters.damping ?? 0.42),
        };
    }
  }

  private debugChanges(input: PerformanceOptimizationInput): Partial<AssistantDebugState> {
    if (input.mode === 'conservative') return {};
    return {
      debugEnabled: input.mode !== 'aggressive' ? input.debug.debugEnabled : false,
      showSprings: false,
      showTrails: input.presetId === 'gravity-sandbox' && input.mode !== 'aggressive',
    };
  }

  private renderingChanges(input: PerformanceOptimizationInput): Partial<AssistantRenderingState> {
    if (input.mode === 'conservative') return {};
    return { surfaceMode: input.mode === 'aggressive' ? 'debug' : input.rendering.surfaceMode === 'both' ? 'shaded' : input.rendering.surfaceMode };
  }

  private qualityPreset(mode: OptimizationMode): QualityPresetId {
    if (mode === 'aggressive') return 'low';
    if (mode === 'balanced') return 'medium';
    return 'high';
  }
}

export const inferOptimizationMode = (text: string): OptimizationMode => {
  if (text.includes('aggressive') || text.includes('maximum') || text.includes('as fast')) return 'aggressive';
  if (text.includes('without changing') || text.includes('preserve') || text.includes('conservative')) return 'conservative';
  return 'balanced';
};

const reasonFor = (parameter: string, mode: OptimizationMode): string => {
  if (parameter.toLowerCase().includes('count') || parameter.includes('segments') || parameter === 'resolution') {
    return `${mode} optimization lowers object count pressure.`;
  }
  if (parameter === 'solverIterations') return `${mode} optimization reduces repeated solver work.`;
  if (parameter === 'timestep') return 'Lower timestep improves smoothness and stability.';
  if (parameter === 'trailLength') return 'Shorter trails reduce geometry uploads.';
  return 'Adjusted for a smoother validated scene.';
};

const tradeoffsFor = (mode: OptimizationMode): string[] => {
  if (mode === 'aggressive') return ['Lower visual density', 'Fewer debug overlays', 'Highest chance of reaching 60 FPS'];
  if (mode === 'conservative') return ['Preserves most visual detail', 'Smaller performance gain'];
  return ['Moderate visual simplification', 'Better frame pacing'];
};

const benchmarkWarnings = (input: PerformanceOptimizationInput): string[] => {
  const matching = input.benchmarkResults.find((result) => result.presetId === input.presetId);
  if (!matching || matching.averageFps >= 50) return [];
  return [`Latest ${matching.presetName} benchmark averaged ${matching.averageFps.toFixed(1)} FPS.`];
};

const diffBoolean = (
  parameter: string,
  previousValue: boolean,
  nextValue: boolean | undefined,
  reason: string,
): ParameterChange[] =>
  typeof nextValue === 'boolean' && previousValue !== nextValue
    ? [{ parameter, previousValue, nextValue, reason }]
    : [];

const diffMode = (
  parameter: string,
  previousValue: string,
  nextValue: string | undefined,
  reason: string,
): ParameterChange[] =>
  typeof nextValue === 'string' && previousValue !== nextValue
    ? [{ parameter, previousValue, nextValue, reason }]
    : [];

export const performanceOptimizer = new PerformanceOptimizer();
