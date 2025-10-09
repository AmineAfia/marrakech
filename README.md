# promptsystem
## 1. Core Mission
To transform prompt engineering from a craft into a structured, testable, and data-driven discipline. We will provide developers with a code-first SDK that makes building, managing, and optimizing system prompts as rigorous and professional as the rest of their software stack.

## 2. Target Audience (MVP)
TypeScript/JavaScript developers building modern, full-stack AI applications, starting within the Next.js / Vercel ecosystem.

## 3. Core Design Principles
- Developer-Native: The primary interface is code. The SDK must feel like a natural, idiomatic part of the TypeScript ecosystem.
- Code as the Source of Truth: The prompt's definition lives in the developer's codebase, enabling version control with Git and integration into existing CI/CD workflows.
- Progressive Enhancement: The local SDK must be incredibly useful on its own. The cloud service (analytics, evals) will be a powerful, optional layer on top.

# MVP SDK Functionalities (npm install system-prompt)
This is the lean, local-first version you can ship in the coming days. It has no backend dependency.

## A. The PromptBuilder Class
The fluent, chainable interface for constructing a prompt object.

- new PromptBuilder({ name: string })
  - Initializes a new prompt. The name is crucial for future analytics.
- .withPersona(string)
  - Adds the core persona/instruction block.
- .withRule(string)
  - Adds a single rule. Can be called multiple times.
- .withExample({ user: string, assistant: string })
  - Adds a few-shot example to guide the model.

## B. The Killer Feature: TypeScript-Native Tool Integration
- .withTool({ name: string, description: string, schema: ZodSchema })
  - This is the core MVP "wow" feature.
  - It accepts a zod schema directly.
  - Internally, it introspects the Zod schema and generates the precise JSON schema that LLMs like GPT and Claude require for function calling/tool use. This saves developers an enormous amount of tedious, error-prone work.

## C. The Compiler & Linter
- .compile(): string
  - Takes all the structured parts and returns a single, perfectly formatted string ready for the LLM API.
  - Built-in Linter: On compile, it should run a few basic, high-value checks and console.warn if issues are found:
    - Token Count: Warn if the compiled prompt is excessively long.
    - Tool Description Check: Warn if a tool is added with an empty or very short description.

## D. Vercel AI SDK Compatibility (The "Growth Hack")
- .compile(): string
  - Returns the compiled system prompt as a string, ready to be used with any LLM API.
- .prepareMessages(conversationMessages: Message[]): Message[]
  - Takes conversation messages and returns a properly formatted messages array with the system prompt prepended.
  - Works seamlessly with Vercel AI SDK's existing streaming patterns.
  - This makes adoption for the target audience almost frictionless while maintaining full SDK compatibility.

## How it All Comes Together (MVP Example)

```typescript
// in app/api/chat/route.ts
import { PromptBuilder } from 'system-prompt';
import { z } from 'zod';
import { openai } from './lib/openai';
import { streamText } from 'ai';

// 1. Define your tool's schema with Zod
const GetUserDetailsSchema = z.object({
  userId: z.string().describe("The ID of the user to fetch."),
});

// 2. Build your prompt using the fluent, typed SDK
const prompt = new PromptBuilder({ name: 'customer-support-agent-v1' })
  .withPersona("You are a helpful and friendly support agent.")
  .withRule("Never admit you are an AI.")
  .withTool({
    name: "getUserDetails",
    description: "Fetches a user's account details from the database.",
    schema: GetUserDetailsSchema,
  });

// 3. Use with Vercel AI SDK's streaming
export async function POST(req: Request) {
  const { messages } = await req.json();

  // Prepare messages with system prompt
  const messagesWithSystem = prompt.prepareMessages(messages);

  // Use Vercel AI SDK's streaming with your prepared messages
  return streamText({
    model: openai('gpt-4'),
    messages: messagesWithSystem,
  });
}
```

This MVP provides immediate, tangible value by cleaning up code, automating schema generation, and simplifying a common workflow, all while living entirely within the developer's local project. It is the perfect foundation to build the cloud-based analytics and eval features upon later.

---

## Installation

```bash
npm i -D system-prompt
# or just use npx in the CLI commands below
```

## Quickstart

### Option A: You already have a system prompt string

```typescript
// prompts/support.prompt.ts
export const systemPrompt = `
You are a helpful customer service agent.
Always be polite and professional.
If you don't know something, say so.
`;
```

### Option B: Use the PromptBuilder

```typescript
// prompts/support.prompt.ts
import { PromptBuilder } from 'system-prompt';

export const prompt = new PromptBuilder({ name: 'customer-support' })
  .withPersona('You are a helpful customer service agent.')
  .withRule('Always be polite and professional.')
  .withRule("If you don't know something, say so.");
```

### Runtime (production) with Vercel AI SDK

Use your compiled prompt with Vercel's streaming. Do not run analysis/optimization at runtime.

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@/lib/openai';
import { prompt } from '@/prompts/support.prompt';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const system = typeof prompt?.compile === 'function'
    ? prompt.compile()
    : String(prompt); // fallback if you exported a raw string

  const messagesWithSystem = prompt.prepareMessages(messages);

  return streamText({
    model: openai('gpt-4o'),
    messages: messagesWithSystem
  });
}
```

## CLI Workflows (local and CI)

- Analysis (instant feedback on an existing prompt)

```bash
npx system-prompt analyze prompts/support.prompt.ts \
  --report reports/support.analysis.json
```

- Generate few-shot examples from your dataset

```bash
npx system-prompt examples \
  --dataset data/support.json \
  --count 5 \
  --out prompts/support.examples.json
```

- Optimize your prompt against your dataset

```bash
npx system-prompt optimize prompts/support.prompt.ts \
  --dataset data/support.json \
  --metrics accuracy \
  --budget 50 \
  --out prompts/support.optimized.ts \
  --report reports/support.optimization.json
```

- Evaluate prompt performance

```bash
npx system-prompt eval prompts/support.optimized.ts \
  --dataset data/support.json \
  --metrics accuracy \
  --report reports/support.eval.json
```

- CI guardrail (fail on regression)

```bash
npx system-prompt ci-check \
  --dataset data/support.json \
  --prompt prompts/support.optimized.ts \
  --baseline reports/support.eval.baseline.json \
  --assert "accuracy>=0.85" \
  --report reports/support.eval.ci.json
```

Optionally update your baseline (intentional improvement):

```bash
npx system-prompt ci-update-baseline \
  --from reports/support.eval.ci.json \
  --to reports/support.eval.baseline.json
```

## Recommended Project Structure

```
prompts/
  support.prompt.ts          # string or PromptBuilder
  support.examples.json      # auto-generated few-shots (optional)
  support.optimized.ts       # auto-generated best prompt (optional)
data/
  support.json               # eval/optimization dataset
reports/
  support.analysis.json
  support.optimization.json
  support.eval.json
  support.eval.baseline.json
system-prompt.config.ts      # models, metrics, budgets, embeddings
```

## Configuration (system-prompt.config.ts)

```typescript
// system-prompt.config.ts
import { accuracyMetric } from 'system-prompt/metrics';
import { vercelModelCaller } from 'system-prompt/adapters/vercel';

export default {
  model: vercelModelCaller({ provider: 'openai', model: 'gpt-4o-mini' }),
  metrics: [accuracyMetric()],
  embeddings: null, // or inject an embedder adapter for semantic selection
  budgets: {
    optimize: { maxIterations: 5, candidatesPerIter: 4 }
  }
};
```

## API Reference (brief)

### PromptBuilder
- `new PromptBuilder({ name: string })`
- `.withPersona(string)`
- `.withRule(string)`
- `.withExample({ user: string, assistant: string })`
- `.withTool({ name: string, description: string, schema: ZodSchema })`
- `.compile(): string`
- `.prepareMessages(conversationMessages: Message[]): Message[]`

### Analyzer / Examples / Evaluator / Optimizer

```typescript
// Analyze an existing prompt string
analyzePrompt(prompt: string): AnalysisReport

// Curate few-shot examples from your data
generateFewShotExamples(
  data: DatasetExample[],
  opts: { count: number; task?: string; embed?: Embedder }
): Array<{ user: string; assistant: string }>

// Evaluate a prompt against a dataset
evaluatePrompt(
  systemPrompt: string,
  dataset: DatasetExample[],
  model: ModelCaller,
  metrics: Metric[]
): Promise<{ aggregate: number; perExample: Array<{ id: number; score: number }> }>

// Optimize a prompt with a small search over candidates
optimizePrompt(
  basePrompt: string,
  opts: {
    dataset: DatasetExample[];
    model: ModelCaller;
    metrics: Metric[];
    embed?: Embedder;
    maxIterations?: number;
    candidatesPerIter?: number;
  }
): Promise<{ prompt: string; report: OptimizationReport }>
```

### Core Types

```typescript
type ModelCaller = (args: {
  messages: Array<{ role: 'system'|'user'|'assistant', content: string }>;
}) => Promise<{ output: string }>;

type DatasetExample = {
  input: string;
  idealOutput?: string;
  context?: string;
  tags?: string[];
};

type Metric = (args: {
  input: string; output: string; idealOutput?: string; context?: string;
}) => number; // 0..1

type OptimizationReport = {
  baselineScore: number;
  bestScore: number;
  iterations: number;
  changes: string[];
  chosenExamples?: Array<{ user: string; assistant: string }>;
};

type AnalysisReport = {
  issues: Array<{ ruleId: string; severity: 'info'|'warn'|'error'; message: string }>;
  score: number; // 0..10
  suggestions: string[];
};
```

## Implementation Overview

- **PromptAnalyzer**: Heuristics and token checks; returns issues, score, suggestions.
- **ExampleGenerator**: Selects diverse, high-signal few-shots via embeddings/MMR (fallback to lexical).
- **PromptEvaluator**: Runs your `ModelCaller` across a dataset and computes metrics.
- **PromptOptimizer**: Iteratively generates candidates (persona/rules/examples tweaks), evaluates, and selects the best under a small budget.
- **Vercel Integration**: Keep streaming as-is; only prepare messages and compile prompts. All heavy work (analyze/examples/optimize/eval) runs locally or in CI via the CLI.

## When to Run What

- **Local dev / CI**: `analyze`, `examples`, `optimize`, `eval`, `ci-check`, `ci-update-baseline`.
- **Runtime (production)**: only `compile()` and `prepareMessages()` with Vercel AI SDK.

---

## Prompt Analysis

The `analyzePrompt()` function provides instant feedback on system prompts through static checks and scoring:

### Key Checks
- Role/persona specificity and clarity
- Task objective and constraints
- Output format requirements
- Few-shot example quality
- Tool usage consistency  
- Safety guardrails
- Language clarity
- Token budget

### Scoring
Returns a 0-10 score based on weighted criteria like persona (1), objectives (1), constraints (2), examples (2), tools (1), safety (1), and clarity (2).

### Output
Returns an `AnalysisReport` with:
- Issues found (rule ID, severity, message)
- Overall score
- Actionable suggestions for improvement

Can optionally run LLM-assisted critique and micro-eval with provided dataset and model caller.

See [Prompt Analysis Design](docs/analyzePrompt.md) for full details.
