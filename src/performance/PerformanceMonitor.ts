import type { PresetId, SimulationParameters } from '../simulation/core/types';
import type { PerformanceInsight, PerformanceMetrics, RendererMode } from './types';

const emptyMetrics: PerformanceMetrics = {
  fps: 0,
  averageFps: 0,
  frameTimeMs: 0,
  simulationTimeMs: 0,
  renderTimeMs: 0,
  objectCount: 0,
  rendererMode: 'WebGL fallback',
  spikeCount: 0,
};

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private spikeCount = 0;
  private latest: PerformanceMetrics = emptyMetrics;

  recordFrame(input: {
    frameTimeMs: number;
    simulationTimeMs: number;
    renderTimeMs: number;
    objectCount: number;
    rendererMode: RendererMode;
  }): PerformanceMetrics {
    this.frameTimes.push(input.frameTimeMs);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    if (input.frameTimeMs > 38) this.spikeCount += 1;

    const averageFrameTime =
      this.frameTimes.reduce((total, value) => total + value, 0) / Math.max(1, this.frameTimes.length);

    this.latest = {
      fps: input.frameTimeMs > 0 ? 1000 / input.frameTimeMs : 0,
      averageFps: averageFrameTime > 0 ? 1000 / averageFrameTime : 0,
      frameTimeMs: input.frameTimeMs,
      simulationTimeMs: input.simulationTimeMs,
      renderTimeMs: input.renderTimeMs,
      objectCount: input.objectCount,
      rendererMode: input.rendererMode,
      spikeCount: this.spikeCount,
    };

    return this.latest;
  }

  getLatest(): PerformanceMetrics {
    return this.latest;
  }

  analyze(
    presetId: PresetId,
    parameters: SimulationParameters,
    metrics: PerformanceMetrics = this.latest,
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    if (metrics.averageFps > 0 && metrics.averageFps < 45) {
      insights.push({
        id: 'low-fps',
        severity: metrics.averageFps < 28 ? 'critical' : 'warning',
        title: 'Frame rate pressure',
        recommendation: 'Lower particle or body count and disable debug rendering before raising timestep.',
      });
    }

    if (metrics.simulationTimeMs > 10) {
      insights.push({
        id: 'sim-step-cost',
        severity: metrics.simulationTimeMs > 18 ? 'critical' : 'warning',
        title: 'Simulation step is expensive',
        recommendation: 'Reduce solver passes, fluid particles, or trail length to keep interaction responsive.',
      });
    }

    if (presetId === 'particle-fluid' && (parameters.particleCount ?? 0) > 280) {
      insights.push({
        id: 'fluid-count',
        severity: 'warning',
        title: 'Dense fluid field',
        recommendation: 'Particle fluid uses local neighbor cells, not full SPH; keep counts under 280 for laptops.',
      });
    }

    if (presetId === 'gravity-sandbox' && (parameters.trailLength ?? 0) > 70) {
      insights.push({
        id: 'trail-memory',
        severity: 'info',
        title: 'Long trail buffers',
        recommendation: 'Shorter trails reduce geometry upload work and make orbital structure easier to read.',
      });
    }

    if (metrics.rendererMode === 'WebGL fallback') {
      insights.push({
        id: 'webgl-fallback',
        severity: 'info',
        title: 'WebGPU unavailable',
        recommendation: 'The renderer is running through WebGL fallback; compute acceleration is reserved for future builds.',
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: 'healthy',
        severity: 'info',
        title: 'Performance stable',
        recommendation: 'Current settings look balanced for interactive exploration.',
      });
    }

    return insights;
  }
}

export const performanceMonitor = new PerformanceMonitor();
