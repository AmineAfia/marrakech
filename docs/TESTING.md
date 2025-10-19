# Testing Your Prompts

Test your prompts like you test code. Marrakech provides a complete testing framework for prompt evaluation with automatic analytics tracking.

## Quick Start

### 1. Add Tests to Your Prompts

```typescript
import { prompt, tool, createVercelAIExecutor } from 'marrakech-sdk'
import { openai } from '@ai-sdk/openai'

const weatherAgent = prompt('You are a weather assistant')
  .tool(getWeather)
  .test([
    { input: 'Weather in Paris?', expect: { city: 'Paris' } },
    { input: 'Is it raining in Tokyo?', expect: { city: 'Tokyo' } }
  ])
```

### 2. Run Tests

```bash
# Run tests once
npx marrakech test

# Watch mode - reruns on changes
npx marrakech test --watch

# Stop on first failure
npx marrakech test --bail
```

### 3. View Results

Test results are automatically sent to your Marrakech dashboard where you can:
- View test run history
- Track success rates over time
- Analyze failures
- Compare prompt versions

## API Reference

### `.test(cases, executor?)`

Add test cases to a prompt.

```typescript
prompt('You are a helpful assistant')
  .test(
    [
      { input: 'Hello', expect: 'Hi there!' },
      { input: 'Goodbye', expect: 'Farewell!' }
    ],
    createVercelAIExecutor({ model: openai('gpt-4') })
  )
```

**Parameters:**
- `cases`: Array of test cases
  - `input` (string): Input to test
  - `expect` (unknown, optional): Expected output for assertion
  - `name` (string, optional): Test case name
  - `timeout` (number, optional): Timeout in ms (default: 30000)
- `executor` (Executor, optional): Default executor for running tests

**Returns:** `PromptWithTests` instance

### `.eval(input, options)`

Run a single evaluation.

```typescript
const result = await prompt('Translate to French').eval('Hello', {
  executor: createVercelAIExecutor({ model: openai('gpt-4') }),
  expect: 'Bonjour'
})
```

**Parameters:**
- `input` (string): Input to evaluate
- `options`:
  - `executor` (Executor, required): Executor to use
  - `expect` (unknown, optional): Expected output
  - `timeout` (number, optional): Timeout in ms

**Returns:** `Promise<EvalResult>`

### `PromptWithTests.run(options?)`

Run all test cases.

```typescript
const results = await weatherAgent.run({
  executor: createVercelAIExecutor({ model: openai('gpt-4') }),
  concurrency: 5,
  bail: false
})
```

**Parameters:**
- `options`:
  - `executor` (Executor, optional): Overrides default executor
  - `concurrency` (number, optional): Number of parallel tests (default: 1)
  - `bail` (boolean, optional): Stop on first failure (default: false)

**Returns:** `Promise<TestResults>`

## Executors

Executors handle the actual AI execution with tool calling support.

### Vercel AI SDK Executor

The primary executor for most use cases. Handles multi-step tool calling automatically.

```typescript
import { createVercelAIExecutor } from 'marrakech-sdk'
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
import type { Executor } from 'marrakech-sdk'

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

### `marrakech test [pattern]`

Run tests matching the glob pattern.

```bash
# Test all files
npx marrakech test

# Test specific directory
npx marrakech test "src/prompts/**/*.ts"

# Test with options
npx marrakech test --watch --concurrency 10
```

**Options:**
- `-w, --watch`: Watch mode
- `--bail`: Stop on first failure
- `-c, --concurrency <n>`: Number of parallel tests (default: 5)

## Test Patterns

### Basic Assertion

```typescript
.test([
  { input: 'Hello', expect: 'Hi!' }
])
```

### Partial Object Matching

```typescript
.test([
  {
    input: 'Create a user',
    expect: { action: 'create', type: 'user' }
    // Other properties in output are ignored
  }
])
```

### No Assertion (Just Run)

```typescript
.test([
  { input: 'Hello' }
  // Test passes if execution succeeds
])
```

### Named Tests

```typescript
.test([
  {
    input: 'Weather in Paris',
    expect: { city: 'Paris' },
    name: 'Should extract city from query'
  }
])
```

### Custom Timeout

```typescript
.test([
  {
    input: 'Complex task',
    timeout: 60000  // 60 seconds
  }
])
```

## Testing with Tools

When your prompt uses tools, the executor automatically handles the agentic loop:

```typescript
const agent = prompt('You are a helpful assistant')
  .tool(searchWeb)
  .tool(calculateMath)
  .test([
    {
      input: 'What is 2+2 and show me news about AI',
      // Agent will call calculateMath AND searchWeb
    }
  ])
```

The executor:
1. Sends initial prompt + input to LLM
2. Detects tool calls in response
3. Executes tools
4. Sends results back to LLM
5. Repeats until final response or `maxSteps` reached

## Analytics Tracking

Test results are automatically tracked and sent to your Marrakech dashboard:

- **Test Runs**: Every time you run tests, metadata is recorded
- **Test Cases**: Individual test results with pass/fail status
- **Environment Detection**: Automatically detects local, CI, or production
- **Git Integration**: Captures commit hash when available

Disable analytics:
```bash
export MARRAKECH_ANALYTICS_DISABLED=true
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
      - run: npx marrakech test
        env:
          MARRAKECH_API_KEY: ${{ secrets.MARRAKECH_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Local Development

```bash
# Run tests in watch mode while developing
npx marrakech test --watch

# Press 'a' to run all tests
# Press Ctrl+C to exit
```

## Best Practices

### 1. Co-locate Tests with Prompts

```typescript
// src/prompts/weather.ts
export const weatherAgent = prompt('...')
  .tool(getWeather)
  .test([...])
```

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

