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

export interface TestRun {
  test_run_id: string;
  prompt_id: string;
  prompt_name: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  timestamp: string;
  environment: string; // 'local', 'ci', 'production'
  git_commit?: string;
  account_id?: string;
  organization_id?: string;
}

export interface TestCaseResult {
  test_case_id: string;
  test_run_id: string;
  prompt_id: string;
  input: string;
  expected_output?: string;
  actual_output: string;
  passed: boolean;
  duration_ms: number;
  execution_id: string;
  error_message?: string;
  timestamp?: string;
}

export interface IngestionRequest {
  tool_calls: ToolCall[];
  prompt_metadata: PromptMetadata[];
  prompt_executions: PromptExecution[];
  test_runs: TestRun[];
  test_cases: TestCaseResult[];
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  results: {
    tool_calls: TinybirdResult;
    prompt_metadata: TinybirdResult;
    prompt_executions: TinybirdResult;
    test_runs: TinybirdResult;
    test_cases: TinybirdResult;
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
    test_runs: TinybirdResult;
    test_cases: TinybirdResult;
  };
}
