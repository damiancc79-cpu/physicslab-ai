/// <reference types="vite/client" />

interface Navigator {
  gpu?: unknown;
}

declare module 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js' {
  import type { Camera, Scene, WebGLRendererParameters } from 'three';

  export default class WebGPURenderer {
    domElement: HTMLCanvasElement;
    constructor(parameters?: WebGLRendererParameters);
    init(): Promise<void>;
    setAnimationLoop(callback: XRFrameRequestCallback | null): void;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
}
