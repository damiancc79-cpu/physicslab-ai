# Future LLM Provider Path

PhysicsLab AI v0.3 remains fully local and deterministic. The default assistant is `LocalRuleBasedAssistant`; it does not call external APIs and requires no keys.

`FutureOpenAIProvider` is intentionally disabled. A later provider should use the existing `AssistantProvider` and `AssistantResponse` contracts and return the same structured `ScenePreset` shape used by the local scene generator.

## Security Requirements

- Do not put API keys in browser code.
- Do not require paid services for the local demo path.
- Use a secure backend, token exchange, or user-managed local provider if real LLM calls are added later.
- Validate every returned scene with `ScenePresetSchema` before applying it.
- Preserve deterministic local fallback behavior for tests, demos, and offline use.
