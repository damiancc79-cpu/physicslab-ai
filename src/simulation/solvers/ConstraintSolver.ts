import type { SimParticle } from '../core/types';
import { subtract, length } from '../core/vector';

export interface SpringConstraint {
  id: string;
  a: number;
  b: number;
  restLength: number;
}

export class ConstraintSolver {
  applySprings(
    particles: SimParticle[],
    springs: SpringConstraint[],
    stiffness: number,
    damping: number,
  ): void {
    for (const spring of springs) {
      const a = particles[spring.a];
      const b = particles[spring.b];
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

      a.force.x += force * direction.x;
      a.force.y += force * direction.y;
      a.force.z += force * direction.z;
      b.force.x -= force * direction.x;
      b.force.y -= force * direction.y;
      b.force.z -= force * direction.z;
    }
  }
}
