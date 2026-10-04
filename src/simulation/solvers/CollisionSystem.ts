import type { SimParticle } from '../core/types';

export class CollisionSystem {
  resolveBox(particles: SimParticle[], halfExtent: number, restitution = 0.42): void {
    for (const particle of particles) {
      this.resolveAxis(particle, 'x', -halfExtent, halfExtent, restitution);
      this.resolveAxis(particle, 'y', 0, halfExtent * 2, restitution);
      this.resolveAxis(particle, 'z', -halfExtent, halfExtent, restitution);
    }
  }

  private resolveAxis(
    particle: SimParticle,
    axis: 'x' | 'y' | 'z',
    min: number,
    max: number,
    restitution: number,
  ): void {
    const radius = particle.radius;
    if (particle.position[axis] < min + radius) {
      particle.position[axis] = min + radius;
      particle.velocity[axis] = Math.abs(particle.velocity[axis]) * restitution;
    }

    if (particle.position[axis] > max - radius) {
      particle.position[axis] = max - radius;
      particle.velocity[axis] = -Math.abs(particle.velocity[axis]) * restitution;
    }
  }
}
