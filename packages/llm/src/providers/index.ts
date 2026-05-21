import type { LlmProviderId } from "../types.js";
import type { ChatMessage, ProviderStreamConfig } from "../types.js";
import { streamAnthropicChat } from "./anthropic.js";
import { streamGoogleChat } from "./google.js";
import { streamOpenAiChat } from "./openai.js";

export async function* streamProviderChat(
  provider: LlmProviderId,
  messages: ChatMessage[],
  config: ProviderStreamConfig,
): AsyncIterable<string> {
  switch (provider) {
    case "openai":
    case "custom":
      yield* streamOpenAiChat(messages, config);
      break;
    case "anthropic":
      yield* streamAnthropicChat(messages, config);
      break;
    case "google":
      yield* streamGoogleChat(messages, config);
      break;
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}
