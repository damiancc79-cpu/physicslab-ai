import type { AssistantResponse } from '../commands/types';
import type { AssistantProvider } from './AssistantProvider';

export class FutureOpenAIProvider implements AssistantProvider {
  readonly id = 'future-openai';
  readonly label = 'Future OpenAI Provider';

  async execute(): Promise<AssistantResponse> {
    throw new Error(
      'FutureOpenAIProvider is intentionally disabled. Route future LLM calls through a secure backend or user-managed local provider; never ship browser API keys.',
    );
  }
}
