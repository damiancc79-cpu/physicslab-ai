import * as THREE from 'three';
import type { SurfaceMode } from '../types';
import type { SimulationSnapshot } from '../../simulation/core/types';

interface PresenterOptions {
  showParticles: boolean;
  showSprings: boolean;
  showTrails: boolean;
  debugEnabled: boolean;
  surfaceMode: SurfaceMode;
}

const identityQuaternion = new THREE.Quaternion();

export class SimulationScenePresenter {
  private readonly root = new THREE.Group();
  private particleMesh?: THREE.InstancedMesh;
  private attractorMesh?: THREE.InstancedMesh;
  private attractorHalo?: THREE.Mesh;
  private springSegments?: THREE.LineSegments;
  private trailSegments?: THREE.LineSegments;
  private boundsHelper?: THREE.LineSegments;
  private surfaceMesh?: THREE.Mesh;
  private surfaceId?: string;
  private particleMatrix = new THREE.Matrix4();
  private particleColor = new THREE.Color();
  private particlePosition = new THREE.Vector3();
  private particleScale = new THREE.Vector3();
  private particleCapacity = 0;
  private attractorCapacity = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'simulation-presenter';
    scene.add(this.root);
  }

  sync(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    this.syncParticles(snapshot, options);
    this.syncSprings(snapshot, options);
    this.syncAttractors(snapshot, options);
    this.syncTrails(snapshot, options);
    this.syncSurfaces(snapshot, options);
    this.syncBounds(snapshot, options.debugEnabled);
  }

  dispose(): void {
    this.root.traverse((child) => {
      if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) {
        child.geometry.dispose();
      }
      if ('material' in child) {
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else if (material instanceof THREE.Material) {
          material.dispose();
        }
      }
    });
    this.root.removeFromParent();
  }

  private syncParticles(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    const showDebugParticles =
      options.surfaceMode !== 'shaded' || !this.hasRenderableSurface(snapshot);
    if (!options.showParticles || !showDebugParticles) {
      if (this.particleMesh) this.particleMesh.visible = false;
      return;
    }

    if (!this.particleMesh || this.particleCapacity !== snapshot.particles.length) {
      if (this.particleMesh) this.root.remove(this.particleMesh);
      const geometry = new THREE.SphereGeometry(1, 16, 10);
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.38,
        metalness: 0.16,
        emissive: '#041015',
        emissiveIntensity: 0.12,
        vertexColors: true,
      });
      this.particleCapacity = snapshot.particles.length;
      this.particleMesh = new THREE.InstancedMesh(geometry, material, this.particleCapacity);
      this.particleMesh.name = 'simulation-particles';
      this.particleMesh.castShadow = true;
      this.particleMesh.receiveShadow = true;
      this.root.add(this.particleMesh);
    }

    for (let index = 0; index < snapshot.particles.length; index += 1) {
      const particle = snapshot.particles[index];
      this.particlePosition.set(particle.position.x, particle.position.y, particle.position.z);
      this.particleScale.setScalar(particle.radius);
      this.particleMatrix.compose(
        this.particlePosition,
        identityQuaternion,
        this.particleScale,
      );
      this.particleMesh.setMatrixAt(index, this.particleMatrix);
      this.particleMesh.setColorAt(index, this.particleColor.set(particle.color));
    }

    this.particleMesh.visible = true;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  private syncSprings(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    const showDebugSprings =
      options.surfaceMode !== 'shaded' || !this.hasRenderableSurface(snapshot);
    const visible =
      showDebugSprings &&
      options.debugEnabled &&
      options.showSprings &&
      snapshot.springs.length > 0;
    if (!visible) {
      if (this.springSegments) this.springSegments.visible = false;
      return;
    }

    const positions = new Float32Array(snapshot.springs.length * 6);
    snapshot.springs.forEach((spring, index) => {
      const offset = index * 6;
      positions[offset] = spring.a.x;
      positions[offset + 1] = spring.a.y;
      positions[offset + 2] = spring.a.z;
      positions[offset + 3] = spring.b.x;
      positions[offset + 4] = spring.b.y;
      positions[offset + 5] = spring.b.z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    if (!this.springSegments) {
      this.springSegments = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.42 }),
      );
      this.springSegments.name = 'spring-debug-lines';
      this.root.add(this.springSegments);
    } else {
      this.springSegments.geometry.dispose();
      this.springSegments.geometry = geometry;
      this.springSegments.visible = true;
    }
  }

  private syncAttractors(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    if (!options.debugEnabled || snapshot.attractors.length === 0) {
      if (this.attractorMesh) this.attractorMesh.visible = false;
      if (this.attractorHalo) this.attractorHalo.visible = false;
      return;
    }

    if (!this.attractorMesh || this.attractorCapacity !== snapshot.attractors.length) {
      if (this.attractorMesh) this.root.remove(this.attractorMesh);
      this.attractorCapacity = snapshot.attractors.length;
      this.attractorMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.22, 2),
        new THREE.MeshStandardMaterial({
          color: '#f472b6',
          emissive: '#701a75',
          emissiveIntensity: 0.42,
          roughness: 0.35,
        }),
        this.attractorCapacity,
      );
      this.attractorMesh.name = 'gravity-attractors';
      this.attractorMesh.castShadow = true;
      this.root.add(this.attractorMesh);
    }

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    snapshot.attractors.forEach((attractor, index) => {
      const radius = 0.28 + attractor.strength * 0.08;
      matrix.compose(
        new THREE.Vector3(attractor.position.x, attractor.position.y, attractor.position.z),
        identityQuaternion,
        new THREE.Vector3(radius, radius, radius),
      );
      this.attractorMesh?.setMatrixAt(index, matrix);
      this.attractorMesh?.setColorAt(index, color.set(attractor.color ?? '#f472b6'));
    });

    this.attractorMesh.visible = true;
    this.attractorMesh.instanceMatrix.needsUpdate = true;
    if (this.attractorMesh.instanceColor) this.attractorMesh.instanceColor.needsUpdate = true;
    this.syncAttractorHalo(snapshot, options);
  }

  private syncTrails(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    const visible = options.showTrails && snapshot.trails.some((trail) => trail.length > 1);
    if (!visible) {
      if (this.trailSegments) this.trailSegments.visible = false;
      return;
    }

    const points: number[] = [];
    for (const trail of snapshot.trails) {
      for (let index = 1; index < trail.length; index += 1) {
        const a = trail[index - 1];
        const b = trail[index];
        points.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

    if (!this.trailSegments) {
      this.trailSegments = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: '#f0abfc', transparent: true, opacity: 0.3 }),
      );
      this.trailSegments.name = 'orbital-trails';
      this.root.add(this.trailSegments);
    } else {
      this.trailSegments.geometry.dispose();
      this.trailSegments.geometry = geometry;
      this.trailSegments.visible = true;
    }
  }

  private syncBounds(snapshot: SimulationSnapshot, visible: boolean): void {
    if (!visible) {
      if (this.boundsHelper) this.boundsHelper.visible = false;
      return;
    }

    if (!this.boundsHelper) {
      const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const material = new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.34 });
      this.boundsHelper = new THREE.LineSegments(geometry, material);
      this.boundsHelper.name = 'simulation-bounds';
      this.root.add(this.boundsHelper);
    }

    const half = snapshot.bounds;
    this.boundsHelper.position.set(0, half, 0);
    this.boundsHelper.scale.set(half * 2, half * 2, half * 2);
    this.boundsHelper.visible = true;
  }

  private syncSurfaces(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    const surface = snapshot.surfaces?.[0];
    const visible = options.surfaceMode !== 'debug' && Boolean(surface);
    if (!visible || !surface) {
      if (this.surfaceMesh) this.surfaceMesh.visible = false;
      return;
    }

    const needsNewMesh =
      !this.surfaceMesh ||
      this.surfaceId !== surface.id ||
      this.surfaceMesh.geometry.getAttribute('position').count !== surface.vertices.length;

    if (needsNewMesh) {
      if (this.surfaceMesh) this.root.remove(this.surfaceMesh);
      const geometry = new THREE.BufferGeometry();
      geometry.setIndex(surface.indices);
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(new Float32Array(surface.vertices.length * 3), 3),
      );
      const material = new THREE.MeshStandardMaterial({
        color: surface.color,
        roughness: 0.56,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      });
      this.surfaceMesh = new THREE.Mesh(geometry, material);
      this.surfaceMesh.name = surface.id;
      this.surfaceMesh.castShadow = true;
      this.surfaceMesh.receiveShadow = true;
      this.surfaceId = surface.id;
      this.root.add(this.surfaceMesh);
    }

    const mesh = this.surfaceMesh;
    if (!mesh) return;

    const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < surface.vertices.length; index += 1) {
      const vertex = surface.vertices[index];
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.visible = true;
  }

  private hasRenderableSurface(snapshot: SimulationSnapshot): boolean {
    return Boolean(snapshot.surfaces?.some((surface) => surface.vertices.length > 2 && surface.indices.length > 2));
  }

  private syncAttractorHalo(snapshot: SimulationSnapshot, options: PresenterOptions): void {
    const visible = options.debugEnabled && snapshot.kind === 'gravity' && snapshot.attractors.length > 0;
    if (!visible) {
      if (this.attractorHalo) this.attractorHalo.visible = false;
      return;
    }

    if (!this.attractorHalo) {
      this.attractorHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.006, 8, 96),
        new THREE.MeshBasicMaterial({
          color: '#f0abfc',
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        }),
      );
      this.attractorHalo.name = 'gravity-field-ring';
      this.attractorHalo.rotation.x = Math.PI / 2;
      this.root.add(this.attractorHalo);
    }

    this.attractorHalo.position.set(0, 2.15, 0);
    this.attractorHalo.scale.setScalar(Math.max(1.5, snapshot.bounds * 0.52));
    this.attractorHalo.visible = true;
  }
}
