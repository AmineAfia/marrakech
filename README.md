# Marrakech SDK

Type-safe tool integration for LLMs.

## Installation

```bash
npm install marrakech-sdk zod
```

## Quick Start

```typescript
import { prompt, tool } from 'marrakech-sdk';
import { z } from 'zod';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Define a tool with Zod schema
const getWeather = tool({
  description: 'Get weather for a location',
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius')
  })
});

// Create prompt with tools and structured output
const p = prompt('You are a helpful weather assistant')
  .tool(getWeather)
  .output(z.object({
    temperature: z.number(),
    conditions: z.string()
  }));

// Use with Vercel AI SDK
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  return streamText({
    model: openai('gpt-4'),
    ...p.toVercelAI(messages)
  });
}
```

## How It Works

The SDK keeps your system prompt clean by handling tools and structured output separately:

### System Prompt Examples

**Your code:**
```typescript
const p = prompt('You are a helpful weather assistant')
  .tool(getWeather)
  .output(z.object({
    temperature: z.number(),
    conditions: z.string()
  }));
```

**Vercel AI SDK / OpenAI:**
- System prompt: `"You are a helpful weather assistant"`
- Tools: Passed as separate `tools` parameter (Record format with `inputSchema`)
- Response format: Passed as `responseFormat` parameter

**Anthropic:**
- System prompt: 
```
You are a helpful weather assistant

<output_format>
Respond with valid JSON matching this schema:
{
  "type": "object",
  "properties": {
    "temperature": { "type": "number" },
    "conditions": { "type": "string" }
  },
  "required": ["temperature", "conditions"]
}
</output_format>
```

The key insight: **your system prompt stays clean and focused on behavior**, while technical details (tools, schemas) are handled by the API integration layer.

## API Reference

### `prompt(systemPrompt?: string)`

Create a new prompt builder.

```typescript
const p = prompt('You are a helpful assistant');
```

### `.system(text: string)`

Add system instructions.

```typescript
p.system('Always be polite');
```

### `.tool(...tools: ToolFunction[])`

Add tools with Zod schemas.

```typescript
p.tool(getWeather, getLocation);
```

### `.output(schema: z.ZodType)`

Set structured JSON output.

```typescript
p.output(z.object({
  answer: z.string(),
  confidence: z.number()
}));
```

### `.toVercelAI(messages?: CoreMessage[])`

Convert to Vercel AI SDK format.

```typescript
const { messages, tools, responseFormat } = p.toVercelAI();
```

### `.toOpenAI(messages?: CoreMessage[])`

Convert to OpenAI format.

```typescript
const { messages, tools, response_format } = p.toOpenAI();
```

### `.toAnthropic()`

Convert to Anthropic format.

```typescript
const { system, tools } = p.toAnthropic();
```

## Analytics

The SDK includes optional analytics tracking to help you understand how your prompts and tools are being used. Analytics are completely opt-in and designed to have zero impact on your application's performance.

### Activation

Set the `MARRAKECH_API_KEY` environment variable:

```bash
export MARRAKECH_API_KEY="your-api-key-here"
```

Once set, analytics will automatically start tracking without any code changes.

### What's Tracked

- **Prompt Metadata**: Content, tools, and version information
- **Prompt Executions**: When prompts are compiled and used  
- **Tool Calls**: When tools are executed (Vercel AI SDK integration only)

### Privacy & Opt-out

- All data is sent securely to Marrakech's analytics endpoint
- No sensitive information is collected
- Disable anytime: `MARRAKECH_ANALYTICS_DISABLED=true`
- Debug mode: `MARRAKECH_DEBUG=true` to see what data is being sent

For detailed information, see [Analytics Documentation](docs/ANALYTICS.md).

## Examples

- **[Basic Usage](examples/basic-usage.ts)** - Simple prompt building
- **[Tool Integration](examples/tool-integration.ts)** - Tools with Zod schemas  
- **[Vercel AI SDK](examples/vercel-integration.ts)** - Full integration example

## Development

```bash
# Install dependencies
pnpm install

# Start development
turbo dev

# Build all packages
turbo build

# Run tests
turbo test
```