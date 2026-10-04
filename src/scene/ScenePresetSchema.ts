import type { AssistantDebugState, AssistantPerformanceState, AssistantRenderingState } from '../assistant/types';
import { analyzeSceneStability } from '../assistant/stability/StabilityAnalyzer';
import type { QualityPresetId } from '../performance/types';
import type { SurfaceMode } from '../rendering/types';
import type { PresetId, SimulationKind, SimulationParameters } from '../simulation/core/types';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';

export type ScenePresetType = 'softBody' | 'fluid' | 'gravity' | 'cloth';

export interface SceneAssistantMetadata {
  generatedBy?: string;
  prompt?: string;
  createdAt?: string;
  experimental?: boolean;
  warnings?: string[];
  tags?: string[];
}

export interface ScenePreset {
  app: 'PhysicsLab AI';
  schemaVersion: '0.3';
  presetId: PresetId;
  presetName: string;
  presetType: ScenePresetType;
  description: string;
  parameters: SimulationParameters;
  rendering: AssistantRenderingState & {
    renderScale?: number;
  };
  performance: AssistantPerformanceState;
  debug: AssistantDebugState;
  assistantMetadata?: SceneAssistantMetadata;
}

export interface SceneValidationIssue {
  field: string;
  message: string;
}

export interface SceneValidationResult {
  ok: boolean;
  scene?: ScenePreset;
  errors: SceneValidationIssue[];
  warnings: SceneValidationIssue[];
}

const presetTypeByKind: Record<SimulationKind, ScenePresetType> = {
  'soft-body': 'softBody',
  'particle-fluid': 'fluid',
  gravity: 'gravity',
  cloth: 'cloth',
};

export const getScenePresetType = (presetId: PresetId): ScenePresetType =>
  presetTypeByKind[presetLoader.load(presetId).kind];

export const createScenePreset = (input: {
  presetId: PresetId;
  presetName?: string;
  description?: string;
  parameters?: SimulationParameters;
  rendering?: Partial<ScenePreset['rendering']>;
  performance?: Partial<ScenePreset['performance']>;
  debug?: Partial<ScenePreset['debug']>;
  assistantMetadata?: SceneAssistantMetadata;
}): ScenePreset => {
  const preset = presetLoader.load(input.presetId);
  const parameters = presetLoader.validate(preset, {
    ...getDefaultParameters(preset),
    ...input.parameters,
  });

  return {
    app: 'PhysicsLab AI',
    schemaVersion: '0.3',
    presetId: preset.id,
    presetName: input.presetName ?? preset.name,
    presetType: presetTypeByKind[preset.kind],
    description: input.description ?? preset.description,
    parameters,
    rendering: {
      surfaceMode: input.rendering?.surfaceMode ?? 'both',
      renderScale: input.rendering?.renderScale ?? 1,
    },
    performance: {
      qualityPreset: input.performance?.qualityPreset ?? 'medium',
      autoPerformanceEnabled: input.performance?.autoPerformanceEnabled ?? false,
    },
    debug: {
      debugEnabled: input.debug?.debugEnabled ?? true,
      showParticles: input.debug?.showParticles ?? true,
      showSprings: input.debug?.showSprings ?? true,
      showTrails: input.debug?.showTrails ?? true,
    },
    assistantMetadata: input.assistantMetadata,
  };
};

export const validateScenePreset = (input: unknown): SceneValidationResult => {
  const errors: SceneValidationIssue[] = [];
  const warnings: SceneValidationIssue[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: [{ field: 'scene', message: 'Scene preset must be an object.' }], warnings };
  }

  if (input.app !== 'PhysicsLab AI') errors.push({ field: 'app', message: 'Scene app must be PhysicsLab AI.' });
  if (input.schemaVersion !== '0.3') {
    errors.push({ field: 'schemaVersion', message: 'Scene schemaVersion must be 0.3.' });
  }
  if (typeof input.presetId !== 'string') errors.push({ field: 'presetId', message: 'presetId is required.' });
  if (typeof input.presetName !== 'string' || input.presetName.trim().length === 0) {
    errors.push({ field: 'presetName', message: 'presetName is required.' });
  }
  if (typeof input.description !== 'string' || input.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'description is required.' });
  }

  let presetId: PresetId | undefined;
  let preset;
  if (typeof input.presetId === 'string') {
    try {
      preset = presetLoader.load(input.presetId as PresetId);
      presetId = preset.id;
    } catch {
      errors.push({ field: 'presetId', message: `${input.presetId} is not a known preset id.` });
    }
  }

  if (preset && input.presetType !== presetTypeByKind[preset.kind]) {
    errors.push({ field: 'presetType', message: `presetType must be ${presetTypeByKind[preset.kind]}.` });
  }

  if (!isRecord(input.parameters)) {
    errors.push({ field: 'parameters', message: 'parameters must be an object of finite numbers.' });
  }
  if (!isRecord(input.rendering)) errors.push({ field: 'rendering', message: 'rendering settings are required.' });
  if (!isRecord(input.performance)) errors.push({ field: 'performance', message: 'performance settings are required.' });
  if (!isRecord(input.debug)) errors.push({ field: 'debug', message: 'debug settings are required.' });

  if (!preset || !presetId || !isRecord(input.parameters)) {
    return { ok: false, errors, warnings };
  }

  const parameters: SimulationParameters = {};
  for (const definition of preset.parameterDefinitions) {
    const value = input.parameters[definition.id];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push({ field: `parameters.${definition.id}`, message: `${definition.label} is required.` });
      continue;
    }
    if (value < definition.min || value > definition.max) {
      errors.push({
        field: `parameters.${definition.id}`,
        message: `${definition.label} must be between ${definition.min} and ${definition.max}.`,
      });
      continue;
    }
    parameters[definition.id] = value;
  }

  for (const key of Object.keys(input.parameters)) {
    if (!preset.parameterDefinitions.some((definition) => definition.id === key)) {
      warnings.push({ field: `parameters.${key}`, message: `${key} is ignored because this preset does not use it.` });
    }
  }

  const rendering = normalizeRendering(input.rendering, errors);
  const performance = normalizePerformance(input.performance, errors);
  const debug = normalizeDebug(input.debug, errors);

  if (errors.length > 0 || !rendering || !performance || !debug) {
    return { ok: false, errors, warnings };
  }

  for (const warning of analyzeSceneStability({ presetId, parameters, debug, rendering })) {
    warnings.push({
      field: `parameters.${warning.parameter}`,
      message: `${warning.parameter}: ${warning.explanation}`,
    });
  }

  const scene: ScenePreset = {
    app: 'PhysicsLab AI',
    schemaVersion: '0.3',
    presetId,
    presetName: input.presetName as string,
    presetType: presetTypeByKind[preset.kind],
    description: input.description as string,
    parameters,
    rendering,
    performance,
    debug,
    assistantMetadata: normalizeAssistantMetadata(input.assistantMetadata),
  };

  return { ok: true, scene, errors, warnings };
};

const normalizeRendering = (
  value: unknown,
  errors: SceneValidationIssue[],
): ScenePreset['rendering'] | null => {
  if (!isRecord(value)) return null;
  if (!isSurfaceMode(value.surfaceMode)) {
    errors.push({ field: 'rendering.surfaceMode', message: 'surfaceMode must be debug, shaded, or both.' });
  }
  const renderScale = value.renderScale ?? 1;
  if (typeof renderScale !== 'number' || !Number.isFinite(renderScale) || renderScale < 0.5 || renderScale > 1) {
    errors.push({ field: 'rendering.renderScale', message: 'renderScale must be between 0.5 and 1.' });
  }
  if (!isSurfaceMode(value.surfaceMode) || typeof renderScale !== 'number') return null;
  return { surfaceMode: value.surfaceMode, renderScale };
};

const normalizePerformance = (
  value: unknown,
  errors: SceneValidationIssue[],
): ScenePreset['performance'] | null => {
  if (!isRecord(value)) return null;
  if (!isQualityPreset(value.qualityPreset)) {
    errors.push({ field: 'performance.qualityPreset', message: 'qualityPreset must be low, medium, high, or extreme.' });
  }
  if (typeof value.autoPerformanceEnabled !== 'boolean') {
    errors.push({ field: 'performance.autoPerformanceEnabled', message: 'autoPerformanceEnabled must be boolean.' });
  }
  if (!isQualityPreset(value.qualityPreset) || typeof value.autoPerformanceEnabled !== 'boolean') return null;
  return {
    qualityPreset: value.qualityPreset,
    autoPerformanceEnabled: value.autoPerformanceEnabled,
  };
};

const normalizeDebug = (value: unknown, errors: SceneValidationIssue[]): ScenePreset['debug'] | null => {
  if (!isRecord(value)) return null;
  const keys: Array<keyof AssistantDebugState> = ['debugEnabled', 'showParticles', 'showSprings', 'showTrails'];
  for (const key of keys) {
    if (typeof value[key] !== 'boolean') errors.push({ field: `debug.${key}`, message: `${key} must be boolean.` });
  }
  if (!keys.every((key) => typeof value[key] === 'boolean')) return null;
  return {
    debugEnabled: value.debugEnabled as boolean,
    showParticles: value.showParticles as boolean,
    showSprings: value.showSprings as boolean,
    showTrails: value.showTrails as boolean,
  };
};

const normalizeAssistantMetadata = (value: unknown): SceneAssistantMetadata | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    generatedBy: typeof value.generatedBy === 'string' ? value.generatedBy : undefined,
    prompt: typeof value.prompt === 'string' ? value.prompt : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    experimental: typeof value.experimental === 'boolean' ? value.experimental : undefined,
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter((entry): entry is string => typeof entry === 'string')
      : undefined,
    tags: Array.isArray(value.tags) ? value.tags.filter((entry): entry is string => typeof entry === 'string') : undefined,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isQualityPreset = (value: unknown): value is QualityPresetId =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'extreme';

const isSurfaceMode = (value: unknown): value is SurfaceMode =>
  value === 'debug' || value === 'shaded' || value === 'both';
