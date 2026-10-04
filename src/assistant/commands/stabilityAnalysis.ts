import type { PresetId, SimulationParameters } from '../../simulation/core/types';
import { analyzeSceneStability, explainStabilityWarnings, stableRanges } from '../stability/StabilityAnalyzer';

export interface StabilityIssue {
  parameter: string;
  value: number;
  min: number;
  max: number;
  reason: string;
}

export const analyzeParameterStability = (
  presetId: PresetId,
  parameters: SimulationParameters,
): StabilityIssue[] => {
  return analyzeSceneStability({ presetId, parameters })
    .filter((warning) => typeof warning.currentValue === 'number' && warning.suggestedRange)
    .map((warning) => ({
      parameter: warning.parameter,
      value: warning.currentValue as number,
      min: warning.suggestedRange?.min ?? stableRanges[presetId][warning.parameter]?.min ?? 0,
      max: warning.suggestedRange?.max ?? stableRanges[presetId][warning.parameter]?.max ?? 0,
      reason: warning.explanation,
    }));
};

export const explainStability = (presetId: PresetId, parameters: SimulationParameters): string => {
  return explainStabilityWarnings(analyzeSceneStability({ presetId, parameters }));
};
