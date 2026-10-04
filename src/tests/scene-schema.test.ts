import { describe, expect, it } from 'vitest';
import { createScenePreset, validateScenePreset } from '../scene/ScenePresetSchema';

describe('ScenePresetSchema', () => {
  it('accepts a valid v0.3 scene preset', () => {
    const scene = createScenePreset({
      presetId: 'soft-body-cube',
      parameters: { stiffness: 24, damping: 0.32, gravity: 2.4 },
      assistantMetadata: { generatedBy: 'test', prompt: 'Create a low-gravity jelly cube scene' },
    });
    const validation = validateScenePreset(scene);

    expect(validation.ok).toBe(true);
    expect(validation.scene?.presetType).toBe('softBody');
    expect(validation.scene?.parameters.stiffness).toBe(24);
  });

  it('rejects invalid preset types and unsafe numeric ranges', () => {
    const scene = createScenePreset({ presetId: 'particle-fluid' });
    const validation = validateScenePreset({
      ...scene,
      presetType: 'gravity',
      parameters: { ...scene.parameters, particleCount: 9999 },
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.map((error) => error.field)).toContain('presetType');
    expect(validation.errors.map((error) => error.field)).toContain('parameters.particleCount');
  });

  it('reports readable warnings for risky but valid scenes', () => {
    const scene = createScenePreset({
      presetId: 'gravity-sandbox',
      parameters: { timestep: 2.2, attractorStrength: 130 },
    });
    const validation = validateScenePreset(scene);

    expect(validation.ok).toBe(true);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings.some((warning) => warning.message.includes('timestep'))).toBe(true);
  });
});
