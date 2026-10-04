import { afterEach, describe, expect, it } from 'vitest';
import { createScenePreset } from '../scene/ScenePresetSchema';
import { deleteUserPreset, loadUserPresets, saveUserPreset } from '../library/UserPresetLibrary';

describe('UserPresetLibrary', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('saves validated scene presets with generated thumbnails', () => {
    const scene = createScenePreset({
      presetId: 'soft-body-cube',
      presetName: 'Saved Jelly Cube',
      parameters: { gravity: 2.4, stiffness: 22 },
    });
    const library = saveUserPreset([], scene, 'Portfolio Jelly', new Date('2026-06-28T14:00:00Z'));

    expect(library).toHaveLength(1);
    expect(library[0].label).toBe('Portfolio Jelly');
    expect(library[0].thumbnail).toMatch(/^data:image\/svg\+xml/);
    expect(loadUserPresets()[0].scene.presetId).toBe('soft-body-cube');
  });

  it('deletes saved presets and persists the updated library', () => {
    const scene = createScenePreset({ presetId: 'cloth-sheet', presetName: 'Wind Flag' });
    const library = saveUserPreset([], scene, 'Wind Flag', new Date('2026-06-28T14:00:00Z'));
    const nextLibrary = deleteUserPreset(library, library[0].id);

    expect(nextLibrary).toHaveLength(0);
    expect(loadUserPresets()).toHaveLength(0);
  });
});
