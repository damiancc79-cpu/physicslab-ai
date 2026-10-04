import type { SimParticle, SimulationObject, SimulationParameters, SimulationSnapshot } from '../core/types';
import { clampMagnitude, cloneVec3, vec3 } from '../core/vector';
import { SemiImplicitEulerIntegrator } from '../integrators/SemiImplicitEulerIntegrator';
import { CollisionSystem } from '../solvers/CollisionSystem';
import { ConstraintSolver, type SpringConstraint } from '../solvers/ConstraintSolver';

interface SoftBodySurfaceTopology {
  resolution: number;
  particleIndices: number[];
  indices: number[];
}

export class SoftBodyCube implements SimulationObject {
  readonly kind = 'soft-body' as const;
  private particles: SimParticle[] = [];
  private springs: SpringConstraint[] = [];
  private surfaceTopology?: SoftBodySurfaceTopology;
  private resolution = 0;
  private size = 0;
  private readonly integrator = new SemiImplicitEulerIntegrator();
  private readonly collisionSystem = new CollisionSystem();
  private readonly constraintSolver = new ConstraintSolver();

  reset(parameters: SimulationParameters): void {
    this.resolution = Math.round(parameters.resolution ?? 4);
    this.size = parameters.size ?? 2.5;
    this.particles = [];
    this.springs = [];
    this.surfaceTopology = undefined;

    const spacing = this.size / Math.max(1, this.resolution - 1);
    const origin = -this.size / 2;
    const mass = parameters.mass ?? 1;
    let index = 0;

    for (let z = 0; z < this.resolution; z += 1) {
      for (let y = 0; y < this.resolution; y += 1) {
        for (let x = 0; x < this.resolution; x += 1) {
          this.particles.push({
            id: `soft-${index}`,
            position: vec3(origin + x * spacing, 2.8 + y * spacing, origin + z * spacing),
            previousPosition: vec3(origin + x * spacing, 2.8 + y * spacing, origin + z * spacing),
            velocity: vec3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25),
            force: vec3(),
            mass,
            radius: 0.055,
            color: '#7dd3fc',
          });
          index += 1;
        }
      }
    }

    this.createSprings(spacing);
  }

  step(deltaSeconds: number, parameters: SimulationParameters): void {
    const nextResolution = Math.round(parameters.resolution ?? this.resolution);
    const nextSize = parameters.size ?? this.size;
    if (nextResolution !== this.resolution || Math.abs(nextSize - this.size) > 0.001) {
      this.reset(parameters);
      return;
    }

    const iterations = Math.max(1, Math.round(parameters.solverIterations ?? 2));
    const subDelta = Math.min(deltaSeconds, 1 / 30) / iterations;
    const stiffness = parameters.stiffness ?? 34;
    const springDamping = parameters.damping ?? 0.34;
    const gravity = parameters.gravity ?? 9.8;

    for (const particle of this.particles) {
      particle.mass = parameters.mass ?? 1;
    }

    for (let pass = 0; pass < iterations; pass += 1) {
      for (const particle of this.particles) {
        particle.previousPosition = cloneVec3(particle.position);
        particle.force.x = 0;
        particle.force.y = -gravity * particle.mass;
        particle.force.z = 0;
      }

      this.constraintSolver.applySprings(this.particles, this.springs, stiffness, springDamping);
      this.integrator.integrate(this.particles, subDelta);

      const velocityDamping = Math.max(0.86, 1 - springDamping * 0.012);
      for (const particle of this.particles) {
        particle.velocity.x *= velocityDamping;
        particle.velocity.y *= velocityDamping;
        particle.velocity.z *= velocityDamping;
        clampMagnitude(particle.velocity, 9.5);
      }

      this.collisionSystem.resolveBox(this.particles, 5.2, 0.36);
    }
  }

  getSnapshot(): SimulationSnapshot {
    const surfaceTopology = this.getSurfaceTopology();

    return {
      kind: this.kind,
      bounds: 5.2,
      particles: this.particles.map((particle) => ({
        id: particle.id,
        position: particle.position,
        radius: particle.radius,
        color: particle.color,
      })),
      springs: this.springs.map((spring) => ({
        id: spring.id,
        a: this.particles[spring.a].position,
        b: this.particles[spring.b].position,
        color: '#38bdf8',
      })),
      attractors: [],
      trails: [],
      surfaces: [
        {
          id: 'soft-body-surface',
          vertices: surfaceTopology.particleIndices.map((particleIndex) => this.particles[particleIndex].position),
          indices: surfaceTopology.indices,
          color: '#0891b2',
        },
      ],
    };
  }

  getObjectCount(): number {
    return this.particles.length;
  }

  private createSprings(spacing: number): void {
    const addSpring = (a: number, b: number, multiplier = 1): void => {
      this.springs.push({
        id: `spring-${this.springs.length}`,
        a,
        b,
        restLength: spacing * multiplier,
      });
    };

    for (let z = 0; z < this.resolution; z += 1) {
      for (let y = 0; y < this.resolution; y += 1) {
        for (let x = 0; x < this.resolution; x += 1) {
          const current = this.indexFor(x, y, z);
          if (x + 1 < this.resolution) addSpring(current, this.indexFor(x + 1, y, z));
          if (y + 1 < this.resolution) addSpring(current, this.indexFor(x, y + 1, z));
          if (z + 1 < this.resolution) addSpring(current, this.indexFor(x, y, z + 1));
          if (x + 1 < this.resolution && y + 1 < this.resolution) {
            addSpring(current, this.indexFor(x + 1, y + 1, z), Math.SQRT2);
          }
          if (x + 1 < this.resolution && z + 1 < this.resolution) {
            addSpring(current, this.indexFor(x + 1, y, z + 1), Math.SQRT2);
          }
          if (y + 1 < this.resolution && z + 1 < this.resolution) {
            addSpring(current, this.indexFor(x, y + 1, z + 1), Math.SQRT2);
          }
        }
      }
    }
  }

  private indexFor(x: number, y: number, z: number): number {
    return z * this.resolution * this.resolution + y * this.resolution + x;
  }

  private getSurfaceTopology(): SoftBodySurfaceTopology {
    if (!this.surfaceTopology || this.surfaceTopology.resolution !== this.resolution) {
      this.surfaceTopology = this.createSurfaceTopology();
    }

    return this.surfaceTopology;
  }

  private createSurfaceTopology(): SoftBodySurfaceTopology {
    const particleIndices: number[] = [];
    const indices: number[] = [];
    const max = this.resolution - 1;
    const side = this.resolution;

    const addFace = (coordinateFor: (u: number, v: number) => [number, number, number]): void => {
      const base = particleIndices.length;

      for (let v = 0; v <= max; v += 1) {
        for (let u = 0; u <= max; u += 1) {
          const [x, y, z] = coordinateFor(u, v);
          particleIndices.push(this.indexFor(x, y, z));
        }
      }

      for (let v = 0; v < max; v += 1) {
        for (let u = 0; u < max; u += 1) {
          const a = base + v * side + u;
          const b = base + v * side + u + 1;
          const c = base + (v + 1) * side + u;
          const d = base + (v + 1) * side + u + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    };

    addFace((u, v) => [u, v, 0]);
    addFace((u, v) => [max - u, v, max]);
    addFace((u, v) => [u, 0, v]);
    addFace((u, v) => [u, max, max - v]);
    addFace((u, v) => [0, u, v]);
    addFace((u, v) => [max, u, max - v]);

    return { resolution: this.resolution, particleIndices, indices };
  }
}
