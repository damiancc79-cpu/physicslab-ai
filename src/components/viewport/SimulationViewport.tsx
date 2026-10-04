import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PerformanceMonitor } from '../../performance/PerformanceMonitor';
import type { RendererMode } from '../../performance/types';
import { createManagedRenderer, type ManagedRenderer } from '../../rendering/three/RendererManager';
import { SimulationScenePresenter } from '../../rendering/three/SimulationScenePresenter';
import { SimulationWorld } from '../../simulation/core/SimulationWorld';
import type { PresetId, SimulationParameters } from '../../simulation/core/types';
import { useLabStore } from '../../state/useLabStore';

export const SimulationViewport = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const managedRendererRef = useRef<ManagedRenderer | null>(null);
  const worldRef = useRef<SimulationWorld | null>(null);
  const screenshotRef = useRef<() => void>(() => undefined);
  const stepRequestsRef = useRef(0);
  const activePresetId = useLabStore((state) => state.activePresetId);
  const parameters = useLabStore((state) => state.parameters);
  const isPaused = useLabStore((state) => state.isPaused);
  const debugEnabled = useLabStore((state) => state.debugEnabled);
  const showParticles = useLabStore((state) => state.showParticles);
  const showSprings = useLabStore((state) => state.showSprings);
  const showTrails = useLabStore((state) => state.showTrails);
  const surfaceMode = useLabStore((state) => state.surfaceMode);
  const resetNonce = useLabStore((state) => state.resetNonce);
  const stepNonce = useLabStore((state) => state.stepNonce);
  const screenshotNonce = useLabStore((state) => state.screenshotNonce);
  const setMetrics = useLabStore((state) => state.setMetrics);
  const [rendererMode, setRendererMode] = useState<RendererMode>('WebGL fallback');
  const [fallbackReason, setFallbackReason] = useState<string>('');

  const activePresetRef = useRef<PresetId>(activePresetId);
  const parametersRef = useRef<SimulationParameters>(parameters);
  const isPausedRef = useRef(isPaused);
  const optionsRef = useRef({ debugEnabled, showParticles, showSprings, showTrails, surfaceMode });

  useEffect(() => {
    activePresetRef.current = activePresetId;
  }, [activePresetId]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    optionsRef.current = { debugEnabled, showParticles, showSprings, showTrails, surfaceMode };
  }, [debugEnabled, showParticles, showSprings, showTrails, surfaceMode]);

  useEffect(() => {
    worldRef.current?.setPreset(activePresetId, parametersRef.current);
  }, [activePresetId]);

  useEffect(() => {
    if (resetNonce > 0) worldRef.current?.reset(parametersRef.current);
  }, [resetNonce]);

  useEffect(() => {
    if (stepNonce > 0) stepRequestsRef.current += 1;
  }, [stepNonce]);

  useEffect(() => {
    if (screenshotNonce > 0) screenshotRef.current();
  }, [screenshotNonce]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let frameId = 0;
    let resizeFrameId = 0;
    let lastViewportWidth = 0;
    let lastViewportHeight = 0;
    let lastTime = performance.now();
    let lastMetricPublish = 0;
    let accumulator = 0;
    const fixedStepSeconds = 1 / 90;
    const maxSubSteps = 4;
    const monitor = new PerformanceMonitor();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090d');
    scene.fog = new THREE.Fog('#07090d', 12, 24);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 100);
    camera.position.set(6.2, 5.1, 7.4);

    const ambient = new THREE.HemisphereLight('#e0f2fe', '#111827', 1.25);
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -4;
    const rim = new THREE.DirectionalLight('#f0abfc', 0.8);
    rim.position.set(-6, 3, -4);
    scene.add(ambient, key, rim);

    const grid = new THREE.GridHelper(12, 24, '#526071', '#202734');
    grid.name = 'reference-grid';
    grid.position.y = 0.002;
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({
        color: '#0b111a',
        roughness: 0.82,
        metalness: 0.08,
        transparent: true,
        opacity: 0.82,
      }),
    );
    floor.name = 'matte-reference-floor';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const axes = new THREE.AxesHelper(2.2);
    axes.name = 'axis-helper';
    scene.add(axes);

    const presenter = new SimulationScenePresenter(scene);
    const world = new SimulationWorld(activePresetRef.current, parametersRef.current);
    worldRef.current = world;

    let controls: OrbitControls | undefined;

    const resize = () => {
      resizeFrameId = 0;
      const renderer = managedRendererRef.current?.renderer;
      if (!renderer) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (width === lastViewportWidth && height === lastViewportHeight) return;

      lastViewportWidth = width;
      lastViewportHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const scheduleResize = () => {
      if (resizeFrameId === 0) resizeFrameId = requestAnimationFrame(resize);
    };

    const observer = new ResizeObserver(scheduleResize);
    observer.observe(host);

    const start = async () => {
      const managedRenderer = await createManagedRenderer();
      if (disposed) {
        managedRenderer.renderer.dispose();
        return;
      }

      managedRendererRef.current = managedRenderer;
      setRendererMode(managedRenderer.mode);
      setFallbackReason(managedRenderer.fallbackReason ?? '');
      managedRenderer.renderer.domElement.className = 'simulation-canvas';
      host.appendChild(managedRenderer.renderer.domElement);
      controls = new OrbitControls(camera, managedRenderer.renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 2.2, 0);
      controls.maxDistance = 20;
      controls.minDistance = 2.6;
      scheduleResize();

      screenshotRef.current = () => {
        const link = document.createElement('a');
        link.download = `physicslab-ai-${activePresetRef.current}.png`;
        link.href = managedRenderer.renderer.domElement.toDataURL('image/png');
        link.click();
      };

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        const frameStart = performance.now();
        const rawDeltaMs = frameStart - lastTime;
        const delta = Math.min(rawDeltaMs / 1000, 1 / 12);
        lastTime = frameStart;

        controls?.update();

        const simStart = performance.now();
        if (stepRequestsRef.current > 0) {
          world.step(1 / 60, parametersRef.current);
          if (stepRequestsRef.current > 0) stepRequestsRef.current -= 1;
        } else if (!isPausedRef.current) {
          accumulator = Math.min(accumulator + delta, fixedStepSeconds * maxSubSteps);
          let subSteps = 0;
          while (accumulator >= fixedStepSeconds && subSteps < maxSubSteps) {
            world.step(fixedStepSeconds, parametersRef.current);
            accumulator -= fixedStepSeconds;
            subSteps += 1;
          }
        } else {
          accumulator = 0;
        }
        const simEnd = performance.now();

        presenter.sync(world.getSnapshot(parametersRef.current), optionsRef.current);

        const renderStart = performance.now();
        managedRenderer.renderer.render(scene, camera);
        const renderEnd = performance.now();

        if (renderEnd - lastMetricPublish > 250) {
          lastMetricPublish = renderEnd;
          const metrics = monitor.recordFrame({
            frameTimeMs: rawDeltaMs,
            simulationTimeMs: simEnd - simStart,
            renderTimeMs: renderEnd - renderStart,
            objectCount: world.getObjectCount(),
            rendererMode: managedRenderer.mode,
          });
          setMetrics(metrics, monitor.analyze(activePresetRef.current, parametersRef.current, metrics));
        }
      };

      animate();
    };

    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(resizeFrameId);
      observer.disconnect();
      presenter.dispose();
      controls?.dispose();
      managedRendererRef.current?.renderer.dispose();
      managedRendererRef.current?.renderer.domElement.remove();
      managedRendererRef.current = null;
      worldRef.current = null;
    };
  }, [setMetrics]);

  return (
    <section className="viewport-shell" aria-label="3D simulation viewport">
      <div ref={hostRef} className="viewport-host" />
      <div className="viewport-badge">
        <span>{rendererMode}</span>
        {rendererMode !== 'WebGPU' && <small>{fallbackReason || 'Fallback renderer active'}</small>}
      </div>
      <div className="viewport-title">
        <strong>PhysicsLab AI</strong>
        <span>real-time simulation sandbox</span>
      </div>
    </section>
  );
};
