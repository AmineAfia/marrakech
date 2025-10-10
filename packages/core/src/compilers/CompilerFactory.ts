import type { Provider } from "../types.js";
import { GenericCompiler } from "./GenericCompiler.js";
import { OpenAICompiler } from "./OpenAICompiler.js";
import { AnthropicCompiler } from "./AnthropicCompiler.js";

const genericCompiler = new GenericCompiler();
const openaiCompiler = new OpenAICompiler();
const anthropicCompiler = new AnthropicCompiler();

export function getCompiler(provider: Provider) {
  switch (provider) {
    case "openai":
      return openaiCompiler;
    case "anthropic":
      return anthropicCompiler;
    default:
      return genericCompiler;
  }
}
