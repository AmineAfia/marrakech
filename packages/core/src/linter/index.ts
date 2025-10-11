import { getLinterConfig, severityPassesThreshold, type LinterConfig } from "./config.js";
import { runAnthropicRules, runCoreRules, runOpenAIRules, type LintFinding, type PromptInputs } from "./rules.js";

export { type LintFinding } from "./rules.js";
export { type LintSeverity } from "./config.js";

function applyOverrides(findings: LintFinding[], config: LinterConfig): LintFinding[] {
  if (!config.ruleOverrides) return findings;
  return findings
    .map((f) => {
      const override = config.ruleOverrides![f.ruleId];
      if (!override) return f;
      if (override === "off") return { ...f, severity: "info", message: "(suppressed) " + f.message } as LintFinding;
      return { ...f, severity: override } as LintFinding;
    })
    .filter((f) => f);
}

function filterByMode(findings: LintFinding[], mode: LinterConfig["mode"]): LintFinding[] {
  return findings.filter((f) => severityPassesThreshold(f.severity, mode));
}

function formatFinding(f: LintFinding): string {
  return `${f.ruleId} (${f.severity}): ${f.message}`;
}

export function lintPrompt(input: PromptInputs, logger?: { warn: (msg: string) => void; error: (msg: string) => void; info?: (msg: string) => void }): LintFinding[] {
  const config = getLinterConfig();
  if (!config.enabled) return [];

  const provider = (config.providerOverride === "auto" || !config.providerOverride) ? input.provider : (config.providerOverride as PromptInputs["provider"]);

  const all: LintFinding[] = [
    ...runCoreRules(input),
    ...(provider === "openai" ? runOpenAIRules(input) : []),
    ...(provider === "anthropic" ? runAnthropicRules(input) : []),
  ];

  const overridden = applyOverrides(all, config);
  const filtered = filterByMode(overridden, config.mode);

  if (filtered.length && logger) {
    for (const f of filtered) {
      const line = formatFinding(f);
      if (f.severity === "error") logger.error(line);
      else logger.warn(line);
    }
  }

  return filtered;
}
