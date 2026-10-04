import { describe, expect, it } from 'vitest';
import { SimulationWorld } from '../simulation/core/SimulationWorld';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';

describe('SimulationWorld', () => {
  it('steps the soft body cube and moves at least one particle', () => {
    const preset = presetLoader.load('soft-body-cube');
    const parameters = getDefaultParameters(preset);
    const world = new SimulationWorld('soft-body-cube', parameters);
    const before = world.getSnapshot(parameters).particles[0].position.y;

    world.step(1 / 60, parameters);

    const snapshot = world.getSnapshot(parameters);
    const after = snapshot.particles[0].position.y;
    const surface = snapshot.surfaces?.find((entry) => entry.id === 'soft-body-surface');

    expect(after).not.toBe(before);
    expect(surface?.indices.length).toBeGreaterThan(0);
    expect(surface?.vertices.length).toBeGreaterThan(snapshot.particles.length);
  });

  it('can switch between simulation objects', () => {
    const softParameters = getDefaultParameters(presetLoader.load('soft-body-cube'));
    const fluidParameters = getDefaultParameters(presetLoader.load('particle-fluid'));
    const world = new SimulationWorld('soft-body-cube', softParameters);

    world.setPreset('particle-fluid', fluidParameters);

    expect(world.getSnapshot(fluidParameters).kind).toBe('particle-fluid');
    expect(world.getObjectCount()).toBe(fluidParameters.particleCount);
  });

  it('steps the fluid preset without losing particles', () => {
    const parameters = { ...getDefaultParameters(presetLoader.load('particle-fluid')), particleCount: 96 };
    const world = new SimulationWorld('particle-fluid', parameters);

    world.step(1 / 60, parameters);
    world.step(1 / 60, parameters);

    const snapshot = world.getSnapshot(parameters);
    expect(snapshot.particles).toHaveLength(96);
    expect(snapshot.particles.every((particle) => Number.isFinite(particle.position.y))).toBe(true);
  });

  it('steps the cloth preset with pins and springs', () => {
    const parameters = getDefaultParameters(presetLoader.load('cloth-sheet'));
    const world = new SimulationWorld('cloth-sheet', parameters);
    const before = world.getSnapshot(parameters);
    const pinnedBefore = before.particles[0].position.y;
    const lowerBefore = before.particles[before.particles.length - 1].position.z;

    world.step(1 / 60, parameters);
    world.step(1 / 60, parameters);

    const after = world.getSnapshot(parameters);
    const surface = after.surfaces?.find((entry) => entry.id === 'cloth-surface');
    expect(after.kind).toBe('cloth');
    expect(after.springs.length).toBeGreaterThan(after.particles.length);
    expect(after.particles[0].position.y).toBe(pinnedBefore);
    expect(after.particles[after.particles.length - 1].position.z).not.toBe(lowerBefore);
    expect(surface?.indices.length).toBeGreaterThan(0);
  });
});
