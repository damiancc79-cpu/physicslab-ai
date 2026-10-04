import { Bot, Send, Sparkles } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { localAssistant } from '../../assistant/providers/LocalRuleBasedAssistant';
import { useLabStore } from '../../state/useLabStore';

export const AssistantPanel = () => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const activePresetId = useLabStore((state) => state.activePresetId);
  const parameters = useLabStore((state) => state.parameters);
  const metrics = useLabStore((state) => state.metrics);
  const insights = useLabStore((state) => state.insights);
  const debugEnabled = useLabStore((state) => state.debugEnabled);
  const showParticles = useLabStore((state) => state.showParticles);
  const showSprings = useLabStore((state) => state.showSprings);
  const showTrails = useLabStore((state) => state.showTrails);
  const surfaceMode = useLabStore((state) => state.surfaceMode);
  const qualityPreset = useLabStore((state) => state.qualityPreset);
  const autoPerformanceEnabled = useLabStore((state) => state.autoPerformanceEnabled);
  const benchmarkResults = useLabStore((state) => state.benchmarkResults);
  const benchmarkHistory = useLabStore((state) => state.benchmarkHistory);
  const benchmarkBaselineRunId = useLabStore((state) => state.benchmarkBaselineRunId);
  const assistantMessages = useLabStore((state) => state.assistantMessages);
  const pushAssistantMessage = useLabStore((state) => state.pushAssistantMessage);
  const applyAssistantResponse = useLabStore((state) => state.applyAssistantResponse);

  const suggestions = useMemo(
    () => [
      'Create a low-gravity jelly cube scene',
      'Optimize this for 60 FPS',
      'Create a chaotic orbital scene',
      'Make this stable',
    ],
    [],
  );

  const submit = async (event?: FormEvent, override?: string) => {
    event?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || isThinking) return;

    setInput('');
    setIsThinking(true);
    pushAssistantMessage({ role: 'user', content: text });

    try {
      const response = await localAssistant.execute({
        text,
        presetId: activePresetId,
        parameters,
        debug: { debugEnabled, showParticles, showSprings, showTrails },
        rendering: { surfaceMode },
        performance: { qualityPreset, autoPerformanceEnabled },
        metrics,
        insights,
        benchmarkResults,
        benchmarkBaselineLabel: benchmarkHistory.find((run) => run.id === benchmarkBaselineRunId)?.label,
      });
      applyAssistantResponse(response);
      const changed = response.parameterDiff?.map((change) => change.parameter) ?? Object.keys(response.parameterChanges);
      const suffix = changed.length > 0 ? ` Changed ${changed.length} setting${changed.length === 1 ? '' : 's'}.` : '';
      const generated = response.generatedPreset
        ? ` Generated preset: ${response.generatedPreset.name}.`
        : '';
      pushAssistantMessage({
        role: 'assistant',
        content: `${response.explanation}${suffix}${generated}`,
        warnings: response.warnings,
        presetJson: response.scenePreset ?? response.generatedPreset,
        parameterDiff: response.parameterDiff,
      });
    } catch (error) {
      pushAssistantMessage({
        role: 'assistant',
        content: `The local assistant failed to process that command: ${String(error)}`,
      });
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <aside className="panel assistant-panel" aria-label="AI Lab Assistant">
      <div className="panel__header">
        <div>
          <p className="eyebrow">AI Lab Assistant</p>
          <h2>Local rules</h2>
        </div>
        <Bot size={20} aria-hidden />
      </div>

      <div className="assistant-messages" role="log" aria-live="polite">
        {assistantMessages.map((message) => (
          <article key={message.id} className={`assistant-message ${message.role}`}>
            <p>{message.content}</p>
            {message.warnings?.map((warning) => (
              <small key={warning}>{warning}</small>
            ))}
            {message.parameterDiff && message.parameterDiff.length > 0 && (
              <div className="assistant-diff" aria-label="Assistant parameter changes">
                {message.parameterDiff.slice(0, 8).map((change) => (
                  <div key={`${change.parameter}-${String(change.nextValue)}`}>
                    <strong>{change.parameter}</strong>
                    <span>
                      {String(change.previousValue)} -&gt; {String(change.nextValue)}
                    </span>
                    <small>{change.reason}</small>
                  </div>
                ))}
              </div>
            )}
            {message.presetJson != null && <pre>{JSON.stringify(message.presetJson, null, 2)}</pre>}
          </article>
        ))}
        {isThinking && (
          <article className="assistant-message assistant">
            <p>Thinking through local simulation rules...</p>
          </article>
        )}
      </div>

      <div className="suggestion-row">
        {suggestions.map((suggestion) => (
          <button key={suggestion} onClick={() => void submit(undefined, suggestion)}>
            <Sparkles size={13} />
            <span>{suggestion}</span>
          </button>
        ))}
      </div>

      <form className="assistant-form" onSubmit={(event) => void submit(event)}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for a preset or parameter change"
          aria-label="Assistant command"
        />
        <button className="send-button" type="submit" disabled={!input.trim() || isThinking} title="Send command">
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
};
