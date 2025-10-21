# Marrakesh SDK

Type-safe tool integration for LLMs.

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

```typescript
import { prompt, tool } from '@marrakesh/core';
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

## AI SDK Integration

The SDK is fully compatible with both AI SDK v4 and v5, supporting both simple `CoreMessage` and complex `ModelMessage` types:

### AI SDK Compatibility

Marrakesh SDK is compatible with both AI SDK v4 and v5:

- **v4**: Uses `parameters` for tool definitions
- **v5**: Uses `inputSchema` for tool definitions

Our SDK automatically provides both properties, so you can use either version without any changes to your code.

### Tool Results

Tool results must use the structured `LanguageModelV3ToolResultOutput` format:

- **Text**: `{ type: 'text', value: 'result string' }`
- **JSON**: `{ type: 'json', value: { ... } }`
- **Error**: `{ type: 'error-text', value: 'error message' }`
- **Complex**: `{ type: 'content', value: [...] }` for mixed text and media

```typescript
import { convertToModelMessages } from 'ai';
import { prompt } from '@marrakesh/core';

// Works with convertToModelMessages output
const p = prompt('You are a helpful assistant').tool(myTool);

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Pass ModelMessage[] directly from convertToModelMessages
  return streamText({
    model: openai('gpt-4'),
    ...p.toVercelAI(convertToModelMessages(messages))
  });
}
```

### Message Types

The SDK supports both message formats:

**Simple messages (CoreMessage):**
```typescript
const simpleMessages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' }
];
```

**Complex messages (ModelMessage):**
```typescript
const complexMessages = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Look at this image:' },
      { type: 'image', image: 'data:image/png;base64,...' }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'I can see the image!' },
      { 
        type: 'tool-call', 
        toolCallId: 'call_123', 
        toolName: 'analyzeImage', 
        args: { image: 'data:image/png;base64,...' } 
      }
    ]
  }
];
```

Both formats work seamlessly with all SDK methods:
- `toVercelAI(messages)` - Works with both CoreMessage[] and ModelMessage[]
- `toOpenAI(messages)` - Works with both CoreMessage[] and ModelMessage[]
- `toAnthropic()` - No messages parameter needed

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

### `.tools(tools: ToolFunction[])`

Add multiple tools from an array.

```typescript
const myTools = [getWeather, getLocation];
p.tools(myTools);
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

Set the `MARRAKESH_API_KEY` environment variable:

```bash
export MARRAKESH_API_KEY="your-api-key-here"
```

Once set, analytics will automatically start tracking without any code changes.

### What's Tracked

- **Prompt Metadata**: Content, tools, and version information
- **Prompt Executions**: When prompts are compiled and used  
- **Tool Calls**: When tools are executed (Vercel AI SDK integration only)

### Privacy & Opt-out

- All data is sent securely to Marrakesh's analytics endpoint
- No sensitive information is collected
- Disable anytime: `MARRAKESH_ANALYTICS_DISABLED=true`
- Debug mode: `MARRAKESH_DEBUG=true` to see what data is being sent

For detailed information, see [Analytics Documentation](docs/ANALYTICS.md).

## Testing Your Prompts

Test your prompts like you test code. Marrakesh provides a complete testing framework with CLI support and automatic analytics tracking.

### Quick Example

```typescript
import { prompt, createVercelAIExecutor } from '@marrakesh/core'
import { openai } from '@ai-sdk/openai'

const weatherAgent = prompt('You are a weather assistant')
  .tool(getWeather)
  .test([
    { input: 'Weather in Paris?', expect: { city: 'Paris' } },
    { input: 'Is it raining in Tokyo?', expect: { city: 'Tokyo' } }
  ])

// Run tests
const results = await weatherAgent.run({
  executor: createVercelAIExecutor({ model: openai('gpt-4') })
})

console.log(`${results.passed}/${results.total} tests passed`)
```

### CLI Usage

```bash
# Run tests
npx @marrakesh/cli test

# Watch mode - reruns on file changes
npx @marrakesh/cli test --watch

# Stop on first failure
npx @marrakesh/cli test --bail
```

### Features

- **🧪 Test Cases**: Define test cases with expected outputs
- **🔄 Watch Mode**: Auto-rerun tests on file changes
- **🤖 Agentic Support**: Handles multi-step tool calling automatically
- **📊 Analytics**: Test results automatically tracked to dashboard
- **✅ Assertions**: Deep equality matching with partial object support

For complete documentation, see [Testing Guide](docs/TESTING.md).

## Migration from v4.0 to v5.0

If you're upgrading from an earlier version, note that the SDK now uses AI SDK v5.0 naming conventions:

- `ToolCallPart.args` → `ToolCallPart.input`
- `ToolResultPart.result` → `ToolResultPart.output`

This ensures full compatibility with `convertToModelMessages()` output.

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