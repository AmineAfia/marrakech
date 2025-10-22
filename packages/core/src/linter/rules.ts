import type { LintSeverity } from "./config.js";

export interface LintFinding {
  ruleId: string;
  severity: LintSeverity;
  message: string;
}

export interface PromptInputs {
  provider: "openai" | "anthropic";
  system: string;
  messages?: Array<{ role: string; content: string }>;
}

function hasActionVerbHead(system: string): boolean {
  const head = system.trim().slice(0, 180).toLowerCase();
  return /(summarize|classify|extract|generate|translate|rewrite|answer|decide|plan|compare|rank|explain|evaluate)/.test(head);
}

function impliesStructuredOutput(system: string): boolean {
  const text = system.toLowerCase();
  return /(extract|return|respond).*\b(json|yaml|csv)\b/.test(text) || /fields?:/i.test(system);
}

function hasOutputContract(system: string): boolean {
  const text = system.toLowerCase();
  if (/response_format|json_schema/.test(text)) return true;
  if (/```\s*json|\{\s*\"/.test(system)) return true;
  if (/<output_format>|<json>|<schema>/.test(system)) return true;
  return false;
}

function hasLongUndelimitedContent(system: string): boolean {
  if (system.length < 200) return false;
  const hasFences = /```[\s\S]*?```/.test(system) || /<content>[\s\S]*?<\/content>/.test(system) || /<<<[\s\S]*?>>>/.test(system);
  if (hasFences) return false;
  // Heuristic: multiple blank-line separated paragraphs
  const paragraphs = system.split(/\n\s*\n/).length;
  return paragraphs >= 3;
}

function hasContradictions(system: string): boolean {
  const t = system.toLowerCase();
  if (/be concise/.test(t) && /be exhaustive|comprehensive/.test(t)) return true;
  if (/never/.test(t) && /always/.test(t)) return true;
  return false;
}

function requestsChainOfThought(system: string): boolean {
  const t = system.toLowerCase();
  return /(chain of thought|show your reasoning|think step by step|let's think step by step)/.test(t);
}

function referencesRAG(system: string): boolean {
  const t = system.toLowerCase();
  return /retrieval|context documents|rag|knowledge base/.test(t);
}

export function runCoreRules(input: PromptInputs): LintFinding[] {
  const findings: LintFinding[] = [];
  const { system } = input;

  if (!hasActionVerbHead(system)) {
    findings.push({
      ruleId: "core/missing-task-verb",
      severity: "warn",
      message: "Prompt may be vague; start with an explicit action (e.g., 'Summarize ...').",
    });
  }

  if (impliesStructuredOutput(system) && !hasOutputContract(system)) {
    findings.push({
      ruleId: "core/missing-output-spec",
      severity: "warn",
      message: "Extraction implied but no output contract found. Add JSON or field list.",
    });
  }

  if (hasLongUndelimitedContent(system)) {
    findings.push({
      ruleId: "core/has-user-content-without-delimiters",
      severity: "warn",
      message: "Long content lacks fences. Wrap with ``` or <content> tags.",
    });
  }

  if (hasContradictions(system)) {
    findings.push({
      ruleId: "core/contradictory-instructions",
      severity: "warn",
      message: "Conflicting guidance detected (e.g., 'be concise' and 'be exhaustive').",
    });
  }

  if (requestsChainOfThought(system)) {
    findings.push({
      ruleId: "core/asks-for-chain-of-thought",
      severity: "warn",
      message: "Avoid requesting chain-of-thought. Ask for a brief rationale instead.",
    });
  }

  if (referencesRAG(system) && !/use only the context|say you don't know|unknown/i.test(system)) {
    findings.push({
      ruleId: "core/rag-missing-instructions",
      severity: "info",
      message: "RAG detected. Add guardrails like 'Use only the context; if missing, say you don't know.'",
    });
  }

  if (/[{][a-zA-Z0-9_]+[}]/.test(system) && !/{{.*}}/.test(system)) {
    findings.push({
      ruleId: "core/placeholders-not-delimited",
      severity: "info",
      message: "Placeholders look unescaped. Consider using {{var}} or fences to avoid collision.",
    });
  }

  if (system.length > 4000) {
    findings.push({
      ruleId: "core/overlong-system",
      severity: "info",
      message: "System prompt is very long; consider moving examples/context to separate sections.",
    });
  }

  return findings;
}

export function runOpenAIRules(input: PromptInputs): LintFinding[] {
  const findings: LintFinding[] = [];
  const t = input.system.toLowerCase();

  if (/json/.test(t) && !/response_format|json_schema/.test(t)) {
    findings.push({
      ruleId: "openai/prefer-structured-output",
      severity: "info",
      message: "You ask for JSON. Consider OpenAI Structured Outputs for reliability.",
    });
  }

  if (!/\brole:\s*system\b/i.test(input.system) && /always|never|policy|rules?/.test(t)) {
    findings.push({
      ruleId: "openai/misplaced-instructions",
      severity: "info",
      message: "Durable policies often belong in a system message.",
    });
  }

  const negations = (t.match(/\b(don't|do not|never)\b/g) || []).length;
  const positives = (t.match(/\b(do|should|must)\b/g) || []).length;
  if (negations >= 5 && positives < 2) {
    findings.push({
      ruleId: "openai/overuse-negative-instructions",
      severity: "info",
      message: "Lots of negatives detected. Prefer positive success criteria and examples.",
    });
  }

  return findings;
}

export function runAnthropicRules(input: PromptInputs): LintFinding[] {
  const findings: LintFinding[] = [];
  const s = input.system;
  const t = s.toLowerCase();

  if (/\n\s*<\w+>[\s\S]*<\/\w+>/.test(s) === false && /task|steps|constraints|format/i.test(s)) {
    findings.push({
      ruleId: "anthropic/prefer-xml-structure",
      severity: "info",
      message: "Multi-part task untagged. Consider simple <task>/<output> XML tags.",
    });
  }

  if (/(chain of thought|show your reasoning|think step by step|let's think)/.test(t)) {
    findings.push({
      ruleId: "anthropic/avoid-requested-cot",
      severity: "warn",
      message: "Avoid asking for detailed internal reasoning. Prefer brief justification.",
    });
  }

  if (!/\brole:\s*system\b/i.test(s) && /policy|rules?/.test(t)) {
    findings.push({
      ruleId: "anthropic/use-system-for-policy",
      severity: "info",
      message: "Put durable policy in the system message.",
    });
  }

  if (/example:/i.test(s) && !/<example>[\s\S]*<\/example>/.test(s) && !/```/.test(s)) {
    findings.push({
      ruleId: "anthropic/examples-not-fenced",
      severity: "info",
      message: "Few-shot examples should be clearly delimited (e.g., <example> or code fences).",
    });
  }

  return findings;
}
