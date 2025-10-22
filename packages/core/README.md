# @marrakesh/core

A structured, testable, and data-driven context engineering SDK for the TypeScript world.

## Features

- **Fluent API**: Chainable methods for building prompts
- **AI SDK-style Tools**: Define tools with Zod schemas and metadata
- **Provider Support**: Compile for OpenAI, Anthropic, or generic formats
- **Provider-Aware Prompt Linting (opt-in)**: Research-backed checks for OpenAI/Anthropic best practices (off by default)
- **Vercel AI SDK Compatible**: Seamless integration with existing workflows

## Installation

```bash
# Using npm
npm install @marrakesh/core zod

# Using pnpm
pnpm add @marrakesh/core zod

# Using yarn
yarn add @marrakesh/core zod
```

## Quick Start

### Basic Usage

```typescript
import { PromptBuilder } from '@marrakesh/core';

const prompt = new PromptBuilder({ name: 'support-agent' })
  .withPersona('You are a helpful customer service agent')
  .withRule('Always be polite and professional')
  .withRule('If you don\'t know something, say so')
  .withExample({
    user: 'I need help with my order',
    assistant: 'I\'d be happy to help you with your order. Can you provide your order number?'
  });

// Compile for any provider
const systemPrompt = prompt.compile();
```

### With Tools (AI SDK Style)

```typescript
import { PromptBuilder, tool } from '@marrakesh/core';
import { z } from 'zod';

// Define a tool with AI SDK pattern
const getUserDetails = tool({
  description: 'Fetch user account information from database',
  parameters: z.object({
    userId: z.string().describe('User ID to lookup')
  }),
  execute: async ({ userId }) => {
    return await db.users.findById(userId);
  }
});

const prompt = new PromptBuilder({ name: 'support-agent' })
  .withPersona('You are a helpful customer service agent')
  .withTool(getUserDetails);

// OpenAI format (includes tools separately)
const { systemPrompt, tools } = prompt.compile('openai');
```

### Vercel AI SDK Integration

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PromptBuilder } from '@marrakesh/core';

const prompt = new PromptBuilder({ name: 'chat-agent' })
  .withPersona('You are a helpful assistant')
  .withRule('Be concise and helpful');

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Prepare messages with system prompt
  const messagesWithSystem = prompt.prepareMessages(messages);
  
  return streamText({
    model: openai('gpt-4'),
    messages: messagesWithSystem
  });
}
```

## API Reference

### PromptBuilder

#### Constructor
```typescript
new PromptBuilder({ name: string })
```

#### Methods

- `withPersona(text: string): this` - Add persona/instruction
- `withRule(text: string): this` - Add a rule (call multiple times)
- `withExample(example: { user: string, assistant: string }): this` - Add few-shot example
- `withTool(toolFunction: ToolFunction): this` - Add a tool function
- `compile(provider?: Provider): string | CompileResult` - Compile the prompt
- `prepareMessages(messages: Message[]): Message[]` - Prepare messages with system prompt

### Tool Helper

```typescript
import { tool } from '@marrakesh/core';

const myTool = tool({
  description: 'Tool description',
  parameters: z.object({ /* Zod schema */ }),
  execute: async (params) => { /* implementation */ }
});
```

### Providers

- `'generic'` - Simple markdown format (default)
- `'openai'` - OpenAI-optimized with separate tools array
- `'anthropic'` - Claude-optimized with XML structure

## Prompt Linter (opt-in)

The SDK includes a lightweight, provider-aware prompt linter you can enable via environment variables. It never changes your request payload and only logs findings. It is disabled by default.

### Enable

```bash
SDK_PROMPT_LINTER=1           # enable (default off)
SDK_PROMPT_LINTER_MODE=warn   # info|warn|error threshold (default: warn)
SDK_PROMPT_LINTER_PROVIDER=auto # auto|openai|anthropic (default: auto)
SDK_PROMPT_LINTER_RULES='{"core/asks-for-chain-of-thought":"error"}' # per-rule overrides
```

Findings are logged as single-line messages:

```
core/missing-output-spec (warn): Extraction implied but no output contract found. Add JSON or field list.
```

### What it checks

- Core
  - Missing action verb at the start (warn)
  - Extraction implied but no output contract (warn)
  - Long content lacks fences/delimiters (warn)
  - Obvious contradictory instructions (warn)
  - Requests chain-of-thought (warn)
  - RAG context but missing guardrails (info)
  - Unescaped placeholders like `{var}` (info)
  - Overlong system prompts (info)
- OpenAI
  - Recommend Structured Outputs when asking for JSON (info)
  - Durable policy belongs in system message (info)
  - Overuse of negative instructions (info)
- Anthropic
  - Recommend simple XML tags for multi-part tasks (info)
  - Avoid requesting detailed chain-of-thought (warn)
  - Put durable policy in system message (info)
  - Fence few-shot examples (info)

### Behavior and guarantees

- Default-off; zero behavior change unless enabled
- Purely local; no network calls; never throws
- Non-blocking: logs to console; use MODE to filter
- Fine-grained overrides via `SDK_PROMPT_LINTER_RULES`

### Rationale and sources

- OpenAI: prompt engineering best practices and structured outputs guidance
- Anthropic: prompting docs and XML structuring guidance


## Examples

See the `/examples` directory for complete working examples:

- Basic prompt building
- Tool integration
- Vercel AI SDK integration
- Multi-provider compilation

## TypeScript Support

Full TypeScript support with comprehensive type definitions for all APIs.

## License

MIT
