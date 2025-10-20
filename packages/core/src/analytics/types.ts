/**
 * TypeScript types matching the OpenAPI spec for analytics ingestion
 */

export interface ToolCall {
  cost_usd: number;
  execution_id: string;
  execution_time_ms: number;
  input_tokens: number;
  output_tokens: number;
  prompt_id: string;
  status: string;
  tool_call_id: string;
  tool_name: string;
  tool_call_timestamp?: string;
  error_message?: string | null;
}

export interface PromptMetadata {
  account_id: string;
  created_at?: string;
  description: string;
  is_active: number;
  name: string;
  organization_id: string;
  prompt_id: string;
  prompt_text: string;
  updated_at: string;
  version: string;
}

export interface PromptExecution {
  account_id: string;
  cost_usd: number;
  execution_id: string;
  execution_time_ms: number;
  model: string;
  organization_id: string;
  prompt_id: string;
  prompt_name: string;
  prompt_version: string;
  region: string;
  request_tokens: number;
  response_tokens: number;
  session_id: string;
  status: string;
  execution_timestamp?: string;
  error_message?: string | null;
}

export interface IngestionRequest {
  tool_calls: ToolCall[];
  prompt_metadata: PromptMetadata[];
  prompt_executions: PromptExecution[];
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  results: {
    tool_calls: TinybirdResult;
    prompt_metadata: TinybirdResult;
    prompt_executions: TinybirdResult;
  };
}

export interface TinybirdResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export interface IngestionFailureResponse {
  error: string;
  details?: string[];
  results: {
    tool_calls: TinybirdResult;
    prompt_metadata: TinybirdResult;
    prompt_executions: TinybirdResult;
  };
}
