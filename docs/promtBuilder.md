# PromptBuilder SDK Implementation

## Architecture

### Modular Package Structure

```
packages/
  core/              # @system-prompt/core
  cli/               # @system-prompt/cli
  analyze/           # @system-prompt/analyze (future)
  optimize/          # @system-prompt/optimize (future)
```

## Implementation Plan

### 1. Project Setup & Turborepo Configuration

**Create workspace structure:**

- Initialize pnpm workspace with `pnpm-workspace.yaml`
- Setup Turborepo with `turbo.json` for build orchestration
- Setup TypeScript with shared `tsconfig.base.json`
- Configure tsup for bundling each package (ESM + CJS)
- Setup package.json for each module with proper exports for npm publishing
- Configure Zod as peer dependency (users provide their own version)

**Turborepo Configuration (`turbo.json`):**

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {}
  }
}
```

**Library Packaging Configuration:**

Each package must be properly configured for npm publishing:

`packages/core/package.json`:

```json
{
  "name": "@system-prompt/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "peerDependencies": {
    "zod": "^3.0.0"
  },
  "sideEffects": false
}
```

`packages/core/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false
});
```

**Key Library Requirements:**

- Dual ESM + CJS builds for maximum compatibility
- TypeScript declaration files (.d.ts) generated
- Tree-shakeable (sideEffects: false)
- Zod as peer dependency (users install their own version)
- Minimal bundle size (no bundled dependencies)
- Source maps for debugging
- Only ship `dist/` folder to npm

**Files to create:**

- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `package.json` (root, private: true)
- `packages/core/package.json` (publishable config above)
- `packages/core/tsconfig.json`
- `packages/core/tsup.config.ts` (build config above)
- `.npmignore` or use `files` field in package.json

### 2. Core Package (@system-prompt/core)

**AI SDK-Style Tool Pattern** (`packages/core/src/tools/tool.ts`)

```typescript
// Tool helper - similar to AI SDK's tool() function
export function tool<TParameters extends z.ZodType>(config: {
  description: string;
  parameters: TParameters;
  execute?: (params: z.infer<TParameters>) => Promise<any>;
}) {
  const toolFn = config.execute || (async () => {});
  
  // Attach metadata to function (AI SDK pattern)
  toolFn.description = config.description;
  toolFn.parameters = config.parameters;
  
  return toolFn;
}

// Type for tool functions
export type ToolFunction = {
  description: string;
  parameters: z.ZodType;
  (...args: any[]): any;
};
```

**PromptBuilder Class** (`packages/core/src/PromptBuilder.ts`)

```typescript
export class PromptBuilder {
  constructor({ name: string })
  withPersona(text: string): this
  withRule(text: string): this
  withExample({ user, assistant }): this
  withTool(toolFunction: ToolFunction): this  // AI SDK pattern!
  compile(provider?: 'openai' | 'anthropic' | 'generic'): string | CompileResult
  prepareMessages(messages: Message[]): Message[]
  prepareMessages<T extends CoreMessage>(messages: T[]): T[]
}
```

**Key Changes:**

- `withTool()` accepts a tool function with metadata attached (AI SDK pattern)
- Extracts `description` and `parameters` from the function object
- Internally converts Zod schema to JSON Schema

**Zod Schema Converter** (`packages/core/src/schema/zodToJsonSchema.ts`)

- Convert Zod schemas to JSON Schema for OpenAI/Anthropic tools
- Handle primitives, objects, arrays, unions, optionals, descriptions
- Extract descriptions from `.describe()` calls
- Generate required fields list

**Provider Compilers** (`packages/core/src/compilers/`)

- `GenericCompiler.ts` - Simple markdown format
- `OpenAICompiler.ts` - OpenAI-optimized format (returns tools array separately)
- `AnthropicCompiler.ts` - Claude-optimized format with XML structure
- `CompilerFactory.ts` - Factory to select compiler

**Type Definitions** (`packages/core/src/types.ts`)

```typescript
// Generic Message type (no external dependencies)
export interface CoreMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Compile result for OpenAI (includes tools separately)
export interface CompileResult {
  systemPrompt: string;
  tools?: Array<{ name: string; description: string; parameters: object }>;
}
```

### 3. Built-in Linter

**Linter** (`packages/core/src/linter/PromptLinter.ts`)

- Token counter (using tiktoken or fallback estimation)
- Check for empty/short tool descriptions
- Warn if persona is missing
- Check for excessive prompt length (>4000 tokens warning)
- Runs automatically on `compile()`

### 4. Provider-Specific Compilation

**Generic Format** (returns string):

```
You are [persona].

Rules:
- [rule 1]
- [rule 2]

Examples:
User: [example user input]
Assistant: [example output]

Tools: [list of tools if any]
```

**OpenAI Format** (returns `CompileResult`):

- System prompt without tools
- Tools as separate array in result object
- Compatible with OpenAI's tools parameter

**Anthropic Format** (returns string with XML):

- XML-tagged sections for better parsing
- `<persona>`, `<rules>`, `<examples>` tags
- Tools formatted per Anthropic spec

### 5. Vercel AI SDK Integration

**Dual Message Support:**

```typescript
// Pattern 1: Generic (no Vercel dependency)
import { PromptBuilder } from '@system-prompt/core';
const messages = prompt.prepareMessages(conversationMsgs);

// Pattern 2: Vercel-specific (with type safety)
import type { Message } from 'ai';
const messages: Message[] = prompt.prepareMessages(vercelMessages);
```

**prepareMessages Implementation:**

- Detect if system message already exists
- Prepend compiled system prompt as first message
- Preserve all other messages unchanged
- Type-safe overloads for both patterns

### 6. Example Usage (Documentation)

**Defining Tools (AI SDK Style):**

```typescript
import { tool } from '@system-prompt/core';
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
```

**Using PromptBuilder:**

```typescript
import { PromptBuilder } from '@system-prompt/core';

const prompt = new PromptBuilder({ name: 'support-agent' })
  .withPersona('You are a helpful customer service agent')
  .withRule('Always be polite and professional')
  .withTool(getUserDetails); // Pass tool function reference!

// Generic compilation
const systemPrompt = prompt.compile();

// OpenAI-specific compilation (gets tools separately)
const { systemPrompt, tools } = prompt.compile('openai');
```

**Vercel AI SDK Integration:**

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = prompt.compile('openai');
  const messagesWithSystem = prompt.prepareMessages(messages);
  
  return streamText({
    model: openai('gpt-4'),
    messages: messagesWithSystem,
    tools: result.tools // If using OpenAI format
  });
}
```

### 7. Testing Strategy

**Unit Tests (Vitest):**

- PromptBuilder method chaining
- Tool metadata extraction
- Zod schema conversion edge cases
- Provider-specific compilation outputs
- Message preparation logic
- Linter warnings

**Integration Tests:**

- Full workflow with Vercel AI SDK mock
- Multiple tools with complex schemas
- All provider formats

### 8. Build & Development

**Turborepo Commands:**

```bash
# Install dependencies
pnpm install

# Build all packages
turbo build

# Development mode
turbo dev

# Run tests
turbo test

# Lint all packages
turbo lint
```

### 9. Documentation

**Create:**

- `packages/core/README.md` - API reference
- `docs/getting-started.md` - Quick start guide
- `docs/tools.md` - AI SDK-style tool pattern guide
- `docs/vercel-integration.md` - Vercel AI SDK patterns
- `docs/provider-formats.md` - Provider compilation details
- `examples/` directory with working examples

## File Structure

```
/
  turbo.json
  pnpm-workspace.yaml
  tsconfig.base.json
  package.json
  packages/
    core/
      src/
        PromptBuilder.ts
        types.ts
        index.ts
        tools/
          tool.ts
          types.ts
        schema/
          zodToJsonSchema.ts
        compilers/
          GenericCompiler.ts
          OpenAICompiler.ts
          AnthropicCompiler.ts
          CompilerFactory.ts
        linter/
          PromptLinter.ts
          tokenCounter.ts
      tests/
        PromptBuilder.test.ts
        tool.test.ts
        zodToJsonSchema.test.ts
        compilers.test.ts
      package.json
      tsconfig.json
      tsup.config.ts
      README.md
```