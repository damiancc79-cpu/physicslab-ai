import { lazy, Suspense } from 'react';
import { AssistantPanel } from '../components/assistant/AssistantPanel';
import { ControlPanel } from '../components/controls/ControlPanel';
import { MetricsPanel } from '../components/metrics/MetricsPanel';

const SimulationViewport = lazy(() =>
  import('../components/viewport/SimulationViewport').then((module) => ({
    default: module.SimulationViewport,
  })),
);

export const App = () => {
  return (
    <main className="app-shell">
      <ControlPanel />
      <Suspense
        fallback={
          <section className="viewport-shell viewport-loading" aria-label="3D simulation viewport">
            <p>Loading viewport</p>
          </section>
        }
      >
        <SimulationViewport />
      </Suspense>
      <div className="right-rail">
        <MetricsPanel />
        <AssistantPanel />
      </div>
    </main>
  );
};
