import { describe, expect, it } from 'vitest';
import { presetLoader } from '../simulation/presets/PresetLoader';

describe('PresetLoader', () => {
  it('loads the built-in presets', () => {
    expect(presetLoader.getAll().map((preset) => preset.id)).toEqual([
      'soft-body-cube',
      'particle-fluid',
      'gravity-sandbox',
      'cloth-sheet',
    ]);
  });

  it('clamps parameter values to the preset schema', () => {
    const preset = presetLoader.load('particle-fluid');
    const validated = presetLoader.validate(preset, {
      particleCount: 999,
      viscosity: -4,
      gravity: 9,
    });

    expect(validated.particleCount).toBe(420);
    expect(validated.viscosity).toBe(0.01);
    expect(validated.gravity).toBe(9);
  });
});
