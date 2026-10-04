import type {
  PresetId,
  SimulationObject,
  SimulationParameters,
  SimulationPreset,
  SimulationSnapshot,
} from './types';
import { ClothSheet } from '../objects/ClothSheet';
import { GravitySandbox } from '../objects/GravitySandbox';
import { ParticleFluid } from '../objects/ParticleFluid';
import { SoftBodyCube } from '../objects/SoftBodyCube';
import { presetLoader } from '../presets/PresetLoader';

export class SimulationWorld {
  private preset: SimulationPreset;
  private simulationObject: SimulationObject;

  constructor(presetId: PresetId, parameters: SimulationParameters) {
    this.preset = presetLoader.load(presetId);
    this.simulationObject = this.createObject(this.preset);
    this.simulationObject.reset(parameters);
  }

  setPreset(presetId: PresetId, parameters: SimulationParameters): void {
    this.preset = presetLoader.load(presetId);
    this.simulationObject = this.createObject(this.preset);
    this.simulationObject.reset(parameters);
  }

  reset(parameters: SimulationParameters): void {
    this.simulationObject.reset(parameters);
  }

  step(deltaSeconds: number, parameters: SimulationParameters): void {
    this.simulationObject.step(deltaSeconds, parameters);
  }

  getSnapshot(parameters: SimulationParameters): SimulationSnapshot {
    return this.simulationObject.getSnapshot(parameters);
  }

  getObjectCount(): number {
    return this.simulationObject.getObjectCount();
  }

  getPreset(): SimulationPreset {
    return this.preset;
  }

  private createObject(preset: SimulationPreset): SimulationObject {
    switch (preset.kind) {
      case 'soft-body':
        return new SoftBodyCube();
      case 'particle-fluid':
        return new ParticleFluid();
      case 'gravity':
        return new GravitySandbox();
      case 'cloth':
        return new ClothSheet();
    }
  }
}
