import type { AssistantCommand, AssistantResponse } from '../commands/types';
import { diffParameters, diffScenePreset } from '../commands/parameterDiff';
import {
  analyzeSceneStability,
  explainStabilityWarnings,
  getStabilityParameterChanges,
} from '../stability/StabilityAnalyzer';
import { inferOptimizationMode, performanceOptimizer } from '../optimization/PerformanceOptimizer';
import { localSceneGenerator } from '../sceneGeneration/LocalSceneGenerator';
import type { PresetId, SimulationParameters } from '../../simulation/core/types';
import { presetLoader } from '../../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../../simulation/presets/presets';
import type { AssistantProvider } from './AssistantProvider';

export class LocalRuleBasedAssistant implements AssistantProvider {
  readonly id = 'local-rule-based';
  readonly label = 'Local Rule-Based Assistant';

  async execute(command: AssistantCommand): Promise<AssistantResponse> {
    const text = command.text.toLowerCase();
    const wantsPresetJson = this.matches(text, ['json', 'preset file', 'complete preset', 'generate preset']);
    const benchmarkResults = command.benchmarkResults ?? [];
    const warnings: string[] = [];
    let presetId: PresetId | undefined;
    let changes: SimulationParameters = {};
    let explanation = 'I tuned the current scene using the local deterministic assistant rules.';

    if (this.wantsSceneGeneration(text)) {
      const generated = localSceneGenerator.generate({
        text: command.text,
        currentPresetId: command.presetId,
        currentDebug: command.debug,
        currentRendering: command.rendering,
        currentPerformance: command.performance,
      });

      if (generated) {
        return {
          action: 'scene-generation',
          explanation: generated.explanation,
          presetId: generated.scene.presetId,
          parameterChanges: generated.scene.parameters,
          scenePreset: generated.scene,
          parameterDiff: diffScenePreset(
            generated.scene,
            command.parameters,
            command.debug,
            command.rendering,
            command.performance,
            'Generated from natural-language scene request.',
          ),
          warnings: generated.warnings,
          generatedPreset: {
            name: generated.scene.presetName,
            presetId: generated.scene.presetId,
            parameters: generated.scene.parameters,
          },
        };
      }
    }

    if (
      benchmarkResults.length > 0 &&
      this.matches(text, ['benchmark', 'performance summary', 'which scene', 'fastest', 'slowest'])
    ) {
      const fastest = benchmarkResults.reduce((best, result) =>
        result.averageFps > best.averageFps ? result : best,
      );
      const slowest = benchmarkResults.reduce((worst, result) =>
        result.averageFps < worst.averageFps ? result : worst,
      );
      const baselineNote =
        typeof slowest.fpsDelta === 'number' && typeof slowest.fpsDeltaPercent === 'number'
          ? ` Compared with ${command.benchmarkBaselineLabel ?? 'the saved baseline'}, ${
              slowest.presetName
            } is ${
              slowest.fpsDelta >= 0 ? 'up' : 'down'
            } ${Math.abs(slowest.fpsDelta).toFixed(1)} FPS (${Math.abs(slowest.fpsDeltaPercent).toFixed(
              1,
            )}%).`
          : '';
      return {
        explanation: `Latest benchmark: ${fastest.presetName} is fastest at ${fastest.averageFps.toFixed(
          1,
        )} FPS, while ${slowest.presetName} is slowest at ${slowest.averageFps.toFixed(
          1,
        )} FPS. The slowest scene averaged ${slowest.averageSimulationTimeMs.toFixed(
          2,
        )} ms of simulation time across ${slowest.frames} frames.${baselineNote}`,
        parameterChanges: {},
        warnings:
          slowest.averageFps < 45
            ? [`${slowest.presetName} is below the interactive target; reduce object count or solver passes.`]
            : [],
      };
    }

    if (
      this.matches(text, [
        'compare',
        'stable range',
        'known stable',
        'why unstable',
        'explain instability',
        'explain the jitter',
        'why is performance bad',
      ])
    ) {
      const stabilityWarnings = analyzeSceneStability({
        presetId: command.presetId,
        parameters: command.parameters,
        debug: command.debug,
        rendering: command.rendering,
        metrics: command.metrics,
      });
      return {
        action: 'explain',
        explanation: explainStabilityWarnings(stabilityWarnings),
        parameterChanges: {},
        warnings: stabilityWarnings.map((warning) => `${warning.severity}: ${warning.parameter} is ${warning.currentValue}.`),
      };
    }

    if (this.matches(text, ['optimize', '60 fps', 'run faster', 'gpu load', 'stable and smooth'])) {
      const result = performanceOptimizer.optimize({
        presetId: command.presetId,
        parameters: command.parameters,
        metrics: command.metrics,
        benchmarkResults,
        debug: command.debug,
        rendering: command.rendering,
        mode: inferOptimizationMode(text),
      });
      return {
        action: 'performance-optimization',
        explanation: result.report.summary,
        parameterChanges: result.parameterChanges,
        debugChanges: result.debugChanges,
        renderingChanges: result.renderingChanges,
        performanceChanges: {
          qualityPreset: result.qualityPreset,
          autoPerformanceEnabled: result.report.mode !== 'conservative',
        },
        parameterDiff: result.diff,
        optimizationReport: result.report,
        warnings: result.warnings,
      };
    }

    if (this.matches(text, ['jelly', 'squishy', 'soft', 'elastic'])) {
      presetId = 'soft-body-cube';
      changes = { stiffness: 18, damping: 0.18, gravity: 5.8, solverIterations: 3, resolution: 4 };
      explanation = 'I made the cube softer, lower-gravity, and more elastic so it reads as jelly-like.';
    }

    if (this.matches(text, ['bouncy', 'rubber', 'springy', 'bounce'])) {
      presetId = 'soft-body-cube';
      changes = { stiffness: 42, damping: 0.08, gravity: 7.2, solverIterations: 4, resolution: 4 };
      explanation = 'I tuned the soft body toward a springy rubber response with lower damping.';
    }

    if (this.matches(text, ['fluid heavier', 'heavier fluid', 'heavy water', 'denser'])) {
      presetId = 'particle-fluid';
      changes = { gravity: 13.2, viscosity: 0.72, cohesion: 3.8, repulsion: 13 };
      explanation = 'I increased gravity, cohesion, and viscosity so the fluid falls and clumps with more weight.';
    }

    if (this.matches(text, ['syrup', 'honey', 'thicker', 'more viscous', 'viscous'])) {
      presetId = 'particle-fluid';
      changes = { viscosity: 1.02, cohesion: 5.2, repulsion: 8.8, gravity: 6.8 };
      explanation = 'I made the fluid slower, thicker, and more cohesive for a syrup-like motion.';
    }

    if (this.matches(text, ['splash', 'splashy', 'spray', 'more fluid motion'])) {
      presetId = 'particle-fluid';
      changes = { viscosity: 0.16, cohesion: 1.3, repulsion: 16, gravity: 9.6, particleCount: 220 };
      explanation = 'I lowered viscosity and raised repulsion so the particles separate into a livelier splash.';
      warnings.push('Splashier fluid looks better with more particles, which can raise simulation cost.');
    }

    if (this.matches(text, ['cloth', 'flag', 'sheet', 'fabric', 'wind'])) {
      presetId = 'cloth-sheet';
      changes = {
        segmentsX: 18,
        segmentsY: 14,
        stiffness: text.includes('silk') ? 42 : 62,
        damping: text.includes('calm') ? 0.72 : 0.34,
        windStrength: text.includes('storm') || text.includes('windy') ? 10.8 : 6.4,
        windTurbulence: text.includes('storm') ? 2.8 : 1.5,
        solverIterations: 4,
        pinSpacing: text.includes('pinned') ? 1 : 2,
      };
      explanation = 'I generated a pinned cloth sheet with wind forces and stable solver passes.';
      if ((changes.windStrength ?? 0) > 10) {
        warnings.push('Strong wind can destabilize cloth unless damping and solver passes stay high.');
      }
    }

    if (this.matches(text, ['performance', 'faster', 'reduce cost', 'laggy', 'low fps'])) {
      changes = this.performanceChanges(command.presetId, command.parameters);
      explanation =
        'I reduced the highest-cost controls for this preset while trying to preserve the visual character.';
      if (command.metrics.averageFps > 0 && command.metrics.averageFps < 35) {
        warnings.push('Average FPS is already low; consider disabling debug overlays and reducing viewport size.');
      }
    }

    if (this.matches(text, ['chaotic orbital', 'chaotic orbit', 'chaos', 'orbit'])) {
      presetId = 'gravity-sandbox';
      changes = {
        bodyCount: 164,
        attractorStrength: 104,
        attractorCount: 3,
        timestep: 1.45,
        damping: 0.982,
        trailLength: 76,
        spawnRadius: 5.2,
      };
      explanation = 'I generated a three-attractor orbital scene with higher energy and longer trails.';
      warnings.push('This preset can increase render cost because long trails update every frame.');
    }

    if (this.matches(text, ['more particles', 'more bodies', 'higher detail', 'more detail', 'denser scene'])) {
      changes = this.detailChanges(presetId ?? command.presetId, command.parameters, 1);
      explanation = 'I increased the visual density while staying inside the preset validation limits.';
      warnings.push('Higher detail may lower FPS on integrated GPUs or older browsers.');
    }

    if (this.matches(text, ['fewer particles', 'fewer bodies', 'less detail', 'lighter scene'])) {
      changes = this.detailChanges(presetId ?? command.presetId, command.parameters, -1);
      explanation = 'I reduced visual density to make the scene lighter and easier to run.';
    }

    if (this.matches(text, ['stabilize', 'stable', 'calm', 'settle', 'make this stable'])) {
      changes = {
        ...this.stabilityChanges(command.presetId),
        ...getStabilityParameterChanges(command.presetId, command.parameters),
      };
      explanation = 'I damped the system and reduced aggressive timestep or force settings for stability.';
    }

    if (this.matches(text, ['slow motion', 'slow down', 'slower'])) {
      changes = this.slowMotionChanges(presetId ?? command.presetId);
      explanation = 'I slowed the motion while preserving the same preset character.';
    }

    if (this.matches(text, ['low gravity', 'moon', 'float'])) {
      presetId = text.includes('soft') || command.presetId === 'soft-body-cube' ? 'soft-body-cube' : command.presetId;
      changes = { gravity: 2.4 };
      if (presetId === 'soft-body-cube') {
        changes = { ...changes, stiffness: 24, damping: 0.22, solverIterations: 3 };
      }
      explanation = 'I lowered gravity and adjusted damping so the motion has a slow, floating feel.';
    }

    if (this.matches(text, ['soft body demo', 'elastic cube', 'gel cube'])) {
      presetId = 'soft-body-cube';
      changes = {
        resolution: 4,
        stiffness: 26,
        damping: 0.26,
        gravity: this.matches(text, ['low gravity', 'moon', 'float']) ? 2.4 : 4.6,
        solverIterations: 3,
      };
      explanation = 'I generated a clean soft-body cube preset with low gravity and readable spring motion.';
    }

    if (Object.keys(changes).length === 0) {
      if (wantsPresetJson) {
        const inferredPresetId = this.inferPresetFromText(text);
        if (inferredPresetId) presetId = inferredPresetId;
        explanation = `I generated a complete preset JSON for ${
          presetLoader.load(inferredPresetId ?? command.presetId).name
        }.`;
      } else {
        const firstInsight = command.insights[0];
        explanation = firstInsight
          ? `I did not find a direct command, but the current analyzer says: ${firstInsight.recommendation}`
          : 'Try commands like "make it more jelly-like", "generate a windy cloth preset JSON", or "reduce performance cost".';
      }
    }

    const targetPreset = presetLoader.load(presetId ?? command.presetId);
    const defaults = getDefaultParameters(targetPreset);
    const validatedParameters = presetLoader.validate(targetPreset, {
      ...defaults,
      ...(presetId ? {} : command.parameters),
      ...changes,
    });

    return {
      action: 'parameter-tune',
      explanation,
      presetId,
      parameterChanges: Object.fromEntries(
        Object.entries(changes).map(([key]) => [key, validatedParameters[key]]),
      ),
      parameterDiff: diffParameters(
        presetId ? getDefaultParameters(targetPreset) : command.parameters,
        validatedParameters,
        () => explanation,
      ).filter((change) => Object.prototype.hasOwnProperty.call(changes, change.parameter)),
      warnings,
      generatedPreset:
        wantsPresetJson || (presetId && text.includes('generate'))
          ? {
              name: `AI ${targetPreset.name}`,
              presetId: targetPreset.id,
              parameters: validatedParameters,
            }
          : undefined,
    };
  }

  private matches(text: string, needles: string[]): boolean {
    return needles.some((needle) => text.includes(needle));
  }

  private wantsSceneGeneration(text: string): boolean {
    return (
      (this.matches(text, ['create', 'generate', 'scene', 'demo']) &&
        this.matches(text, ['jelly', 'soft', 'fluid', 'gravity', 'orbit', 'cloth', 'flag', 'benchmark'])) ||
      this.matches(text, ['make a heavy fluid', 'make a stable high-performance', 'benchmark-friendly gravity'])
    );
  }

  private performanceChanges(presetId: PresetId, parameters: SimulationParameters): SimulationParameters {
    switch (presetId) {
      case 'soft-body-cube':
        return {
          resolution: Math.max(3, Math.round((parameters.resolution ?? 4) - 1)),
          solverIterations: Math.max(1, Math.round((parameters.solverIterations ?? 2) - 1)),
        };
      case 'particle-fluid':
        return {
          particleCount: Math.max(80, Math.round((parameters.particleCount ?? 180) * 0.68)),
          viscosity: Math.min(0.9, (parameters.viscosity ?? 0.38) + 0.12),
        };
      case 'gravity-sandbox':
        return {
          bodyCount: Math.max(48, Math.round((parameters.bodyCount ?? 96) * 0.72)),
          trailLength: Math.max(16, Math.round((parameters.trailLength ?? 44) * 0.55)),
        };
      case 'cloth-sheet':
        return {
          segmentsX: Math.max(8, Math.round((parameters.segmentsX ?? 16) * 0.78)),
          segmentsY: Math.max(6, Math.round((parameters.segmentsY ?? 12) * 0.78)),
          solverIterations: Math.max(1, Math.round((parameters.solverIterations ?? 3) - 1)),
        };
    }
  }

  private stabilityChanges(presetId: PresetId): SimulationParameters {
    switch (presetId) {
      case 'soft-body-cube':
        return { stiffness: 30, damping: 0.72, solverIterations: 4, gravity: 8 };
      case 'particle-fluid':
        return { viscosity: 0.86, repulsion: 9.5, cohesion: 2.1, gravity: 7.4 };
      case 'gravity-sandbox':
        return { timestep: 0.72, damping: 0.997, attractorStrength: 38, trailLength: 36 };
      case 'cloth-sheet':
        return { damping: 0.78, windStrength: 3.2, windTurbulence: 0.6, solverIterations: 4 };
    }
  }

  private detailChanges(
    presetId: PresetId,
    parameters: SimulationParameters,
    direction: 1 | -1,
  ): SimulationParameters {
    switch (presetId) {
      case 'soft-body-cube':
        return {
          resolution: Math.round((parameters.resolution ?? 4) + direction),
          solverIterations: direction > 0 ? 3 : 2,
        };
      case 'particle-fluid':
        return {
          particleCount: Math.round((parameters.particleCount ?? 180) * (direction > 0 ? 1.28 : 0.72)),
        };
      case 'gravity-sandbox':
        return {
          bodyCount: Math.round((parameters.bodyCount ?? 96) * (direction > 0 ? 1.35 : 0.7)),
          trailLength: Math.round((parameters.trailLength ?? 44) * (direction > 0 ? 1.22 : 0.68)),
        };
      case 'cloth-sheet':
        return {
          segmentsX: Math.round((parameters.segmentsX ?? 16) * (direction > 0 ? 1.22 : 0.78)),
          segmentsY: Math.round((parameters.segmentsY ?? 12) * (direction > 0 ? 1.22 : 0.78)),
        };
    }
  }

  private slowMotionChanges(presetId: PresetId): SimulationParameters {
    switch (presetId) {
      case 'soft-body-cube':
        return { gravity: 3.6, damping: 0.46, stiffness: 22 };
      case 'particle-fluid':
        return { gravity: 3.8, viscosity: 0.82, cohesion: 3.4 };
      case 'gravity-sandbox':
        return { timestep: 0.46, damping: 0.998, attractorStrength: 34 };
      case 'cloth-sheet':
        return { windStrength: 2.6, windTurbulence: 0.5, damping: 0.86 };
    }
  }

  private inferPresetFromText(text: string): PresetId | undefined {
    if (this.matches(text, ['cloth', 'flag', 'sheet', 'fabric', 'wind'])) return 'cloth-sheet';
    if (this.matches(text, ['fluid', 'water', 'honey', 'syrup', 'splash'])) return 'particle-fluid';
    if (this.matches(text, ['orbit', 'gravity', 'attractor', 'planet'])) return 'gravity-sandbox';
    if (this.matches(text, ['soft', 'jelly', 'cube', 'rubber'])) return 'soft-body-cube';
    return undefined;
  }
}

export const localAssistant = new LocalRuleBasedAssistant();
