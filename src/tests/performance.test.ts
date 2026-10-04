import { describe, expect, it } from 'vitest';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('detects expensive fluid presets and low FPS', () => {
    const monitor = new PerformanceMonitor();
    const metrics = monitor.recordFrame({
      frameTimeMs: 42,
      simulationTimeMs: 15,
      renderTimeMs: 11,
      objectCount: 360,
      rendererMode: 'WebGL',
    });
    const insights = monitor.analyze('particle-fluid', { particleCount: 360 }, metrics);

    expect(insights.some((insight) => insight.id === 'low-fps')).toBe(true);
    expect(insights.some((insight) => insight.id === 'fluid-count')).toBe(true);
    expect(insights.find((insight) => insight.id === 'fluid-count')?.recommendation).toContain(
      'neighbor cells',
    );
  });

  it('reports a healthy state when costs are low', () => {
    const monitor = new PerformanceMonitor();
    const metrics = monitor.recordFrame({
      frameTimeMs: 12,
      simulationTimeMs: 2,
      renderTimeMs: 3,
      objectCount: 80,
      rendererMode: 'WebGL',
    });
    const insights = monitor.analyze('soft-body-cube', { resolution: 3 }, metrics);

    expect(insights[0].id).toBe('healthy');
  });
});
