import type { SimParticle, SimulationObject, SimulationParameters, SimulationSnapshot } from '../core/types';
import { clampMagnitude, cloneVec3, length, subtract, vec3 } from '../core/vector';
import { SemiImplicitEulerIntegrator } from '../integrators/SemiImplicitEulerIntegrator';
import { CollisionSystem } from '../solvers/CollisionSystem';
import type { SpringConstraint } from '../solvers/ConstraintSolver';

export class ClothSheet implements SimulationObject {
  readonly kind = 'cloth' as const;
  private particles: SimParticle[] = [];
  private springs: SpringConstraint[] = [];
  private pinned = new Set<number>();
  private segmentsX = 0;
  private segmentsY = 0;
  private clothWidth = 0;
  private clothHeight = 0;
  private pinSpacing = 0;
  private elapsedTime = 0;
  private readonly integrator = new SemiImplicitEulerIntegrator();
  private readonly collisionSystem = new CollisionSystem();

  reset(parameters: SimulationParameters): void {
    this.segmentsX = Math.round(parameters.segmentsX ?? 16);
    this.segmentsY = Math.round(parameters.segmentsY ?? 12);
    this.clothWidth = parameters.clothWidth ?? 5.2;
    this.clothHeight = parameters.clothHeight ?? 3.4;
    this.pinSpacing = Math.max(1, Math.round(parameters.pinSpacing ?? 2));
    this.elapsedTime = 0;
    this.particles = [];
    this.springs = [];
    this.pinned = new Set();

    const spacingX = this.clothWidth / this.segmentsX;
    const spacingY = this.clothHeight / this.segmentsY;
    const originX = -this.clothWidth / 2;
    const originY = 4.8;
    const originZ = 0;

    for (let y = 0; y <= this.segmentsY; y += 1) {
      for (let x = 0; x <= this.segmentsX; x += 1) {
        const index = this.indexFor(x, y);
        const topRow = y === 0;
        const pinned = topRow && (x % this.pinSpacing === 0 || x === 0 || x === this.segmentsX);
        if (pinned) this.pinned.add(index);

        this.particles.push({
          id: `cloth-${index}`,
          position: vec3(originX + x * spacingX, originY - y * spacingY, originZ),
          previousPosition: vec3(originX + x * spacingX, originY - y * spacingY, originZ),
          velocity: vec3(),
          force: vec3(),
          mass: pinned ? 0 : 0.7,
          radius: pinned ? 0.065 : 0.042,
          color: pinned ? '#facc15' : '#93c5fd',
        });
      }
    }

    this.createSprings(spacingX, spacingY);
  }

  step(deltaSeconds: number, parameters: SimulationParameters): void {
    const nextSegmentsX = Math.round(parameters.segmentsX ?? this.segmentsX);
    const nextSegmentsY = Math.round(parameters.segmentsY ?? this.segmentsY);
    const nextPinSpacing = Math.max(1, Math.round(parameters.pinSpacing ?? this.pinSpacing));
    const nextWidth = parameters.clothWidth ?? this.clothWidth;
    const nextHeight = parameters.clothHeight ?? this.clothHeight;

    if (
      nextSegmentsX !== this.segmentsX ||
      nextSegmentsY !== this.segmentsY ||
      nextPinSpacing !== this.pinSpacing ||
      Math.abs(nextWidth - this.clothWidth) > 0.001 ||
      Math.abs(nextHeight - this.clothHeight) > 0.001
    ) {
      this.reset(parameters);
      return;
    }

    const iterations = Math.max(1, Math.round(parameters.solverIterations ?? 3));
    const subDelta = Math.min(deltaSeconds, 1 / 30) / iterations;
    const stiffness = parameters.stiffness ?? 58;
    const damping = parameters.damping ?? 0.42;
    const gravity = parameters.gravity ?? 7.8;
    const windStrength = parameters.windStrength ?? 5.6;
    const turbulence = parameters.windTurbulence ?? 1.4;
    this.elapsedTime += deltaSeconds;

    for (let pass = 0; pass < iterations; pass += 1) {
      for (let index = 0; index < this.particles.length; index += 1) {
        const particle = this.particles[index];
        particle.previousPosition = cloneVec3(particle.position);
        particle.force.x = 0;
        particle.force.y = this.pinned.has(index) ? 0 : -gravity * particle.mass;
        particle.force.z = 0;

        if (!this.pinned.has(index) && windStrength > 0) {
          const phase = particle.position.x * 1.4 + particle.position.y * 0.8 + this.elapsedTime * 2.2;
          const gust = Math.sin(phase) + Math.cos(phase * 0.61) * turbulence;
          particle.force.x += Math.sin(phase * 0.47) * windStrength * 0.18;
          particle.force.z += (0.8 + gust * 0.25) * windStrength;
        }
      }

      this.applySprings(stiffness, damping);
      this.integrator.integrate(this.particles, subDelta);
      this.restorePins();

      const drag = Math.max(0.86, 1 - damping * 0.018);
      for (const particle of this.particles) {
        particle.velocity.x *= drag;
        particle.velocity.y *= drag;
        particle.velocity.z *= drag;
        clampMagnitude(particle.velocity, 8.5);
      }

      this.collisionSystem.resolveBox(this.particles, 5.8, 0.24);
      this.restorePins();
    }
  }

  getSnapshot(): SimulationSnapshot {
    return {
      kind: this.kind,
      bounds: 5.8,
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
        color: this.pinned.has(spring.a) || this.pinned.has(spring.b) ? '#facc15' : '#60a5fa',
      })),
      attractors: [],
      trails: [],
      surfaces: [
        {
          id: 'cloth-surface',
          vertices: this.particles.map((particle) => particle.position),
          indices: this.surfaceIndices(),
          color: '#2563eb',
        },
      ],
    };
  }

  getObjectCount(): number {
    return this.particles.length;
  }

  private applySprings(stiffness: number, damping: number): void {
    for (const spring of this.springs) {
      const a = this.particles[spring.a];
      const b = this.particles[spring.b];
      const offset = subtract(b.position, a.position);
      const distance = length(offset) || 1;
      const direction = {
        x: offset.x / distance,
        y: offset.y / distance,
        z: offset.z / distance,
      };
      const stretch = distance - spring.restLength;
      const relativeVelocity = subtract(b.velocity, a.velocity);
      const velocityAlongSpring =
        relativeVelocity.x * direction.x +
        relativeVelocity.y * direction.y +
        relativeVelocity.z * direction.z;
      const force = stiffness * stretch + damping * velocityAlongSpring;

      if (!this.pinned.has(spring.a)) {
        a.force.x += force * direction.x;
        a.force.y += force * direction.y;
        a.force.z += force * direction.z;
      }

      if (!this.pinned.has(spring.b)) {
        b.force.x -= force * direction.x;
        b.force.y -= force * direction.y;
        b.force.z -= force * direction.z;
      }
    }
  }

  private restorePins(): void {
    for (const index of this.pinned) {
      const particle = this.particles[index];
      const previous = particle.previousPosition ?? particle.position;
      particle.position.x = previous.x;
      particle.position.y = previous.y;
      particle.position.z = previous.z;
      particle.velocity.x = 0;
      particle.velocity.y = 0;
      particle.velocity.z = 0;
    }
  }

  private createSprings(spacingX: number, spacingY: number): void {
    const addSpring = (a: number, b: number, restLength: number): void => {
      this.springs.push({
        id: `cloth-spring-${this.springs.length}`,
        a,
        b,
        restLength,
      });
    };

    for (let y = 0; y <= this.segmentsY; y += 1) {
      for (let x = 0; x <= this.segmentsX; x += 1) {
        const current = this.indexFor(x, y);
        if (x + 1 <= this.segmentsX) addSpring(current, this.indexFor(x + 1, y), spacingX);
        if (y + 1 <= this.segmentsY) addSpring(current, this.indexFor(x, y + 1), spacingY);
        if (x + 1 <= this.segmentsX && y + 1 <= this.segmentsY) {
          addSpring(current, this.indexFor(x + 1, y + 1), Math.hypot(spacingX, spacingY));
        }
        if (x - 1 >= 0 && y + 1 <= this.segmentsY) {
          addSpring(current, this.indexFor(x - 1, y + 1), Math.hypot(spacingX, spacingY));
        }
      }
    }
  }

  private indexFor(x: number, y: number): number {
    return y * (this.segmentsX + 1) + x;
  }

  private surfaceIndices(): number[] {
    const indices: number[] = [];

    for (let y = 0; y < this.segmentsY; y += 1) {
      for (let x = 0; x < this.segmentsX; x += 1) {
        const a = this.indexFor(x, y);
        const b = this.indexFor(x + 1, y);
        const c = this.indexFor(x, y + 1);
        const d = this.indexFor(x + 1, y + 1);
        indices.push(a, c, b, b, c, d);
      }
    }

    return indices;
  }
}
