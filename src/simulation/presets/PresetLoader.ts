import type { PresetId, SimulationParameters, SimulationPreset } from '../core/types';
import { clamp } from '../core/vector';
import { getDefaultParameters, simulationPresets } from './presets';

export class PresetLoader {
  getAll(): SimulationPreset[] {
    return simulationPresets;
  }

  load(id: PresetId): SimulationPreset {
    const preset = simulationPresets.find((candidate) => candidate.id === id);
    if (!preset) {
      throw new Error(`Unknown simulation preset: ${id}`);
    }
    return preset;
  }

  validate(preset: SimulationPreset, parameters: SimulationParameters): SimulationParameters {
    const defaults = getDefaultParameters(preset);
    const validated: SimulationParameters = {};

    for (const definition of preset.parameterDefinitions) {
      const rawValue = parameters[definition.id] ?? defaults[definition.id];
      const stepped =
        definition.step >= 1 ? Math.round(rawValue / definition.step) * definition.step : rawValue;
      validated[definition.id] = clamp(stepped, definition.min, definition.max);
    }

    return validated;
  }

  randomize(preset: SimulationPreset): SimulationParameters {
    const next: SimulationParameters = {};

    for (const definition of preset.parameterDefinitions) {
      const span = definition.max - definition.min;
      const value = definition.min + span * Math.random();
      next[definition.id] =
        definition.step >= 1
          ? Math.round(value / definition.step) * definition.step
          : Number(value.toFixed(3));
    }

    return this.validate(preset, next);
  }
}

export const presetLoader = new PresetLoader();
