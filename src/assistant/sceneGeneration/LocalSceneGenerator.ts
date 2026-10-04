import type { AssistantDebugState, AssistantPerformanceState, AssistantRenderingState } from '../types';
import { createScenePreset, validateScenePreset, type ScenePreset } from '../../scene/ScenePresetSchema';
import type { PresetId, SimulationParameters } from '../../simulation/core/types';

export interface SceneGenerationInput {
  text: string;
  currentPresetId: PresetId;
  currentDebug: AssistantDebugState;
  currentRendering: AssistantRenderingState;
  currentPerformance: AssistantPerformanceState;
}

export interface SceneGenerationResult {
  scene: ScenePreset;
  explanation: string;
  warnings: string[];
}

export class LocalSceneGenerator {
  generate(input: SceneGenerationInput): SceneGenerationResult | null {
    const text = input.text.toLowerCase();
    const presetId = inferPresetId(text) ?? input.currentPresetId;
    const parameters = this.parametersFor(text, presetId);
    const rendering = this.renderingFor(text, presetId, input.currentRendering);
    const performance = this.performanceFor(text, presetId, input.currentPerformance);
    const debug = this.debugFor(text, presetId, input.currentDebug);
    const scene = createScenePreset({
      presetId,
      presetName: this.nameFor(text, presetId),
      description: this.descriptionFor(text, presetId),
      parameters,
      rendering,
      performance,
      debug,
      assistantMetadata: {
        generatedBy: 'LocalSceneGenerator',
        prompt: input.text,
        createdAt: new Date().toISOString(),
        experimental: false,
        tags: tagsFor(text, presetId),
      },
    });
    const validation = validateScenePreset(scene);
    if (!validation.ok || !validation.scene) return null;

    return {
      scene: validation.scene,
      explanation: `Generated "${validation.scene.presetName}" as a valid ${validation.scene.presetType} scene.`,
      warnings: validation.warnings.map((warning) => warning.message),
    };
  }

  private parametersFor(text: string, presetId: PresetId): SimulationParameters {
    switch (presetId) {
      case 'soft-body-cube':
        return {
          resolution: text.includes('performance') || text.includes('benchmark') ? 3 : 4,
          stiffness: text.includes('jelly') || text.includes('soft') ? 20 : 30,
          damping: text.includes('stable') || text.includes('performance') ? 0.72 : 0.24,
          gravity: text.includes('low-gravity') || text.includes('low gravity') || text.includes('moon') ? 2.4 : 5.2,
          mass: 1,
          size: 2.6,
          solverIterations: text.includes('performance') ? 2 : 3,
        };
      case 'particle-fluid':
        return {
          particleCount: text.includes('cinematic') ? 260 : text.includes('performance') ? 144 : 210,
          viscosity: text.includes('heavy') || text.includes('slow') ? 0.86 : text.includes('cinematic') ? 0.28 : 0.48,
          gravity: text.includes('heavy') ? 11.8 : text.includes('slow') ? 4.4 : 7.8,
          cohesion: text.includes('cinematic') ? 3.2 : 4.2,
          repulsion: text.includes('cinematic') ? 13.8 : 10.2,
          boundarySize: 5.8,
          particleRadius: 0.078,
        };
      case 'gravity-sandbox':
        return {
          bodyCount: text.includes('benchmark') ? 96 : 148,
          attractorStrength: text.includes('chaotic') ? 96 : 54,
          attractorCount: text.includes('three') || text.includes('chaotic') ? 3 : 2,
          timestep: text.includes('benchmark') ? 0.9 : text.includes('chaotic') ? 1.35 : 1,
          damping: text.includes('chaotic') ? 0.986 : 0.994,
          trailLength: text.includes('benchmark') ? 36 : 72,
          spawnRadius: 4.8,
        };
      case 'cloth-sheet':
        return {
          segmentsX: text.includes('performance') ? 14 : 20,
          segmentsY: text.includes('performance') ? 10 : 14,
          stiffness: text.includes('flag') ? 72 : 58,
          damping: text.includes('strong') || text.includes('wind') ? 0.54 : 0.42,
          gravity: 7.2,
          windStrength: text.includes('strong') || text.includes('storm') ? 10.8 : 6.4,
          windTurbulence: text.includes('strong') || text.includes('storm') ? 2.2 : 1.4,
          pinSpacing: text.includes('flag') ? 1 : 2,
          solverIterations: 4,
          clothWidth: 5.4,
          clothHeight: 3.5,
        };
    }
  }

  private renderingFor(
    text: string,
    presetId: PresetId,
    current: AssistantRenderingState,
  ): Partial<ScenePreset['rendering']> {
    if (text.includes('performance') || text.includes('benchmark')) return { surfaceMode: 'debug', renderScale: 0.9 };
    if (presetId === 'soft-body-cube' || presetId === 'cloth-sheet') return { surfaceMode: 'both', renderScale: 1 };
    return { surfaceMode: current.surfaceMode, renderScale: 1 };
  }

  private performanceFor(
    text: string,
    _presetId: PresetId,
    current: AssistantPerformanceState,
  ): Partial<ScenePreset['performance']> {
    if (text.includes('performance') || text.includes('benchmark')) {
      return { qualityPreset: 'low', autoPerformanceEnabled: true };
    }
    if (text.includes('cinematic')) return { qualityPreset: 'high', autoPerformanceEnabled: false };
    return { qualityPreset: current.qualityPreset, autoPerformanceEnabled: current.autoPerformanceEnabled };
  }

  private debugFor(
    text: string,
    presetId: PresetId,
    current: AssistantDebugState,
  ): Partial<ScenePreset['debug']> {
    if (text.includes('performance') || text.includes('benchmark')) {
      return { debugEnabled: false, showParticles: presetId !== 'gravity-sandbox', showSprings: false, showTrails: false };
    }
    return current;
  }

  private nameFor(text: string, presetId: PresetId): string {
    if (presetId === 'soft-body-cube') {
      if (text.includes('performance')) return 'Stable Performance Jelly Cube';
      return 'Low-Gravity Jelly Cube';
    }
    if (presetId === 'particle-fluid') {
      if (text.includes('cinematic')) return 'Cinematic Particle Fluid';
      return 'Heavy Slow-Motion Fluid';
    }
    if (presetId === 'gravity-sandbox') {
      if (text.includes('benchmark')) return 'Benchmark-Friendly Gravity Scene';
      return 'Chaotic Three-Attractor Orbit';
    }
    return text.includes('flag') ? 'Strong-Wind Cloth Flag' : 'Wind-Tuned Cloth Sheet';
  }

  private descriptionFor(text: string, presetId: PresetId): string {
    if (presetId === 'soft-body-cube') return 'A stable soft-body scene tuned for readable elastic motion.';
    if (presetId === 'particle-fluid') return 'A local-neighbor particle fluid scene with safe visual density.';
    if (presetId === 'gravity-sandbox') return 'An orbital scene with constrained timestep and attractor strength.';
    return 'A pinned cloth scene with wind forces and safe solver passes.';
  }
}

const inferPresetId = (text: string): PresetId | undefined => {
  if (matches(text, ['soft', 'jelly', 'cube', 'rubber'])) return 'soft-body-cube';
  if (matches(text, ['cloth', 'flag', 'sheet', 'fabric', 'wind'])) return 'cloth-sheet';
  if (matches(text, ['fluid', 'water', 'honey', 'syrup', 'splash', 'particle'])) return 'particle-fluid';
  if (matches(text, ['orbit', 'gravity', 'attractor', 'planet'])) return 'gravity-sandbox';
  return undefined;
};

const tagsFor = (text: string, presetId: PresetId): string[] => [
  presetId,
  ...['stable', 'performance', 'cinematic', 'benchmark', 'chaotic', 'slow'].filter((tag) => text.includes(tag)),
];

const matches = (text: string, needles: string[]): boolean => needles.some((needle) => text.includes(needle));

export const localSceneGenerator = new LocalSceneGenerator();
