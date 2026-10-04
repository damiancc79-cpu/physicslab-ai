import type { Vec3 } from './vector';

export type PresetId = 'soft-body-cube' | 'particle-fluid' | 'gravity-sandbox' | 'cloth-sheet';

export type SimulationKind = 'soft-body' | 'particle-fluid' | 'gravity' | 'cloth';

export interface NumericParameterDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  group?: string;
}

export type SimulationParameters = Record<string, number>;

export interface SimulationPreset {
  id: PresetId;
  name: string;
  description: string;
  kind: SimulationKind;
  parameterDefinitions: NumericParameterDefinition[];
}

export interface SimParticle {
  id: string;
  position: Vec3;
  previousPosition?: Vec3;
  velocity: Vec3;
  force: Vec3;
  mass: number;
  radius: number;
  color: string;
  trail?: Vec3[];
}

export interface RenderParticle {
  id: string;
  position: Vec3;
  radius: number;
  color: string;
}

export interface RenderSpring {
  id: string;
  a: Vec3;
  b: Vec3;
  color: string;
}

export interface RenderAttractor {
  id: string;
  position: Vec3;
  strength: number;
  color?: string;
}

export interface RenderSurfaceMesh {
  id: string;
  vertices: Vec3[];
  indices: number[];
  color: string;
}

export interface SimulationSnapshot {
  kind: SimulationKind;
  bounds: number;
  particles: RenderParticle[];
  springs: RenderSpring[];
  attractors: RenderAttractor[];
  trails: Vec3[][];
  surfaces?: RenderSurfaceMesh[];
}

export interface SimulationObject {
  readonly kind: SimulationKind;
  reset(parameters: SimulationParameters): void;
  step(deltaSeconds: number, parameters: SimulationParameters): void;
  getSnapshot(parameters: SimulationParameters): SimulationSnapshot;
  getObjectCount(): number;
}
