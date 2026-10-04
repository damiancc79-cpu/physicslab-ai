import type { QualityPresetId } from '../performance/types';
import {
  createScenePreset,
  validateScenePreset,
  type ScenePreset,
  type SceneValidationIssue,
} from '../scene/ScenePresetSchema';
import type { PresetId, SimulationParameters } from '../simulation/core/types';
import { presetLoader } from '../simulation/presets/PresetLoader';

export interface SceneConfig {
  app: 'PhysicsLab AI';
  version: string;
  presetId: PresetId;
  parameters: SimulationParameters;
  toggles?: {
    debugEnabled?: boolean;
    showParticles?: boolean;
    showSprings?: boolean;
    showTrails?: boolean;
    surfaceMode?: 'debug' | 'shaded' | 'both';
  };
  qualityPreset?: QualityPresetId;
  autoPerformanceEnabled?: boolean;
  exportedAt?: string;
}

export const createSceneConfig = (
  input: Omit<SceneConfig, 'app' | 'version' | 'exportedAt'>,
): ScenePreset =>
  createScenePreset({
    presetId: input.presetId,
    parameters: input.parameters,
    rendering: { surfaceMode: input.toggles?.surfaceMode ?? 'both' },
    performance: {
      qualityPreset: input.qualityPreset ?? 'medium',
      autoPerformanceEnabled: input.autoPerformanceEnabled ?? false,
    },
    debug: {
      debugEnabled: input.toggles?.debugEnabled ?? true,
      showParticles: input.toggles?.showParticles ?? true,
      showSprings: input.toggles?.showSprings ?? true,
      showTrails: input.toggles?.showTrails ?? true,
    },
    assistantMetadata: {
      generatedBy: 'PhysicsLab AI export',
      createdAt: new Date().toISOString(),
    },
  });

export const normalizeSceneConfig = (input: unknown): SceneConfig | null => {
  if (!isRecord(input)) return null;
  if (input.schemaVersion === '0.3') {
    const validation = validateScenePreset(input);
    if (!validation.ok || !validation.scene) {
      logValidationIssues(validation.errors);
      return null;
    }
    if (validation.warnings.length > 0) logValidationIssues(validation.warnings);

    const scene = validation.scene;
    return {
      app: 'PhysicsLab AI',
      version: scene.schemaVersion,
      presetId: scene.presetId,
      parameters: scene.parameters,
      toggles: {
        debugEnabled: scene.debug.debugEnabled,
        showParticles: scene.debug.showParticles,
        showSprings: scene.debug.showSprings,
        showTrails: scene.debug.showTrails,
        surfaceMode: scene.rendering.surfaceMode,
      },
      qualityPreset: scene.performance.qualityPreset,
      autoPerformanceEnabled: scene.performance.autoPerformanceEnabled,
      exportedAt: scene.assistantMetadata?.createdAt,
    };
  }

  if (input.app !== 'PhysicsLab AI') return null;
  if (typeof input.presetId !== 'string') return null;

  let preset;
  try {
    preset = presetLoader.load(input.presetId as PresetId);
  } catch {
    return null;
  }

  if (!isRecord(input.parameters)) return null;
  const numericParameters: SimulationParameters = {};
  for (const [key, value] of Object.entries(input.parameters)) {
    if (typeof value === 'number' && Number.isFinite(value)) numericParameters[key] = value;
  }

  return {
    app: 'PhysicsLab AI',
    version: typeof input.version === 'string' ? input.version : 'unknown',
    presetId: preset.id,
    parameters: presetLoader.validate(preset, numericParameters),
    toggles: isRecord(input.toggles)
      ? {
          debugEnabled: asBoolean(input.toggles.debugEnabled),
          showParticles: asBoolean(input.toggles.showParticles),
          showSprings: asBoolean(input.toggles.showSprings),
          showTrails: asBoolean(input.toggles.showTrails),
          surfaceMode: isSurfaceMode(input.toggles.surfaceMode) ? input.toggles.surfaceMode : undefined,
        }
      : undefined,
    qualityPreset: isQualityPreset(input.qualityPreset) ? input.qualityPreset : undefined,
    autoPerformanceEnabled: asBoolean(input.autoPerformanceEnabled),
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : undefined,
  };
};

const logValidationIssues = (issues: SceneValidationIssue[]): void => {
  if (issues.length === 0) return;
  console.warn(
    '[PhysicsLab AI] Scene validation issues:',
    issues.map((issue) => `${issue.field}: ${issue.message}`),
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const isQualityPreset = (value: unknown): value is QualityPresetId =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'extreme';

const isSurfaceMode = (value: unknown): value is 'debug' | 'shaded' | 'both' =>
  value === 'debug' || value === 'shaded' || value === 'both';
