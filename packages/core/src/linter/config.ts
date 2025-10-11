// Lightweight linter configuration sourced from environment variables only.
// We avoid filesystem access to keep the SDK browser/bundler-friendly.

export type Provider = "openai" | "anthropic";
export type LintSeverity = "error" | "warn" | "info";

export interface LintRuleOverride {
  // Map of rule-id -> severity or "off"
  [ruleId: string]: LintSeverity | "off";
}

export interface LinterConfig {
  enabled: boolean;
  mode: LintSeverity; // threshold: error->only errors, warn->warn+error, info->all
  providerOverride?: Provider | "auto";
  ruleOverrides?: LintRuleOverride;
}

function normalizeBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function normalizeMode(value: string | undefined): LintSeverity {
  if (!value) return "warn";
  const v = value.toLowerCase();
  if (v === "error" || v === "warn" || v === "info") return v;
  return "warn";
}

function parseRuleOverrides(raw: string | undefined): LintRuleOverride | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as LintRuleOverride;
    }
  } catch {
    // Swallow parse errors to avoid breaking user apps
  }
  return undefined;
}

export function getLinterConfig(): LinterConfig {
  // eslint-disable-next-line no-restricted-globals
  const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
  return {
    enabled: normalizeBooleanEnv(env.SDK_PROMPT_LINTER),
    mode: normalizeMode(env.SDK_PROMPT_LINTER_MODE),
    providerOverride: (env.SDK_PROMPT_LINTER_PROVIDER as Provider | "auto" | undefined) || "auto",
    ruleOverrides: parseRuleOverrides(env.SDK_PROMPT_LINTER_RULES),
  };
}

export function severityPassesThreshold(severity: LintSeverity, threshold: LintSeverity): boolean {
  const order: Record<LintSeverity, number> = { error: 2, warn: 1, info: 0 };
  return order[severity] >= order[threshold];
}
