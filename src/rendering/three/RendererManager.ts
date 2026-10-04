import * as THREE from 'three';
import type { RendererMode } from '../../performance/types';
import { getWebGpuCapability } from '../webgpu/capabilities';

export interface RendererLike {
  domElement: HTMLCanvasElement;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

export interface ManagedRenderer {
  renderer: RendererLike;
  mode: RendererMode;
  fallbackReason?: string;
}

export const createManagedRenderer = async (): Promise<ManagedRenderer> => {
  const capability = getWebGpuCapability();

  if (capability.supported) {
    try {
      const { default: WebGPURenderer } = await import(
        'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
      );
      const renderer = new WebGPURenderer({ antialias: true, alpha: true });
      await renderer.init();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      return { renderer, mode: 'WebGPU' };
    } catch (error) {
      return createWebGlRenderer(
        `WebGPU initialization failed, so WebGL fallback is active. ${String(error)}`,
      );
    }
  }

  return createWebGlRenderer(capability.message);
};

const createWebGlRenderer = (fallbackReason: string): ManagedRenderer => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  return {
    renderer,
    mode: navigator.gpu ? 'WebGL' : 'WebGL fallback',
    fallbackReason,
  };
};
