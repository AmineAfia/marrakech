# Analytics Documentation

The Marrakesh SDK includes optional analytics tracking that helps you understand how your prompts and tools are being used. Analytics are completely opt-in and designed to have zero impact on your application's performance.

## Overview

Analytics tracking captures three types of data:

1. **Prompt Metadata**: Information about your prompts (content, tools, version)
2. **Prompt Executions**: When prompts are compiled and used
3. **Tool Calls**: When tools are executed (Vercel AI SDK integration only)

## Activation

Analytics are activated by setting the `MARRAKESH_API_KEY` environment variable:

```bash
export MARRAKESH_API_KEY="your-api-key-here"
```

Once set, analytics will automatically start tracking without any code changes.

## Data Collected

### Prompt Metadata
- Prompt ID (deterministic hash of content)
- Prompt name and description
- Full prompt text
- Associated tools
- Version information
- Creation and update timestamps

### Prompt Executions
- Execution ID (unique per compilation)
- Session ID (unique per PromptBuilder instance)
- Execution timing
- Token usage estimates
- Model information (when available)
- Cost estimates

### Tool Calls (Vercel AI SDK only)
- Tool call ID
- Tool name and execution time
- Input/output token counts
- Success/failure status
- Error messages (on failure)
- Cost estimates

## Privacy and Security

### Data Handling
- All data is sent to Marrakesh's secure analytics endpoint
- No sensitive information is collected
- Tool inputs/outputs are tracked for usage analysis only
- All data transmission is encrypted

### Opt-out Options
You can disable analytics in several ways:

1. **Remove API key**: Don't set `MARRAKESH_API_KEY`
2. **Environment variable**: Set `MARRAKESH_ANALYTICS_DISABLED=true`
3. **Debug mode**: Set `MARRAKESH_DEBUG=true` to see what data is being sent

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MARRAKESH_API_KEY` | Required for analytics | None |
| `MARRAKESH_ANALYTICS_ENDPOINT` | Custom analytics endpoint | `https://marrakesh.dev/api/ingest` |
| `MARRAKESH_ANALYTICS_DISABLED` | Disable analytics even with API key | `false` |
| `MARRAKESH_DEBUG` | Enable debug logging | `false` |

### Custom Endpoint

If you need to send analytics to a different endpoint:

```bash
export MARRAKESH_ANALYTICS_ENDPOINT="https://your-analytics.com/api/ingest"
```

## Technical Details

### Fire-and-Forget Design
- All analytics operations are asynchronous
- Network failures never impact your application
- Data is batched to reduce network overhead
- Automatic cleanup on process exit

### Batching Strategy
- Events are batched and sent every 100ms
- Automatic flush when batch reaches 50 events
- Process exit handler ensures no data loss

### Error Handling
- All analytics errors are silently ignored
- Network timeouts don't block your code
- JSON serialization errors are caught and ignored
- Debug mode shows errors in console

## Data Schema

### Prompt Metadata
```typescript
interface PromptMetadata {
  prompt_id: string;           // SHA-256 hash of content
  name: string;                // Generated name
  description: string;          // First 100 chars of prompt
  prompt_text: string;         // Full prompt content
  version: string;             // Always "1.0"
  is_active: number;           // Always 1
  account_id: string;          // Filled by backend
  organization_id: string;     // Filled by backend
  updated_at: string;          // ISO timestamp
}
```

### Prompt Execution
```typescript
interface PromptExecution {
  execution_id: string;         // UUID v4
  prompt_id: string;            // Links to metadata
  session_id: string;          // UUID v4 per PromptBuilder
  prompt_name: string;         // Short name
  prompt_version: string;      // Always "1.0"
  execution_time_ms: number;   // Compilation time
  model: string;               // "unknown" at SDK level
  region: string;              // "unknown" at SDK level
  request_tokens: number;      // Estimated input tokens
  response_tokens: number;     // 0 at SDK level
  cost_usd: number;           // 0 at SDK level
  status: string;              // "success"
  account_id: string;          // Filled by backend
  organization_id: string;     // Filled by backend
}
```

### Tool Call
```typescript
interface ToolCall {
  tool_call_id: string;        // UUID v4
  execution_id: string;         // Links to execution
  prompt_id: string;           // Links to prompt
  tool_name: string;           // Tool name
  execution_time_ms: number;   // Actual execution time
  input_tokens: number;        // Estimated input tokens
  output_tokens: number;       // Estimated output tokens
  cost_usd: number;           // Estimated cost
  status: string;              // "success" or "error"
  tool_call_timestamp: string; // ISO timestamp
  error_message?: string;      // Error details (on failure)
}
```

## Troubleshooting

### Analytics Not Working
1. Check that `MARRAKESH_API_KEY` is set
2. Verify `MARRAKESH_ANALYTICS_DISABLED` is not set to `true`
3. Enable debug mode: `MARRAKESH_DEBUG=true`
4. Check network connectivity to analytics endpoint

### Debug Mode
Enable debug logging to see what's happening:

```bash
export MARRAKESH_DEBUG=true
```

This will show:
- Analytics events being sent
- Network errors
- Batching behavior
- Error details

### Performance Impact
Analytics are designed to have zero performance impact:
- All operations are asynchronous
- No blocking network calls
- Minimal memory overhead
- Automatic cleanup

### Data Volume
Analytics data is minimal:
- Prompt metadata: ~1KB per unique prompt
- Execution tracking: ~200 bytes per compilation
- Tool calls: ~300 bytes per tool execution
- Automatic batching reduces network calls

## Support

For analytics-related issues:
1. Check the debug logs with `MARRAKESH_DEBUG=true`
2. Verify your API key is correct
3. Ensure network connectivity to the analytics endpoint
4. Contact support if issues persist

## Changelog

### v0.1.0-alpha.1
- Initial analytics implementation
- Prompt metadata tracking
- Execution tracking
- Tool call tracking (Vercel AI SDK)
- Fire-and-forget design
- Automatic batching
- Error suppression
