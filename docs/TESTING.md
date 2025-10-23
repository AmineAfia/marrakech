# Testing Your Prompts

Test your prompts like you test code. Marrakesh provides a complete testing framework for prompt evaluation with automatic analytics tracking.

## Quick Start

### 1. Create a Prompt File

Use the `.prompt.ts` or `.prompt.js` extension for automatic CLI discovery:

```typescript
// weather.prompt.ts
import { prompt, tool } from '@marrakesh/core'
import { openai } from '@ai-sdk/openai'

export const weatherAgent = prompt('You are a weather assistant')
  .tool(getWeather)
  .test({
    cases: [
      { input: 'Weather in Paris?', expect: { city: 'Paris' } },
      { input: 'Is it raining in Tokyo?', expect: { city: 'Tokyo' } }
    ],
    executors: [
      { model: openai('gpt-4') }
    ]
  })
```

**File Naming Convention:**
- Name your files with `.prompt.ts` or `.prompt.js` extension
- Export your prompt instances (e.g., `export const weatherAgent = ...`)
- The CLI will automatically discover all `*.prompt.{ts,js}` files

### 2. Run Tests

```bash
# Run all tests (automatically finds *.prompt.ts files)
npx @marrakesh/cli test

# Custom pattern (override default)
npx @marrakesh/cli test "src/**/*.ts"

# Watch mode - reruns on changes
npx @marrakesh/cli test --watch

# Stop on first failure
npx @marrakesh/cli test --bail
```

### 3. View Results

Test results are automatically sent to your Marrakesh dashboard where you can:
- View test run history
- Track success rates over time
- Analyze failures
- Compare prompt versions

## API Reference

### `.test(options)`

Add test cases to a prompt with executor configurations.

```typescript
import { openai } from '@ai-sdk/openai'

prompt('You are a helpful assistant')
  .test({
    cases: [
      { input: 'Hello', expect: 'Hi there!' },
      { input: 'Goodbye', expect: 'Farewell!' }
    ],
    executors: [
      { model: openai('gpt-4') },
      { model: openai('gpt-4o') },
      { model: openai('gpt-4-turbo') }
    ]
  })
```

**Parameters:**
- `options.cases`: Array of test cases
  - `input` (string): Input to test
  - `expect` (unknown, optional): Expected output for assertion
  - `name` (string, optional): Test case name
  - `timeout` (number, optional): Timeout in ms (default: 30000)
- `options.executors`: Array of executor configurations
  - `model` (unknown, required): AI SDK model instance (e.g., `openai('gpt-4')`)
  - `maxSteps` (number, optional): Maximum tool calling rounds (default: 5)
  - `timeout` (number, optional): Timeout in ms (default: 30000)
  - `temperature` (number, optional): Generation temperature
  - `maxTokens` (number, optional): Maximum tokens to generate

**Returns:** `PromptWithTests` instance

### Multi-Executor Testing

Run the same tests across multiple models to compare their performance:

```typescript
const myPrompt = prompt('Extract the city name from the user query')
  .test({
    cases: [
      { input: 'Weather in Paris?', expect: { city: 'Paris' } },
      { input: 'Tokyo weather today', expect: { city: 'Tokyo' } }
    ],
    executors: [
      { model: openai('gpt-4') },
      { model: openai('gpt-4o') },
      { model: anthropic('claude-3-5-sonnet-20241022') }
    ]
  })

const results = await myPrompt.run()
// Results include executorResults grouped by model
```

When running tests with multiple executors, the test runner will:
- Execute each test case with **all executors in parallel**
- Display results in a **matrix view** showing pass/fail per executor
- Show which **tools were used** for each test case
- Provide a **summary per executor** with pass rates

### `.eval(input, options)`

Run a single evaluation.

```typescript
import { openai } from '@ai-sdk/openai'

const result = await prompt('Translate to French').eval('Hello', {
  executor: { model: openai('gpt-4') },
  expect: 'Bonjour'
})
```

**Parameters:**
- `input` (string): Input to evaluate
- `options`:
  - `executor` (ExecutorConfig, required): Executor configuration
    - `model` (unknown, required): AI SDK model instance
    - `maxSteps` (number, optional): Maximum tool calling rounds
    - `timeout` (number, optional): Timeout in ms
    - `temperature` (number, optional): Generation temperature
    - `maxTokens` (number, optional): Maximum tokens
  - `expect` (unknown, optional): Expected output
  - `timeout` (number, optional): Timeout in ms

**Returns:** `Promise<EvalResult>`

### `PromptWithTests.run(options?)`

Run all test cases with all configured executors.

```typescript
const results = await weatherAgent.run({
  bail: false
})

// Or override executors at runtime
const results = await weatherAgent.run({
  executors: [
    { model: openai('gpt-4') },
    { model: openai('gpt-4o') }
  ]
})
```

**Parameters:**
- `options`:
  - `bail` (boolean, optional): Stop on first failure (default: false)
  - `executors` (ExecutorConfig[], optional): Override configured executors
  - `onTestStart` (function, optional): Callback when test starts
  - `onTestComplete` (function, optional): Callback when test completes
  - `onProgress` (function, optional): Progress event callback

**Returns:** `Promise<TestResults>`

**TestResults structure:**
```typescript
{
  total: number          // Total tests run (cases × executors)
  passed: number         // Number of passed tests
  failed: number         // Number of failed tests
  duration: number       // Total duration in ms
  results: EvalResult[]  // All individual results
  executorResults?: {    // Results grouped by executor
    [modelName: string]: {
      passed: number
      failed: number
      results: EvalResult[]
    }
  }
}
```

## Executors

Executors handle the actual AI execution with tool calling support.

### Vercel AI SDK Executor

The primary executor for most use cases. Handles multi-step tool calling automatically.

```typescript
import { createVercelAIExecutor } from '@marrakesh/core'
import { openai } from '@ai-sdk/openai'

const executor = createVercelAIExecutor({
  model: openai('gpt-4'),
  maxSteps: 5,        // Max tool calling rounds
  temperature: 0.7,
  maxTokens: 1000,
  timeout: 30000      // Timeout in ms
})
```

### Custom Executors

Create your own executor for custom execution logic:

```typescript
import type { Executor } from '@marrakesh/core'

const customExecutor: Executor = async (prompt, input, config) => {
  // Your custom execution logic
  const result = await yourAIProvider.generate(...)
  
  return {
    output: result.text,
    steps: [],
    finishReason: 'stop',
    usage: result.usage
  }
}
```

## CLI Commands

### `@marrakesh/cli test [pattern]`

Run tests matching the glob pattern. Default: `**/*.prompt.{ts,js}`

```bash
# Test all prompt files (uses default pattern)
npx @marrakesh/cli test

# Test specific directory
npx @marrakesh/cli test "src/prompts/**/*.prompt.ts"

# Custom pattern (override default)
npx @marrakesh/cli test "src/**/*.ts"

# Test with options
npx @marrakesh/cli test --watch
```

**Options:**
- `-w, --watch`: Watch mode
- `--bail`: Stop on first failure

**Pattern Discovery:**
The CLI defaults to `**/*.prompt.{ts,js}` to automatically discover prompt files. You can override this by providing a custom pattern argument.

## Test Patterns

### Basic Assertion

```typescript
.test({
  cases: [
    { input: 'Hello', expect: 'Hi!' }
  ],
  executors: [
    { model: openai('gpt-4') }
  ]
})
```

### Partial Object Matching

```typescript
.test({
  cases: [
    {
      input: 'Create a user',
      expect: { action: 'create', type: 'user' }
      // Other properties in output are ignored
    }
  ],
  executors: [
    { model: openai('gpt-4') }
  ]
})
```

### No Assertion (Just Run)

```typescript
.test({
  cases: [
    { input: 'Hello' }
    // Test passes if execution succeeds
  ],
  executors: [
    { model: openai('gpt-4') }
  ]
})
```

### Named Tests

```typescript
.test({
  cases: [
    {
      input: 'Weather in Paris',
      expect: { city: 'Paris' },
      name: 'Should extract city from query'
    }
  ],
  executors: [
    { model: openai('gpt-4') }
  ]
})
```

### Custom Timeout

```typescript
.test({
  cases: [
    {
      input: 'Complex task',
      timeout: 60000  // 60 seconds
    }
  ],
  executors: [
    { model: openai('gpt-4') }
  ]
})
```

## Testing with Tools

When your prompt uses tools, the executor automatically handles the agentic loop:

```typescript
const agent = prompt('You are a helpful assistant')
  .tool(searchWeb)
  .tool(calculateMath)
  .test({
    cases: [
      {
        input: 'What is 2+2 and show me news about AI',
        // Agent will call calculateMath AND searchWeb
      }
    ],
    executors: [
      { model: openai('gpt-4'), maxSteps: 5 }
    ]
  })
```

The test reporter will show which tools were used for each test case.

The executor:
1. Sends initial prompt + input to LLM
2. Detects tool calls in response
3. Executes tools
4. Sends results back to LLM
5. Repeats until final response or `maxSteps` reached

## Matrix Output Format

When testing with multiple executors, the CLI displays results in a matrix format:

```
📝 weatherAgent

Test Case                          | gpt-4          | gpt-4o         | gpt-4-turbo   
----------------------------------------------------------------------------------
What's the weather in Paris?       | ✅ (1.2s)      | ✅ (0.8s)      | ❌ (1.5s)     
  Tools: getWeather
Is it raining in Tokyo?            | ✅ (1.1s)      | ✅ (0.9s)      | ✅ (1.3s)     
  Tools: getWeather

Executor Summary:
  gpt-4: 2/2 passed (100.0%)
  gpt-4o: 2/2 passed (100.0%)
  gpt-4-turbo: 1/2 passed (50.0%)

✨ All tests passed! 5/6 (83.3%)
   Time: 4.8s
```

This matrix view makes it easy to:
- Compare model performance at a glance
- Identify which models struggle with specific test cases
- See tool usage patterns across different models
- Optimize for cost vs. accuracy by comparing model results

## Analytics Tracking

Test results are automatically tracked and sent to your Marrakesh dashboard:

- **Test Runs**: Every time you run tests, metadata is recorded
- **Test Cases**: Individual test results with pass/fail status
- **Environment Detection**: Automatically detects local, CI, or production
- **Git Integration**: Captures commit hash when available

Disable analytics:
```bash
export MARRAKESH_ANALYTICS_DISABLED=true
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Prompts

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx @marrakesh/cli test
        env:
          MARRAKESH_API_KEY: ${{ secrets.MARRAKESH_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Local Development

```bash
# Run tests in watch mode while developing
npx @marrakesh/cli test --watch

# Press 'a' to run all tests
# Press Ctrl+C to exit
```

## Best Practices

### 1. Use the `.prompt.ts` Convention

```typescript
// src/prompts/weather.prompt.ts
export const weatherAgent = prompt('...')
  .tool(getWeather)
  .test({
    cases: [...],
    executors: [...]
  })
```

This makes your prompts automatically discoverable by the CLI.

### 2. Use Descriptive Test Names

```typescript
.test([
  {
    input: 'Paris weather',
    expect: { city: 'Paris' },
    name: 'Should extract city from natural language query'
  }
])
```

### 3. Test Edge Cases

```typescript
.test([
  { input: 'Normal case', expect: {...} },
  { input: '', expect: {...} },  // Empty input
  { input: 'Very long input...', expect: {...} },  // Long input
  { input: '日本語', expect: {...} }  // Non-English
])
```

### 4. Use Partial Matching

```typescript
// Don't test exact output - too brittle
expect: "Hello! How can I help you today?"  ❌

// Test key properties only
expect: { hasGreeting: true, tone: 'friendly' }  ✅
```

### 5. Set Appropriate Timeouts

```typescript
.test([
  {
    input: 'Quick task',
    timeout: 5000  // 5 seconds
  },
  {
    input: 'Complex multi-step task',
    timeout: 60000  // 60 seconds
  }
])
```

## Troubleshooting

### Tests Not Found

Make sure your files export `PromptWithTests` instances:

```typescript
export const myAgent = prompt('...').test([...])
//     ^^^^^^ Must be exported
```

### Executor Errors

Ensure you have the required dependencies:

```bash
npm install ai @ai-sdk/openai
```

### Timeout Errors

Increase timeout for slow operations:

```typescript
.test([{ input: '...', timeout: 60000 }])
```

Or configure executor timeout:

```typescript
createVercelAIExecutor({
  model: openai('gpt-4'),
  timeout: 60000
})
```

## Next Steps

- [View Analytics Dashboard](https://marrakesh.dev/dashboard)
- [API Reference](./README.md)
- [Examples](../examples/)

