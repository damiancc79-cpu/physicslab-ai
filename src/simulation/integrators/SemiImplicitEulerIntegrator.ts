import type { SimParticle } from '../core/types';

export class SemiImplicitEulerIntegrator {
  integrate(particles: SimParticle[], deltaSeconds: number): void {
    for (const particle of particles) {
      const invMass = particle.mass > 0 ? 1 / particle.mass : 0;
      particle.velocity.x += particle.force.x * invMass * deltaSeconds;
      particle.velocity.y += particle.force.y * invMass * deltaSeconds;
      particle.velocity.z += particle.force.z * invMass * deltaSeconds;

      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;
      particle.position.z += particle.velocity.z * deltaSeconds;

      particle.force.x = 0;
      particle.force.y = 0;
      particle.force.z = 0;
    }
  }
}
