# Marrakesh CLI

Test your prompts like you test code.

## Installation

```bash
# Global install
npm install -g @marrakesh/cli

# Or use via npx
npx @marrakesh/cli test
```

## Commands

### `@marrakesh/cli test [pattern]`

Run tests matching the glob pattern.

```bash
# Test all files
npx @marrakesh/cli test

# Test specific directory
npx @marrakesh/cli test "src/prompts/**/*.ts"

# Watch mode
npx @marrakesh/cli test --watch

# Stop on first failure
npx @marrakesh/cli test --bail

```

**Options:**

- `-w, --watch`: Watch mode - rerun tests on file changes
- `--bail`: Stop on first failure

## Usage

### 1. Define Tests in Your Code

```typescript
// src/prompts/weather.ts
import { prompt, tool, createVercelAIExecutor } from '@marrakesh/core'
import { openai } from '@ai-sdk/openai'

export const weatherAgent = prompt('You are a weather assistant')
  .tool(getWeather)
  .test([
    { input: 'Weather in Paris?', expect: { city: 'Paris' } },
    { input: 'Is it raining in Tokyo?', expect: { city: 'Tokyo' } }
  ])
```

### 2. Run Tests

```bash
npx @marrakesh/cli test
```

Output:

```
🧪 Running tests...

📝 weatherAgent
  ✅ Weather in Paris? (243ms)
  ✅ Is it raining in Tokyo? (312ms)
  2/2 passed (100.0%) in 555ms

✨ All tests passed! 2/2 (100.0%)
   Time: 555ms
```

### 3. Watch Mode

```bash
npx @marrakesh/cli test --watch
```

Press `a` to run all tests, `Ctrl+C` to exit.

## Environment Variables

- `MARRAKESH_API_KEY`: Your Marrakesh API key for analytics tracking
- `MARRAKESH_ANALYTICS_DISABLED`: Set to `true` to disable analytics
- `MARRAKESH_DEBUG`: Set to `true` to enable debug logging

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
```

## Documentation

For complete documentation, see:

- [Testing Guide](../../docs/TESTING.md)
- [Main README](../../README.md)

## License

MIT

