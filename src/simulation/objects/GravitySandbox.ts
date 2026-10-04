import type {
  RenderAttractor,
  SimParticle,
  SimulationObject,
  SimulationParameters,
  SimulationSnapshot,
} from '../core/types';
import { clampMagnitude, cloneVec3, length, subtract, vec3 } from '../core/vector';
import { SemiImplicitEulerIntegrator } from '../integrators/SemiImplicitEulerIntegrator';
import { randomBetween } from '../../utils/random';

const attractorPalette = ['#f472b6', '#facc15', '#a78bfa'];

export class GravitySandbox implements SimulationObject {
  readonly kind = 'gravity' as const;
  private bodies: SimParticle[] = [];
  private attractors: RenderAttractor[] = [];
  private bodyCount = 0;
  private attractorCount = 0;
  private elapsedTime = 0;
  private readonly integrator = new SemiImplicitEulerIntegrator();

  reset(parameters: SimulationParameters): void {
    this.bodyCount = Math.round(parameters.bodyCount ?? 96);
    this.attractorCount = Math.round(parameters.attractorCount ?? 2);
    this.elapsedTime = 0;
    const spawnRadius = parameters.spawnRadius ?? 4.2;
    this.attractors = this.createAttractors(parameters);
    this.bodies = Array.from({ length: this.bodyCount }, (_, index) => {
      const angle = (index / this.bodyCount) * Math.PI * 2 + randomBetween(-0.25, 0.25);
      const radius = randomBetween(spawnRadius * 0.35, spawnRadius);
      const y = randomBetween(0.8, 3.7);
      const speed = randomBetween(0.55, 1.7);

      return {
        id: `body-${index}`,
        position: vec3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
        previousPosition: vec3(),
        velocity: vec3(-Math.sin(angle) * speed, randomBetween(-0.15, 0.15), Math.cos(angle) * speed),
        force: vec3(),
        mass: randomBetween(0.5, 1.6),
        radius: randomBetween(0.035, 0.075),
        color: index % 4 === 0 ? '#f8fafc' : index % 4 === 1 ? '#93c5fd' : index % 4 === 2 ? '#f0abfc' : '#fde68a',
        trail: [],
      };
    });
  }

  step(deltaSeconds: number, parameters: SimulationParameters): void {
    const nextBodyCount = Math.round(parameters.bodyCount ?? this.bodyCount);
    const nextAttractorCount = Math.round(parameters.attractorCount ?? this.attractorCount);
    if (nextBodyCount !== this.bodyCount || nextAttractorCount !== this.attractorCount) {
      this.reset(parameters);
      return;
    }

    const strength = parameters.attractorStrength ?? 54;
    const damping = parameters.damping ?? 0.992;
    const delta = Math.min(deltaSeconds, 1 / 30) * (parameters.timestep ?? 1);
    const trailLength = Math.round(parameters.trailLength ?? 44);
    this.elapsedTime += delta;
    this.attractors = this.createAttractors(parameters);

    for (const body of this.bodies) {
      body.previousPosition = cloneVec3(body.position);
      body.force.x = 0;
      body.force.y = 0;
      body.force.z = 0;

      for (const attractor of this.attractors) {
        const offset = subtract(attractor.position, body.position);
        const distance = Math.max(0.28, length(offset));
        const force = (strength * attractor.strength * body.mass) / (distance * distance + 0.8);
        body.force.x += (offset.x / distance) * force;
        body.force.y += (offset.y / distance) * force;
        body.force.z += (offset.z / distance) * force;
      }
    }

    this.integrator.integrate(this.bodies, delta);

    for (const body of this.bodies) {
      body.velocity.x *= damping;
      body.velocity.y *= damping;
      body.velocity.z *= damping;
      clampMagnitude(body.velocity, 11);

      const distanceFromOrigin = length(body.position);
      if (distanceFromOrigin > 10) {
        body.position.x *= 0.55;
        body.position.y = randomBetween(1, 3.5);
        body.position.z *= 0.55;
        body.velocity.x *= -0.35;
        body.velocity.y *= -0.1;
        body.velocity.z *= -0.35;
      }

      if (trailLength > 0) {
        body.trail = body.trail ?? [];
        body.trail.push(cloneVec3(body.position));
        while (body.trail.length > trailLength) body.trail.shift();
      } else {
        body.trail = [];
      }
    }
  }

  getSnapshot(): SimulationSnapshot {
    return {
      kind: this.kind,
      bounds: 7,
      particles: this.bodies.map((body) => ({
        id: body.id,
        position: body.position,
        radius: body.radius,
        color: body.color,
      })),
      springs: [],
      attractors: this.attractors,
      trails: this.bodies.map((body) => body.trail ?? []),
    };
  }

  getObjectCount(): number {
    return this.bodies.length + this.attractors.length;
  }

  private createAttractors(parameters: SimulationParameters): RenderAttractor[] {
    const drift = Math.min(0.55, (parameters.attractorStrength ?? 54) / 220);
    const positions = [
      vec3(Math.sin(this.elapsedTime * 0.22) * drift, 2.1, Math.cos(this.elapsedTime * 0.18) * drift),
      vec3(
        2.25 + Math.sin(this.elapsedTime * 0.31) * drift,
        2.8 + Math.cos(this.elapsedTime * 0.2) * drift * 0.45,
        -1.65 + Math.cos(this.elapsedTime * 0.27) * drift,
      ),
      vec3(
        -2.4 + Math.cos(this.elapsedTime * 0.25) * drift,
        1.55 + Math.sin(this.elapsedTime * 0.23) * drift * 0.5,
        1.9 + Math.sin(this.elapsedTime * 0.29) * drift,
      ),
    ];

    return positions.slice(0, this.attractorCount || Math.round(parameters.attractorCount ?? 2)).map(
      (position, index) => ({
        id: `attractor-${index}`,
        position,
        strength: index === 0 ? 1 : 0.68 + index * 0.22,
        color: attractorPalette[index] ?? '#f472b6',
      }),
    );
  }
}
