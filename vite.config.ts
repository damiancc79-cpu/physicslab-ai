import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: [
      'three',
      'three/examples/jsm/capabilities/WebGPU.js',
      'three/examples/jsm/renderers/webgpu/WebGPURenderer.js',
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    globals: true,
    setupFiles: './src/tests/setup.ts',
  },
});
