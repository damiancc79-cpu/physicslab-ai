import { create } from 'zustand';
import type { AssistantResponse } from '../assistant/commands/types';
import type { ParameterChange } from '../assistant/types';
import {
  deleteUserPreset,
  loadUserPresets,
  saveUserPreset,
  type SavedUserPreset,
} from '../library/UserPresetLibrary';
import {
  appendBenchmarkRun,
  clearStoredBenchmarkHistory,
  loadBenchmarkHistoryState,
  setBenchmarkBaselineRun,
} from '../performance/BenchmarkHistory';
import { runBenchmarkSuite } from '../performance/BenchmarkRunner';
import { getAutoPerformanceParameters, getQualityParameters } from '../performance/quality';
import type {
  BenchmarkResult,
  BenchmarkRun,
  PerformanceInsight,
  PerformanceMetrics,
  QualityPresetId,
} from '../performance/types';
import type { SurfaceMode } from '../rendering/types';
import { createScenePreset } from '../scene/ScenePresetSchema';
import type { PresetId, SimulationParameters, SimulationPreset } from '../simulation/core/types';
import { presetLoader } from '../simulation/presets/PresetLoader';
import { getDefaultParameters } from '../simulation/presets/presets';
import { normalizeSceneConfig } from '../utils/sceneConfig';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  warnings?: string[];
  presetJson?: unknown;
  parameterDiff?: ParameterChange[];
}

interface LabState {
  presets: SimulationPreset[];
  activePresetId: PresetId;
  parameters: SimulationParameters;
  isPaused: boolean;
  debugEnabled: boolean;
  showParticles: boolean;
  showSprings: boolean;
  showTrails: boolean;
  surfaceMode: SurfaceMode;
  qualityPreset: QualityPresetId;
  autoPerformanceEnabled: boolean;
  lastAutoTuneAt: number;
  resetNonce: number;
  stepNonce: number;
  screenshotNonce: number;
  metrics: PerformanceMetrics;
  insights: PerformanceInsight[];
  benchmarkResults: BenchmarkResult[];
  benchmarkHistory: BenchmarkRun[];
  benchmarkBaselineRunId?: string;
  benchmarkRunLabel: string;
  benchmarkError?: string;
  isBenchmarkRunning: boolean;
  userPresets: SavedUserPreset[];
  userPresetLabel: string;
  assistantMessages: AssistantMessage[];
  setPreset: (presetId: PresetId) => void;
  setParameter: (id: string, value: number) => void;
  setParameters: (parameters: SimulationParameters) => void;
  setQualityPreset: (qualityPreset: QualityPresetId) => void;
  toggleAutoPerformance: () => void;
  importSceneConfig: (input: unknown) => boolean;
  randomizeParameters: () => void;
  resetSimulation: () => void;
  stepOnce: () => void;
  setPaused: (isPaused: boolean) => void;
  toggleDebug: () => void;
  toggleParticles: () => void;
  toggleSprings: () => void;
  toggleTrails: () => void;
  setSurfaceMode: (surfaceMode: SurfaceMode) => void;
  requestScreenshot: () => void;
  setMetrics: (metrics: PerformanceMetrics, insights: PerformanceInsight[]) => void;
  runBenchmarks: () => Promise<void>;
  setBenchmarkRunLabel: (benchmarkRunLabel: string) => void;
  setBenchmarkBaseline: (benchmarkRunId: string) => void;
  clearBenchmarkHistory: () => void;
  setUserPresetLabel: (userPresetLabel: string) => void;
  saveCurrentUserPreset: () => void;
  loadUserPreset: (presetId: string) => void;
  deleteUserPreset: (presetId: string) => void;
  pushAssistantMessage: (message: Omit<AssistantMessage, 'id'>) => void;
  applyAssistantResponse: (response: AssistantResponse) => void;
}

const initialPreset = presetLoader.load('soft-body-cube');
const initialMetrics: PerformanceMetrics = {
  fps: 0,
  averageFps: 0,
  frameTimeMs: 0,
  simulationTimeMs: 0,
  renderTimeMs: 0,
  objectCount: 0,
  rendererMode: 'WebGL fallback',
  spikeCount: 0,
};
const initialBenchmarkState = loadBenchmarkHistoryState();
const initialUserPresets = loadUserPresets();

const getDefaultBenchmarkRunLabel = (history: BenchmarkRun[]): string =>
  history.length === 0 ? 'Demo baseline' : `Demo run ${history.length + 1}`;

export const useLabStore = create<LabState>((set, get) => ({
  presets: presetLoader.getAll(),
  activePresetId: initialPreset.id,
  parameters: getDefaultParameters(initialPreset),
  isPaused: false,
  debugEnabled: true,
  showParticles: true,
  showSprings: true,
  showTrails: true,
  surfaceMode: 'both',
  qualityPreset: 'medium',
  autoPerformanceEnabled: false,
  lastAutoTuneAt: 0,
  resetNonce: 0,
  stepNonce: 0,
  screenshotNonce: 0,
  metrics: initialMetrics,
  insights: [],
  benchmarkResults: initialBenchmarkState.runs[0]?.results ?? [],
  benchmarkHistory: initialBenchmarkState.runs,
  benchmarkBaselineRunId: initialBenchmarkState.baselineRunId,
  benchmarkRunLabel: getDefaultBenchmarkRunLabel(initialBenchmarkState.runs),
  benchmarkError: undefined,
  isBenchmarkRunning: false,
  userPresets: initialUserPresets,
  userPresetLabel: 'Portfolio demo preset',
  assistantMessages: [
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Local assistant ready. Try "Create a low-gravity jelly cube scene" or "optimize this for 60 FPS".',
    },
  ],
  setPreset: (presetId) => {
    const preset = presetLoader.load(presetId);
    const qualityPreset = get().qualityPreset;
    set({
      activePresetId: presetId,
      parameters:
        qualityPreset === 'medium'
          ? getDefaultParameters(preset)
          : getQualityParameters(presetId, qualityPreset),
      resetNonce: get().resetNonce + 1,
    });
  },
  setParameter: (id, value) => {
    const preset = presetLoader.load(get().activePresetId);
    set({
      parameters: presetLoader.validate(preset, { ...get().parameters, [id]: value }),
    });
  },
  setParameters: (parameters) => {
    const preset = presetLoader.load(get().activePresetId);
    set({ parameters: presetLoader.validate(preset, { ...get().parameters, ...parameters }) });
  },
  setQualityPreset: (qualityPreset) => {
    const activePresetId = get().activePresetId;
    set({
      qualityPreset,
      parameters: getQualityParameters(activePresetId, qualityPreset),
      resetNonce: get().resetNonce + 1,
    });
  },
  toggleAutoPerformance: () => set({ autoPerformanceEnabled: !get().autoPerformanceEnabled }),
  importSceneConfig: (input) => {
    const config = normalizeSceneConfig(input);
    if (!config) return false;

    set({
      activePresetId: config.presetId,
      parameters: config.parameters,
      debugEnabled: config.toggles?.debugEnabled ?? get().debugEnabled,
      showParticles: config.toggles?.showParticles ?? get().showParticles,
      showSprings: config.toggles?.showSprings ?? get().showSprings,
      showTrails: config.toggles?.showTrails ?? get().showTrails,
      surfaceMode: config.toggles?.surfaceMode ?? get().surfaceMode,
      qualityPreset: config.qualityPreset ?? 'medium',
      autoPerformanceEnabled: config.autoPerformanceEnabled ?? get().autoPerformanceEnabled,
      resetNonce: get().resetNonce + 1,
    });

    return true;
  },
  randomizeParameters: () => {
    const preset = presetLoader.load(get().activePresetId);
    set({ parameters: presetLoader.randomize(preset), resetNonce: get().resetNonce + 1 });
  },
  resetSimulation: () => set({ resetNonce: get().resetNonce + 1 }),
  stepOnce: () => set({ isPaused: true, stepNonce: get().stepNonce + 1 }),
  setPaused: (isPaused) => set({ isPaused }),
  toggleDebug: () => set({ debugEnabled: !get().debugEnabled }),
  toggleParticles: () => set({ showParticles: !get().showParticles }),
  toggleSprings: () => set({ showSprings: !get().showSprings }),
  toggleTrails: () => set({ showTrails: !get().showTrails }),
  setSurfaceMode: (surfaceMode) => set({ surfaceMode }),
  requestScreenshot: () => set({ screenshotNonce: get().screenshotNonce + 1 }),
  setMetrics: (metrics, insights) => {
    const state = get();
    const now = Date.now();
    const autoParameters =
      state.autoPerformanceEnabled && now - state.lastAutoTuneAt > 2500
        ? getAutoPerformanceParameters(state.activePresetId, state.parameters, metrics)
        : null;

    if (autoParameters) {
      set({
        metrics,
        insights,
        parameters: autoParameters,
        qualityPreset: 'medium',
        lastAutoTuneAt: now,
        resetNonce: state.resetNonce + 1,
      });
      return;
    }

    set({ metrics, insights });
  },
  runBenchmarks: async () => {
    if (get().isBenchmarkRunning) return;

    set({ isBenchmarkRunning: true, benchmarkError: undefined });
    try {
      const rawBenchmarkResults = await runBenchmarkSuite();
      const state = get();
      const benchmarkState = appendBenchmarkRun(
        {
          runs: state.benchmarkHistory,
          baselineRunId: state.benchmarkBaselineRunId,
        },
        rawBenchmarkResults,
        state.benchmarkRunLabel,
      );
      set({
        benchmarkResults: benchmarkState.runs[0]?.results ?? rawBenchmarkResults,
        benchmarkHistory: benchmarkState.runs,
        benchmarkBaselineRunId: benchmarkState.baselineRunId,
        benchmarkRunLabel: getDefaultBenchmarkRunLabel(benchmarkState.runs),
        isBenchmarkRunning: false,
        benchmarkError: undefined,
      });
    } catch (error) {
      set({
        isBenchmarkRunning: false,
        benchmarkError: error instanceof Error ? error.message : String(error),
      });
    }
  },
  setBenchmarkRunLabel: (benchmarkRunLabel) => set({ benchmarkRunLabel: benchmarkRunLabel.slice(0, 42) }),
  setBenchmarkBaseline: (benchmarkRunId) => {
    const benchmarkState = setBenchmarkBaselineRun(
      {
        runs: get().benchmarkHistory,
        baselineRunId: get().benchmarkBaselineRunId,
      },
      benchmarkRunId,
    );
    set({
      benchmarkResults: benchmarkState.runs[0]?.results ?? [],
      benchmarkHistory: benchmarkState.runs,
      benchmarkBaselineRunId: benchmarkState.baselineRunId,
    });
  },
  clearBenchmarkHistory: () => {
    clearStoredBenchmarkHistory();
    set({
      benchmarkResults: [],
      benchmarkHistory: [],
      benchmarkBaselineRunId: undefined,
      benchmarkRunLabel: getDefaultBenchmarkRunLabel([]),
      benchmarkError: undefined,
    });
  },
  setUserPresetLabel: (userPresetLabel) => set({ userPresetLabel: userPresetLabel.slice(0, 48) }),
  saveCurrentUserPreset: () => {
    const state = get();
    const scene = createScenePreset({
      presetId: state.activePresetId,
      presetName: state.userPresetLabel || presetLoader.load(state.activePresetId).name,
      parameters: state.parameters,
      rendering: { surfaceMode: state.surfaceMode },
      performance: {
        qualityPreset: state.qualityPreset,
        autoPerformanceEnabled: state.autoPerformanceEnabled,
      },
      debug: {
        debugEnabled: state.debugEnabled,
        showParticles: state.showParticles,
        showSprings: state.showSprings,
        showTrails: state.showTrails,
      },
      assistantMetadata: {
        generatedBy: 'User preset library',
        createdAt: new Date().toISOString(),
      },
    });
    const userPresets = saveUserPreset(state.userPresets, scene, state.userPresetLabel);
    set({
      userPresets,
      userPresetLabel: `Preset ${userPresets.length + 1}`,
    });
  },
  loadUserPreset: (presetId) => {
    const saved = get().userPresets.find((preset) => preset.id === presetId);
    if (!saved) return;
    const scene = saved.scene;
    set({
      activePresetId: scene.presetId,
      parameters: scene.parameters,
      debugEnabled: scene.debug.debugEnabled,
      showParticles: scene.debug.showParticles,
      showSprings: scene.debug.showSprings,
      showTrails: scene.debug.showTrails,
      surfaceMode: scene.rendering.surfaceMode,
      qualityPreset: scene.performance.qualityPreset,
      autoPerformanceEnabled: scene.performance.autoPerformanceEnabled,
      userPresetLabel: saved.label,
      resetNonce: get().resetNonce + 1,
    });
  },
  deleteUserPreset: (presetId) =>
    set({
      userPresets: deleteUserPreset(get().userPresets, presetId),
    }),
  pushAssistantMessage: (message) =>
    set({
      assistantMessages: [
        ...get().assistantMessages,
        { ...message, id: `${message.role}-${Date.now()}-${Math.random().toString(16).slice(2)}` },
      ].slice(-10),
    }),
  applyAssistantResponse: (response) => {
    if (response.scenePreset) {
      set({
        activePresetId: response.scenePreset.presetId,
        parameters: response.scenePreset.parameters,
        debugEnabled: response.scenePreset.debug.debugEnabled,
        showParticles: response.scenePreset.debug.showParticles,
        showSprings: response.scenePreset.debug.showSprings,
        showTrails: response.scenePreset.debug.showTrails,
        surfaceMode: response.scenePreset.rendering.surfaceMode,
        qualityPreset: response.scenePreset.performance.qualityPreset,
        autoPerformanceEnabled: response.scenePreset.performance.autoPerformanceEnabled,
        resetNonce: get().resetNonce + 1,
      });
      return;
    }

    if (response.presetId && response.presetId !== get().activePresetId) {
      const preset = presetLoader.load(response.presetId);
      const nextParameters = presetLoader.validate(preset, {
        ...getDefaultParameters(preset),
        ...response.parameterChanges,
      });
      set({
        activePresetId: response.presetId,
        parameters: nextParameters,
        debugEnabled: response.debugChanges?.debugEnabled ?? get().debugEnabled,
        showParticles: response.debugChanges?.showParticles ?? get().showParticles,
        showSprings: response.debugChanges?.showSprings ?? get().showSprings,
        showTrails: response.debugChanges?.showTrails ?? get().showTrails,
        surfaceMode: response.renderingChanges?.surfaceMode ?? get().surfaceMode,
        qualityPreset: response.performanceChanges?.qualityPreset ?? 'medium',
        autoPerformanceEnabled:
          response.performanceChanges?.autoPerformanceEnabled ?? get().autoPerformanceEnabled,
        resetNonce: get().resetNonce + 1,
      });
      return;
    }

    const preset = presetLoader.load(get().activePresetId);
    set({
      parameters: presetLoader.validate(preset, {
        ...get().parameters,
        ...response.parameterChanges,
      }),
      debugEnabled: response.debugChanges?.debugEnabled ?? get().debugEnabled,
      showParticles: response.debugChanges?.showParticles ?? get().showParticles,
      showSprings: response.debugChanges?.showSprings ?? get().showSprings,
      showTrails: response.debugChanges?.showTrails ?? get().showTrails,
      surfaceMode: response.renderingChanges?.surfaceMode ?? get().surfaceMode,
      qualityPreset: response.performanceChanges?.qualityPreset ?? get().qualityPreset,
      autoPerformanceEnabled:
        response.performanceChanges?.autoPerformanceEnabled ?? get().autoPerformanceEnabled,
      resetNonce:
        Object.keys(response.parameterChanges).length > 0 ||
        response.renderingChanges ||
        response.debugChanges ||
        response.performanceChanges
          ? get().resetNonce + 1
          : get().resetNonce,
    });
  },
}));
