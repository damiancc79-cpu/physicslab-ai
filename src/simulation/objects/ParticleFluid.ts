import type { SimParticle, SimulationObject, SimulationParameters, SimulationSnapshot } from '../core/types';
import { clampMagnitude, cloneVec3, length, subtract, vec3 } from '../core/vector';
import { SemiImplicitEulerIntegrator } from '../integrators/SemiImplicitEulerIntegrator';
import { CollisionSystem } from '../solvers/CollisionSystem';
import { randomBetween, randomSigned } from '../../utils/random';

export class ParticleFluid implements SimulationObject {
  readonly kind = 'particle-fluid' as const;
  private particles: SimParticle[] = [];
  private particleCount = 0;
  private readonly integrator = new SemiImplicitEulerIntegrator();
  private readonly collisionSystem = new CollisionSystem();
  private readonly neighborCells = new Map<string, number[]>();

  reset(parameters: SimulationParameters): void {
    this.particleCount = Math.round(parameters.particleCount ?? 180);
    const radius = parameters.particleRadius ?? 0.075;
    this.particles = Array.from({ length: this.particleCount }, (_, index) => ({
      id: `fluid-${index}`,
      position: vec3(randomSigned(0.8), randomBetween(1.6, 4.8), randomSigned(0.8)),
      previousPosition: vec3(),
      velocity: vec3(randomSigned(0.35), randomBetween(-0.2, 0.8), randomSigned(0.35)),
      force: vec3(),
      mass: 0.8,
      radius,
      color: index % 3 === 0 ? '#67e8f9' : index % 3 === 1 ? '#38bdf8' : '#0ea5e9',
    }));
  }

  step(deltaSeconds: number, parameters: SimulationParameters): void {
    const nextCount = Math.round(parameters.particleCount ?? this.particleCount);
    if (nextCount !== this.particleCount) {
      this.reset(parameters);
      return;
    }

    const radius = parameters.particleRadius ?? 0.075;
    const gravity = parameters.gravity ?? 8.2;
    const viscosity = parameters.viscosity ?? 0.38;
    const cohesion = parameters.cohesion ?? 2.4;
    const repulsion = parameters.repulsion ?? 11;
    const boundarySize = parameters.boundarySize ?? 5.5;
    const delta = Math.min(deltaSeconds, 1 / 30);
    const smoothingRadius = Math.max(0.32, radius * 7.5);

    for (const particle of this.particles) {
      particle.previousPosition = cloneVec3(particle.position);
      particle.radius = radius;
      particle.force.x = 0;
      particle.force.y = -gravity * particle.mass;
      particle.force.z = 0;
    }

    this.rebuildNeighborCells(smoothingRadius);

    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      for (const j of this.getNeighborIndexes(particle, smoothingRadius)) {
        if (j <= i) continue;
        const a = this.particles[i];
        const b = this.particles[j];
        const offset = subtract(b.position, a.position);
        const distance = length(offset) || 0.0001;

        if (distance > smoothingRadius) continue;

        const direction = {
          x: offset.x / distance,
          y: offset.y / distance,
          z: offset.z / distance,
        };
        const proximity = 1 - distance / smoothingRadius;
        const pressure = repulsion * proximity * proximity;
        const attraction = cohesion * (0.36 - proximity) * 0.18;
        const force = pressure - attraction;

        a.force.x -= direction.x * force;
        a.force.y -= direction.y * force;
        a.force.z -= direction.z * force;
        b.force.x += direction.x * force;
        b.force.y += direction.y * force;
        b.force.z += direction.z * force;

        const velocityMix = viscosity * proximity * 0.016;
        const vx = (b.velocity.x - a.velocity.x) * velocityMix;
        const vy = (b.velocity.y - a.velocity.y) * velocityMix;
        const vz = (b.velocity.z - a.velocity.z) * velocityMix;
        a.velocity.x += vx;
        a.velocity.y += vy;
        a.velocity.z += vz;
        b.velocity.x -= vx;
        b.velocity.y -= vy;
        b.velocity.z -= vz;
      }
    }

    this.integrator.integrate(this.particles, delta);

    const drag = Math.max(0.88, 1 - viscosity * 0.025);
    for (const particle of this.particles) {
      particle.velocity.x *= drag;
      particle.velocity.y *= drag;
      particle.velocity.z *= drag;
      clampMagnitude(particle.velocity, 10);
    }

    this.collisionSystem.resolveBox(this.particles, boundarySize, 0.28);
  }

  getSnapshot(parameters: SimulationParameters): SimulationSnapshot {
    return {
      kind: this.kind,
      bounds: parameters.boundarySize ?? 5.5,
      particles: this.particles.map((particle) => ({
        id: particle.id,
        position: particle.position,
        radius: particle.radius,
        color: particle.color,
      })),
      springs: [],
      attractors: [],
      trails: [],
    };
  }

  getObjectCount(): number {
    return this.particles.length;
  }

  private rebuildNeighborCells(cellSize: number): void {
    this.neighborCells.clear();

    for (let index = 0; index < this.particles.length; index += 1) {
      const key = this.cellKey(this.particles[index], cellSize);
      const bucket = this.neighborCells.get(key);
      if (bucket) {
        bucket.push(index);
      } else {
        this.neighborCells.set(key, [index]);
      }
    }
  }

  private getNeighborIndexes(particle: SimParticle, cellSize: number): number[] {
    const cellX = Math.floor(particle.position.x / cellSize);
    const cellY = Math.floor(particle.position.y / cellSize);
    const cellZ = Math.floor(particle.position.z / cellSize);
    const indexes: number[] = [];

    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        for (let z = cellZ - 1; z <= cellZ + 1; z += 1) {
          const bucket = this.neighborCells.get(`${x}:${y}:${z}`);
          if (bucket) indexes.push(...bucket);
        }
      }
    }

    return indexes;
  }

  private cellKey(particle: SimParticle, cellSize: number): string {
    return [
      Math.floor(particle.position.x / cellSize),
      Math.floor(particle.position.y / cellSize),
      Math.floor(particle.position.z / cellSize),
    ].join(':');
  }
}
