import {
  Bug,
  Camera,
  Download,
  Eye,
  FolderOpen,
  Gauge,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Shuffle,
  SkipForward,
  Trash2,
  Upload,
  Waves,
} from 'lucide-react';
import { useRef } from 'react';
import { qualityPresetLabels } from '../../performance/quality';
import type { QualityPresetId } from '../../performance/types';
import type { SurfaceMode } from '../../rendering/types';
import { presetLoader } from '../../simulation/presets/PresetLoader';
import type { PresetId } from '../../simulation/core/types';
import { useLabStore } from '../../state/useLabStore';
import { downloadJson } from '../../utils/download';
import { createSceneConfig } from '../../utils/sceneConfig';
import { ParameterSlider } from './ParameterSlider';

export const ControlPanel = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presets = useLabStore((state) => state.presets);
  const activePresetId = useLabStore((state) => state.activePresetId);
  const parameters = useLabStore((state) => state.parameters);
  const isPaused = useLabStore((state) => state.isPaused);
  const debugEnabled = useLabStore((state) => state.debugEnabled);
  const showParticles = useLabStore((state) => state.showParticles);
  const showSprings = useLabStore((state) => state.showSprings);
  const showTrails = useLabStore((state) => state.showTrails);
  const surfaceMode = useLabStore((state) => state.surfaceMode);
  const qualityPreset = useLabStore((state) => state.qualityPreset);
  const autoPerformanceEnabled = useLabStore((state) => state.autoPerformanceEnabled);
  const userPresets = useLabStore((state) => state.userPresets);
  const userPresetLabel = useLabStore((state) => state.userPresetLabel);
  const setPreset = useLabStore((state) => state.setPreset);
  const setParameter = useLabStore((state) => state.setParameter);
  const setQualityPreset = useLabStore((state) => state.setQualityPreset);
  const toggleAutoPerformance = useLabStore((state) => state.toggleAutoPerformance);
  const importSceneConfig = useLabStore((state) => state.importSceneConfig);
  const randomizeParameters = useLabStore((state) => state.randomizeParameters);
  const resetSimulation = useLabStore((state) => state.resetSimulation);
  const stepOnce = useLabStore((state) => state.stepOnce);
  const setPaused = useLabStore((state) => state.setPaused);
  const toggleDebug = useLabStore((state) => state.toggleDebug);
  const toggleParticles = useLabStore((state) => state.toggleParticles);
  const toggleSprings = useLabStore((state) => state.toggleSprings);
  const toggleTrails = useLabStore((state) => state.toggleTrails);
  const setSurfaceMode = useLabStore((state) => state.setSurfaceMode);
  const requestScreenshot = useLabStore((state) => state.requestScreenshot);
  const setUserPresetLabel = useLabStore((state) => state.setUserPresetLabel);
  const saveCurrentUserPreset = useLabStore((state) => state.saveCurrentUserPreset);
  const loadUserPreset = useLabStore((state) => state.loadUserPreset);
  const deleteUserPreset = useLabStore((state) => state.deleteUserPreset);
  const pushAssistantMessage = useLabStore((state) => state.pushAssistantMessage);
  const activePreset = presetLoader.load(activePresetId);

  const exportScene = () => {
    downloadJson(
      `physicslab-ai-${activePresetId}.json`,
      createSceneConfig({
        presetId: activePresetId,
        parameters,
        toggles: { debugEnabled, showParticles, showSprings, showTrails, surfaceMode },
        qualityPreset,
        autoPerformanceEnabled,
      }),
    );
  };

  const importScene = (file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ok = importSceneConfig(JSON.parse(String(reader.result)));
        pushAssistantMessage({
          role: 'assistant',
          content: ok
            ? `Imported scene config from ${file.name}.`
            : `Could not import ${file.name}; the file is not a valid PhysicsLab AI scene config.`,
        });
      } catch {
        pushAssistantMessage({
          role: 'assistant',
          content: `Could not parse ${file.name}. Use a JSON scene exported by PhysicsLab AI.`,
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className="panel control-panel" aria-label="Simulation controls">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Preset</p>
          <h2>{activePreset.name}</h2>
        </div>
        <Waves size={20} aria-hidden />
      </div>

      <select
        className="preset-select"
        value={activePresetId}
        onChange={(event) => setPreset(event.target.value as PresetId)}
        aria-label="Select simulation preset"
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      <p className="panel-description">{activePreset.description}</p>

      <div className="quality-row">
        <label>
          <span>Quality</span>
          <select
            value={qualityPreset}
            onChange={(event) => setQualityPreset(event.target.value as QualityPresetId)}
            aria-label="Quality preset"
          >
            {Object.entries(qualityPresetLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="quality-row">
        <label>
          <span>View</span>
          <select
            value={surfaceMode}
            onChange={(event) => setSurfaceMode(event.target.value as SurfaceMode)}
            aria-label="Surface display mode"
          >
            <option value="debug">Debug particles/springs</option>
            <option value="shaded">Shaded surface</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>

      <div className="transport-grid" aria-label="Transport controls">
        <button className="icon-button primary" onClick={() => setPaused(!isPaused)} title="Play or pause">
          {isPaused ? <Play size={17} /> : <Pause size={17} />}
          <span>{isPaused ? 'Play' : 'Pause'}</span>
        </button>
        <button className="icon-button" onClick={stepOnce} title="Step one simulation frame">
          <SkipForward size={17} />
          <span>Step</span>
        </button>
        <button className="icon-button" onClick={resetSimulation} title="Reset simulation">
          <RefreshCcw size={17} />
          <span>Reset</span>
        </button>
        <button className="icon-button" onClick={randomizeParameters} title="Randomize parameters">
          <Shuffle size={17} />
          <span>Random</span>
        </button>
        <button className="icon-button" onClick={requestScreenshot} title="Export screenshot">
          <Camera size={17} />
          <span>Shot</span>
        </button>
        <button className="icon-button" onClick={exportScene} title="Export JSON scene configuration">
          <Download size={17} />
          <span>JSON</span>
        </button>
        <button
          className="icon-button"
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON scene configuration"
        >
          <Upload size={17} />
          <span>Import</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => importScene(event.currentTarget.files?.[0])}
      />

      <div className="toggle-grid" aria-label="Debug visualization toggles">
        <label>
          <input type="checkbox" checked={autoPerformanceEnabled} onChange={toggleAutoPerformance} />
          <Gauge size={15} />
          Auto Perf
        </label>
        <label>
          <input type="checkbox" checked={debugEnabled} onChange={toggleDebug} />
          <Bug size={15} />
          Debug
        </label>
        <label>
          <input type="checkbox" checked={showParticles} onChange={toggleParticles} />
          <Eye size={15} />
          Particles
        </label>
        <label>
          <input type="checkbox" checked={showSprings} onChange={toggleSprings} />
          <Eye size={15} />
          Springs
        </label>
        <label>
          <input type="checkbox" checked={showTrails} onChange={toggleTrails} />
          <Eye size={15} />
          Trails
        </label>
      </div>

      <section className="preset-library" aria-label="Saved user preset library">
        <div className="preset-library__top">
          <label>
            <span>Save preset</span>
            <input
              value={userPresetLabel}
              onChange={(event) => setUserPresetLabel(event.target.value)}
              maxLength={48}
              aria-label="Saved preset name"
            />
          </label>
          <button className="icon-button" type="button" onClick={saveCurrentUserPreset} title="Save current preset">
            <Save size={16} />
          </button>
        </div>

        {userPresets.length > 0 && (
          <div className="preset-library__list">
            {userPresets.slice(0, 4).map((preset) => (
              <article key={preset.id}>
                <img src={preset.thumbnail} alt="" aria-hidden />
                <div>
                  <strong>{preset.label}</strong>
                  <span>{preset.scene.presetType}</span>
                </div>
                <button type="button" onClick={() => loadUserPreset(preset.id)} title={`Load ${preset.label}`}>
                  <FolderOpen size={14} />
                </button>
                <button type="button" onClick={() => deleteUserPreset(preset.id)} title={`Delete ${preset.label}`}>
                  <Trash2 size={14} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="parameter-list">
        {activePreset.parameterDefinitions.map((definition) => (
          <ParameterSlider
            key={definition.id}
            definition={definition}
            value={parameters[definition.id] ?? definition.defaultValue}
            onChange={(value) => setParameter(definition.id, value)}
          />
        ))}
      </div>
    </aside>
  );
};
