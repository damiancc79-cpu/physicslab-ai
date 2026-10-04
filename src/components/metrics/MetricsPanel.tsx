import { Activity, Download, Flag, Gauge, Play, TimerReset, Trash2 } from 'lucide-react';
import { analyzeSceneStability } from '../../assistant/stability/StabilityAnalyzer';
import { createBenchmarkReport } from '../../performance/BenchmarkReport';
import type { BenchmarkResult, BenchmarkRun } from '../../performance/types';
import { useLabStore } from '../../state/useLabStore';
import { downloadJson } from '../../utils/download';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const signedNumberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

export const MetricsPanel = () => {
  const metrics = useLabStore((state) => state.metrics);
  const insights = useLabStore((state) => state.insights);
  const activePresetId = useLabStore((state) => state.activePresetId);
  const parameters = useLabStore((state) => state.parameters);
  const debugEnabled = useLabStore((state) => state.debugEnabled);
  const showParticles = useLabStore((state) => state.showParticles);
  const showSprings = useLabStore((state) => state.showSprings);
  const showTrails = useLabStore((state) => state.showTrails);
  const surfaceMode = useLabStore((state) => state.surfaceMode);
  const benchmarkResults = useLabStore((state) => state.benchmarkResults);
  const benchmarkHistory = useLabStore((state) => state.benchmarkHistory);
  const benchmarkBaselineRunId = useLabStore((state) => state.benchmarkBaselineRunId);
  const benchmarkRunLabel = useLabStore((state) => state.benchmarkRunLabel);
  const benchmarkError = useLabStore((state) => state.benchmarkError);
  const isBenchmarkRunning = useLabStore((state) => state.isBenchmarkRunning);
  const runBenchmarks = useLabStore((state) => state.runBenchmarks);
  const setBenchmarkRunLabel = useLabStore((state) => state.setBenchmarkRunLabel);
  const setBenchmarkBaseline = useLabStore((state) => state.setBenchmarkBaseline);
  const clearBenchmarkHistory = useLabStore((state) => state.clearBenchmarkHistory);
  const latestRun = benchmarkHistory[0];
  const baselineRun = benchmarkHistory.find((run) => run.id === benchmarkBaselineRunId);
  const stabilityWarnings = analyzeSceneStability({
    presetId: activePresetId,
    parameters,
    debug: { debugEnabled, showParticles, showSprings, showTrails },
    rendering: { surfaceMode },
    metrics,
  });
  const exportBenchmarkReport = () => {
    downloadJson(
      'physicslab-ai-benchmark-report.json',
      createBenchmarkReport(benchmarkResults, benchmarkHistory, benchmarkBaselineRunId),
    );
  };

  return (
    <aside className="panel metrics-panel" aria-label="Performance metrics">
      <div className="panel__header compact">
        <div>
          <p className="eyebrow">Performance</p>
          <h2>{numberFormat.format(metrics.averageFps)} FPS</h2>
        </div>
        <Activity size={20} aria-hidden />
      </div>

      <dl className="metrics-grid">
        <div>
          <dt>Frame</dt>
          <dd>{numberFormat.format(metrics.frameTimeMs)} ms</dd>
        </div>
        <div>
          <dt>Sim</dt>
          <dd>{numberFormat.format(metrics.simulationTimeMs)} ms</dd>
        </div>
        <div>
          <dt>Render</dt>
          <dd>{numberFormat.format(metrics.renderTimeMs)} ms</dd>
        </div>
        <div>
          <dt>Objects</dt>
          <dd>{metrics.objectCount}</dd>
        </div>
        <div>
          <dt>Renderer</dt>
          <dd>{metrics.rendererMode}</dd>
        </div>
        <div>
          <dt>Spikes</dt>
          <dd>{metrics.spikeCount}</dd>
        </div>
      </dl>

      <label className="benchmark-label">
        <span>Run name</span>
        <input
          value={benchmarkRunLabel}
          onChange={(event) => setBenchmarkRunLabel(event.target.value)}
          maxLength={42}
          aria-label="Benchmark run name"
        />
      </label>

      <div className="benchmark-actions">
        <button
          className="benchmark-button"
          type="button"
          onClick={() => void runBenchmarks()}
          disabled={isBenchmarkRunning}
        >
          <Play size={15} />
          <span>{isBenchmarkRunning ? 'Benchmarking...' : 'Run Benchmark'}</span>
        </button>
        {benchmarkHistory.length > 0 && (
          <button
            className="benchmark-button secondary"
            type="button"
            onClick={clearBenchmarkHistory}
            disabled={isBenchmarkRunning}
            aria-label="Clear benchmark history"
          >
            <Trash2 size={15} />
            <span>Clear</span>
          </button>
        )}
        {benchmarkResults.length > 0 && (
          <button
            className="benchmark-button secondary"
            type="button"
            onClick={exportBenchmarkReport}
            disabled={isBenchmarkRunning}
            aria-label="Export benchmark report"
          >
            <Download size={15} />
            <span>Report</span>
          </button>
        )}
      </div>

      {benchmarkError && <p className="benchmark-error">{benchmarkError}</p>}

      {benchmarkResults.length > 0 && (
        <div className="benchmark-table" aria-label="Benchmark results">
          <p>Saved runs: {benchmarkHistory.length}</p>
          {baselineRun && <p>Baseline: {baselineRun.label}</p>}
          {latestRun && latestRun.id !== benchmarkBaselineRunId && (
            <button
              className="benchmark-inline-button"
              type="button"
              onClick={() => setBenchmarkBaseline(latestRun.id)}
            >
              <Flag size={13} />
              <span>Use Latest as Baseline</span>
            </button>
          )}
          {benchmarkResults.map((result) => (
            <article key={result.presetId}>
              <strong>{result.presetName}</strong>
              <span>{numberFormat.format(result.averageFps)} FPS</span>
              <small>
                {numberFormat.format(result.averageFrameTimeMs)} ms avg /{' '}
                {numberFormat.format(result.maxFrameTimeMs)} ms max /{' '}
                {numberFormat.format(result.averageSimulationTimeMs)} ms sim
              </small>
              <small>{formatBenchmarkDelta(result)}</small>
              <em>{result.objectCount} objects</em>
            </article>
          ))}
        </div>
      )}

      {benchmarkHistory.length > 1 && (
        <div className="benchmark-history-chart" aria-label="Benchmark history chart">
          <strong>History</strong>
          {benchmarkResults.map((result) => (
            <BenchmarkSparkline
              key={result.presetId}
              presetId={result.presetId}
              presetName={result.presetName}
              history={benchmarkHistory}
            />
          ))}
        </div>
      )}

      <div className="insight-list">
        {stabilityWarnings.slice(0, 3).map((warning) => (
          <article
            key={`${warning.parameter}-${warning.currentValue}`}
            className={`insight ${warning.severity === 'danger' ? 'critical' : 'warning'}`}
          >
            {warning.severity === 'danger' ? <TimerReset size={15} /> : <Gauge size={15} />}
            <div>
              <strong>{warning.parameter}</strong>
              <p>{warning.explanation}</p>
            </div>
          </article>
        ))}
        {insights.slice(0, 3).map((insight) => (
          <article key={insight.id} className={`insight ${insight.severity}`}>
            {insight.severity === 'critical' ? <TimerReset size={15} /> : <Gauge size={15} />}
            <div>
              <strong>{insight.title}</strong>
              <p>{insight.recommendation}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
};

const formatBenchmarkDelta = (result: BenchmarkResult): string => {
  if (typeof result.baselineAverageFps !== 'number' || typeof result.fpsDelta !== 'number') {
    return 'No saved baseline yet';
  }

  if (Math.abs(result.fpsDelta) < 0.05) {
    return `Baseline ${numberFormat.format(result.baselineAverageFps)} FPS`;
  }

  return `${signedNumberFormat.format(result.fpsDelta)} FPS (${signedNumberFormat.format(
    result.fpsDeltaPercent ?? 0,
  )}%) vs ${numberFormat.format(result.baselineAverageFps)} FPS baseline`;
};

interface BenchmarkSparklineProps {
  presetId: BenchmarkResult['presetId'];
  presetName: string;
  history: BenchmarkRun[];
}

const BenchmarkSparkline = ({ presetId, presetName, history }: BenchmarkSparklineProps) => {
  const series = history
    .slice(0, 6)
    .reverse()
    .map((run) => ({
      run,
      result: run.results.find((entry) => entry.presetId === presetId),
    }))
    .filter((entry): entry is { run: BenchmarkRun; result: BenchmarkResult } => Boolean(entry.result));
  const maxFps = Math.max(1, ...series.map((entry) => entry.result.averageFps));

  return (
    <div className="benchmark-sparkline-row">
      <span>{presetName}</span>
      <div className="benchmark-sparkline" aria-hidden>
        {series.map(({ run, result }) => (
          <i
            key={`${run.id}-${result.presetId}`}
            style={{ height: `${Math.max(12, (result.averageFps / maxFps) * 100)}%` }}
            title={`${run.label}: ${numberFormat.format(result.averageFps)} FPS`}
          />
        ))}
      </div>
      <em>{series.length > 0 ? numberFormat.format(series[series.length - 1].result.averageFps) : '0'} FPS</em>
    </div>
  );
};
