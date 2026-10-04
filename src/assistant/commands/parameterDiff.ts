import type {
  AssistantDebugState,
  AssistantPerformanceState,
  AssistantRenderingState,
  ParameterChange,
} from '../types';
import type { ScenePreset } from '../../scene/ScenePresetSchema';
import type { SimulationParameters } from '../../simulation/core/types';

export const diffParameters = (
  before: SimulationParameters,
  after: SimulationParameters,
  reasonFor: (parameter: string) => string,
): ParameterChange[] =>
  Object.keys(after)
    .filter((parameter) => before[parameter] !== after[parameter])
    .map((parameter) => ({
      parameter,
      previousValue: before[parameter],
      nextValue: after[parameter],
      reason: reasonFor(parameter),
    }));

export const diffScenePreset = (
  scene: ScenePreset,
  beforeParameters: SimulationParameters,
  beforeDebug: AssistantDebugState,
  beforeRendering: AssistantRenderingState,
  beforePerformance: AssistantPerformanceState,
  defaultReason: string,
): ParameterChange[] => [
  ...diffParameters(beforeParameters, scene.parameters, () => defaultReason),
  ...diffObject('surfaceMode', beforeRendering.surfaceMode, scene.rendering.surfaceMode, defaultReason),
  ...diffObject('qualityPreset', beforePerformance.qualityPreset, scene.performance.qualityPreset, defaultReason),
  ...diffObject(
    'autoPerformanceEnabled',
    beforePerformance.autoPerformanceEnabled,
    scene.performance.autoPerformanceEnabled,
    defaultReason,
  ),
  ...diffObject('debugEnabled', beforeDebug.debugEnabled, scene.debug.debugEnabled, defaultReason),
  ...diffObject('showParticles', beforeDebug.showParticles, scene.debug.showParticles, defaultReason),
  ...diffObject('showSprings', beforeDebug.showSprings, scene.debug.showSprings, defaultReason),
  ...diffObject('showTrails', beforeDebug.showTrails, scene.debug.showTrails, defaultReason),
];

const diffObject = (
  parameter: string,
  previousValue: string | boolean,
  nextValue: string | boolean,
  reason: string,
): ParameterChange[] =>
  previousValue === nextValue
    ? []
    : [
        {
          parameter,
          previousValue,
          nextValue,
          reason,
        },
      ];
