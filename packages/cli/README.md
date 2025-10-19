# Marrakech CLI

Test your prompts like you test code.

## Installation

```bash
npm install -g marrakech
```

Or use via npx:

```bash
npx marrakech test
```

## Commands

### `marrakech test [pattern]`

Run tests matching the glob pattern.

```bash
# Test all files
npx marrakech test

# Test specific directory
npx marrakech test "src/prompts/**/*.ts"

# Watch mode
npx marrakech test --watch

# Stop on first failure
npx marrakech test --bail

# Run tests in parallel
npx marrakech test --concurrency 10
```

**Options:**

- `-w, --watch`: Watch mode - rerun tests on file changes
- `--bail`: Stop on first failure
- `-c, --concurrency <n>`: Number of parallel tests (default: 5)

## Usage

### 1. Define Tests in Your Code

```typescript
// src/prompts/weather.ts
import { prompt, tool, createVercelAIExecutor } from 'marrakech-sdk'
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
npx marrakech test
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
npx marrakech test --watch
```

Press `a` to run all tests, `Ctrl+C` to exit.

## Environment Variables

- `MARRAKECH_API_KEY`: Your Marrakech API key for analytics tracking
- `MARRAKECH_ANALYTICS_DISABLED`: Set to `true` to disable analytics
- `MARRAKECH_DEBUG`: Set to `true` to enable debug logging

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
```

## Documentation

For complete documentation, see:

- [Testing Guide](../../docs/TESTING.md)
- [Main README](../../README.md)

## License

MIT

