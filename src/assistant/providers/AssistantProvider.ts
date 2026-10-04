import type { AssistantCommand, AssistantResponse } from '../commands/types';

export interface AssistantProvider {
  readonly id: string;
  readonly label: string;
  execute(command: AssistantCommand): Promise<AssistantResponse>;
}
