## analyzePrompt: AI-Powered Prompt Analysis

`analyzePrompt(prompt: string, opts?: AnalysisOptions): Promise<AnalysisReport>` provides intelligent, contextual feedback on system prompts using AI-powered pattern recognition, domain-aware analysis, and educational guidance. It combines static checks with smart pattern detection to give developers actionable insights for prompt improvement.

### AI-Powered Analysis Features

#### 1. **Smart Pattern Recognition**
- **Chain-of-Thought Detection**: Identifies reasoning structures, step-by-step thinking patterns
- **Few-shot Learning Analysis**: Evaluates example quality, diversity, and alignment with task
- **Role Hierarchy Detection**: Recognizes multi-agent setups, expert personas, delegation patterns
- **Task Decomposition Quality**: Analyzes complex task breakdown and subtask dependencies

#### 2. **Contextual Intelligence**
- **Domain-Aware Analysis**: Customer service vs. code generation vs. content creation patterns
- **Industry Best Practices**: Healthcare compliance, financial regulations, legal requirements
- **Security Scanning**: PII detection, data exposure risks, compliance gaps
- **Use Case Optimization**: Tailored suggestions based on specific application context

#### 3. **Educational AI Assistant**
- **Interactive Explanations**: "Why this works" for each suggestion with examples
- **Best Practice Examples**: Show excellent prompts with detailed explanations
- **Common Pitfall Detection**: Identify and prevent typical mistakes
- **Learning Progression**: Guide users from basic to advanced techniques

#### 4. **Real-time Optimization**
- **Live Feedback**: Suggestions appear as users type
- **Instant Improvements**: One-click fixes for common issues
- **Performance Prediction**: Estimate prompt effectiveness without testing
- **Cost Analysis**: Token usage and cost optimization recommendations

### Enhanced Scoring System (0..10)

**Intelligent Weighted Scoring** with contextual adjustments:

#### Core Components (Base Weights)
- **Persona/Role Specificity** (1.5): Domain expertise, tone clarity, role definition
- **Task Objective Clarity** (1.5): Clear verbs, specific outcomes, measurable goals
- **Output Constraints** (2.0): Format, length, schema, structure requirements
- **Few-shot Quality** (2.0): Example diversity, relevance, coverage, alignment
- **Tool Integration** (1.0): Schema consistency, description quality, usage alignment
- **Safety & Compliance** (1.5): Guardrails, privacy, security, regulatory compliance
- **Language Clarity** (1.5): Precision, testability, actionable instructions

#### Contextual Multipliers
- **Domain Expertise**: +0.5 for industry-specific patterns
- **Advanced Techniques**: +0.5 for CoT, few-shot, role hierarchies
- **Security Critical**: +1.0 for healthcare, finance, legal domains
- **Performance Critical**: +0.5 for real-time, high-volume applications

### Intelligent Suggestions System

**Context-Aware Suggestions** with educational explanations:

#### Smart Suggestion Generation
```typescript
interface SmartSuggestion {
  id: string;
  type: 'improvement' | 'optimization' | 'security' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  explanation: string; // Why this matters
  example?: string; // Before/after example
  impact: string; // Expected improvement
  oneClickFix?: string; // Automated fix if possible
}
```

#### Example Suggestions by Domain

**Customer Service Domain:**
- **High Priority**: "Add escalation triggers: 'If the user mentions [billing/technical/refund], escalate to [specialist]'"
- **Medium Priority**: "Include empathy patterns: 'I understand your frustration with...'"
- **Security**: "Add PII redaction: 'Never repeat full account numbers, use last 4 digits only'"

**Code Generation Domain:**
- **High Priority**: "Add code review checklist: 'Include error handling, type safety, and documentation'"
- **Performance**: "Specify performance constraints: 'Optimize for O(n) complexity, avoid nested loops'"
- **Security**: "Include security scanning: 'Check for SQL injection, XSS vulnerabilities'"

**Content Creation Domain:**
- **Quality**: "Add style guidelines: 'Use active voice, 8th grade reading level, include call-to-action'"
- **SEO**: "Include keyword optimization: 'Target keywords: [list], maintain 2% density'"
- **Brand**: "Enforce brand voice: 'Professional but approachable, avoid jargon'"

### Advanced Analysis Options

#### AI-Powered Pattern Detection
```typescript
interface PatternAnalysis {
  chainOfThought: {
    detected: boolean;
    quality: 'excellent' | 'good' | 'needs_improvement';
    suggestions: string[];
  };
  fewShotLearning: {
    count: number;
    diversity: number; // 0-1
    alignment: number; // 0-1
    suggestions: string[];
  };
  roleHierarchy: {
    detected: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    optimization: string[];
  };
  taskDecomposition: {
    detected: boolean;
    steps: number;
    clarity: number; // 0-1
    suggestions: string[];
  };
}
```

#### Domain-Specific Analysis
```typescript
interface DomainAnalysis {
  domain: 'customer_service' | 'code_generation' | 'content_creation' | 'data_analysis';
  confidence: number; // 0-1
  industryBestPractices: string[];
  complianceChecks: {
    security: boolean;
    privacy: boolean;
    regulatory: boolean;
  };
  performanceOptimizations: string[];
}
```

#### Educational Guidance
```typescript
interface EducationalGuidance {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningPath: string[];
  bestPractices: {
    technique: string;
    explanation: string;
    example: string;
  }[];
  commonPitfalls: {
    issue: string;
    solution: string;
    prevention: string;
  }[];
}
```

### Enhanced Type Signature

```typescript
interface AnalysisOptions {
  // Core analysis
  domain?: 'customer_service' | 'code_generation' | 'content_creation' | 'data_analysis' | 'auto';
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  
  // Pattern detection
  detectPatterns?: boolean; // CoT, few-shot, role hierarchies
  analyzeDomain?: boolean; // Industry-specific analysis
  
  // Educational features
  includeExplanations?: boolean; // Why suggestions matter
  showExamples?: boolean; // Best practice examples
  learningPath?: boolean; // Skill progression guidance
  
  // Real-time features
  liveFeedback?: boolean; // Suggestions as you type
  oneClickFixes?: boolean; // Automated improvements
  
  // Technical
  tokenizer?: (s: string) => number;
  tools?: Array<{ name: string; description?: string; schema?: object }>;
  examples?: Array<{ user: string; assistant: string }>;
  
  // Optional AI critique
  llmCritique?: (rubric: string, prompt: string) => Promise<string>;
}

interface EnhancedAnalysisReport {
  // Core metrics
  score: number; // 0-10
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  
  // Issues and suggestions
  issues: AnalysisIssue[];
  suggestions: SmartSuggestion[];
  
  // Advanced analysis
  patterns?: PatternAnalysis;
  domain?: DomainAnalysis;
  education?: EducationalGuidance;
  
  // Performance insights
  tokenCount: number;
  estimatedCost: number;
  performancePrediction: {
    accuracy: number; // 0-1
    speed: 'fast' | 'medium' | 'slow';
    reliability: number; // 0-1
  };
  
  // One-click improvements
  quickFixes: Array<{
    id: string;
    title: string;
    apply: () => string; // Returns improved prompt
  }>;
}

function analyzePrompt(
  prompt: string, 
  opts?: AnalysisOptions
): Promise<EnhancedAnalysisReport>;
```

### References

- Vercel AI SDK Prompting Fundamentals (clarity, constraints, examples): `https://vercel.com/academy/ai-sdk/prompting-fundamentals?utm_source=openai`
- Chain-of-Thought and advanced prompting techniques: `https://nanonets.com/blog/prompt-engineering/?utm_source=openai`
- Prompt engineering techniques and specificity guidance: `https://opendatascience.com/decoding-the-magic-the-best-prompt-engineering-techniques/?utm_source=openai`
- Automated prompt iteration/optimization overview: `https://towardsdatascience.com/automated-prompt-engineering-the-definitive-hands-on-guide-1476c8cd3c50/?utm_source=openai`
- DSPy (declarative optimization; context for why we lint/optimize): `https://dspy.ai/tutorials/customer_service_agent/?utm_source=openai`, `https://github.com/stanfordnlp/dspy`

### Advanced Implementation

#### AI-Powered Pattern Detection Engine
```typescript
// src/analyze/PatternDetector.ts
export class PatternDetector {
  async detectChainOfThought(prompt: string): Promise<PatternAnalysis['chainOfThought']> {
    const cotIndicators = [
      /let's think step by step/i,
      /first.*then.*finally/i,
      /break down.*into steps/i,
      /reasoning.*process/i
    ];
    
    const detected = cotIndicators.some(pattern => pattern.test(prompt));
    
    if (!detected) {
      return {
        detected: false,
        quality: 'needs_improvement',
        suggestions: [
          'Add reasoning structure: "Let\'s think step by step..."',
          'Include problem decomposition: "First, identify the issue. Then, analyze options..."',
          'Use explicit reasoning: "Based on the information provided..."'
        ]
      };
    }
    
    // Analyze quality of CoT structure
    const quality = this.analyzeCoTQuality(prompt);
    return {
      detected: true,
      quality,
      suggestions: this.getCoTOptimizations(prompt, quality)
    };
  }
  
  async detectFewShotLearning(prompt: string): Promise<PatternAnalysis['fewShotLearning']> {
    const examples = this.extractExamples(prompt);
    const diversity = this.calculateDiversity(examples);
    const alignment = this.calculateAlignment(examples, prompt);
    
    return {
      count: examples.length,
      diversity,
      alignment,
      suggestions: this.getFewShotSuggestions(examples, diversity, alignment)
    };
  }
  
  async detectRoleHierarchy(prompt: string): Promise<PatternAnalysis['roleHierarchy']> {
    const roles = this.extractRoles(prompt);
    const complexity = this.assessComplexity(roles);
    
    return {
      detected: roles.length > 1,
      complexity,
      optimization: this.getRoleOptimizations(roles, complexity)
    };
  }
}
```

#### Domain-Specific Analysis Engine
```typescript
// src/analyze/DomainAnalyzer.ts
export class DomainAnalyzer {
  private domainPatterns = {
    customer_service: {
      keywords: ['support', 'help', 'customer', 'issue', 'problem', 'resolve'],
      bestPractices: [
        'Include empathy statements',
        'Add escalation triggers',
        'Specify response time expectations',
        'Include PII protection guidelines'
      ],
      compliance: ['GDPR', 'CCPA', 'PCI-DSS']
    },
    code_generation: {
      keywords: ['code', 'function', 'class', 'method', 'algorithm'],
      bestPractices: [
        'Include error handling requirements',
        'Specify performance constraints',
        'Add security scanning instructions',
        'Include documentation standards'
      ],
      compliance: ['OWASP', 'Security']
    }
  };
  
  async analyzeDomain(prompt: string): Promise<DomainAnalysis> {
    const detectedDomain = this.detectDomain(prompt);
    const confidence = this.calculateConfidence(prompt, detectedDomain);
    const bestPractices = this.getBestPractices(detectedDomain);
    const compliance = this.checkCompliance(prompt, detectedDomain);
    
    return {
      domain: detectedDomain,
      confidence,
      industryBestPractices: bestPractices,
      complianceChecks: compliance,
      performanceOptimizations: this.getOptimizations(detectedDomain)
    };
  }
}
```

#### Educational Guidance System
```typescript
// src/analyze/EducationalGuide.ts
export class EducationalGuide {
  async generateGuidance(
    prompt: string, 
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<EducationalGuidance> {
    const techniques = this.identifyTechniques(prompt);
    const learningPath = this.createLearningPath(techniques, skillLevel);
    const bestPractices = this.getBestPractices(techniques);
    const pitfalls = this.identifyPitfalls(prompt, techniques);
    
    return {
      skillLevel,
      learningPath,
      bestPractices,
      commonPitfalls: pitfalls
    };
  }
  
  private createLearningPath(techniques: string[], skillLevel: string): string[] {
    const paths = {
      beginner: [
        'Master basic persona definition',
        'Learn output constraint specification',
        'Practice few-shot example creation',
        'Understand safety guardrails'
      ],
      intermediate: [
        'Implement chain-of-thought reasoning',
        'Create role hierarchies',
        'Optimize for specific domains',
        'Add performance constraints'
      ],
      advanced: [
        'Design multi-agent systems',
        'Implement dynamic prompt adaptation',
        'Create domain-specific optimizations',
        'Build evaluation frameworks'
      ]
    };
    
    return paths[skillLevel] || paths.beginner;
  }
}
```

#### Real-time Analysis Engine
```typescript
// src/analyze/RealtimeAnalyzer.ts
export class RealtimeAnalyzer {
  private debounceMs = 300;
  private lastAnalysis: EnhancedAnalysisReport | null = null;
  
  async analyzeLive(
    prompt: string, 
    onChange: (report: EnhancedAnalysisReport) => void
  ): Promise<void> {
    // Debounce rapid changes
    setTimeout(async () => {
      const report = await this.quickAnalyze(prompt);
      if (JSON.stringify(report) !== JSON.stringify(this.lastAnalysis)) {
        this.lastAnalysis = report;
        onChange(report);
      }
    }, this.debounceMs);
  }
  
  private async quickAnalyze(prompt: string): Promise<EnhancedAnalysisReport> {
    // Fast analysis for real-time feedback
    const basicChecks = await this.runBasicChecks(prompt);
    const patterns = await this.detectQuickPatterns(prompt);
    const suggestions = await this.generateQuickSuggestions(prompt);
    
    return {
      score: this.calculateQuickScore(basicChecks),
      grade: this.scoreToGrade(this.calculateQuickScore(basicChecks)),
      issues: basicChecks.issues,
      suggestions: suggestions.slice(0, 3), // Top 3 for real-time
      patterns,
      tokenCount: this.estimateTokens(prompt),
      estimatedCost: this.estimateCost(prompt),
      performancePrediction: this.predictPerformance(prompt),
      quickFixes: this.generateQuickFixes(prompt)
    };
  }
}
```

#### Complete Implementation Example
```typescript
// src/analyze/PromptAnalyzer.ts
export async function analyzePrompt(
  prompt: string, 
  opts: AnalysisOptions = {}
): Promise<EnhancedAnalysisReport> {
  const detector = new PatternDetector();
  const domainAnalyzer = new DomainAnalyzer();
  const educationalGuide = new EducationalGuide();
  
  // Run all analyses in parallel
  const [patterns, domain, education, basicChecks] = await Promise.all([
    opts.detectPatterns ? detector.analyzeAll(prompt) : undefined,
    opts.analyzeDomain ? domainAnalyzer.analyzeDomain(prompt) : undefined,
    opts.learningPath ? educationalGuide.generateGuidance(prompt, opts.skillLevel || 'intermediate') : undefined,
    this.runBasicChecks(prompt)
  ]);
  
  // Calculate enhanced score with contextual multipliers
  const baseScore = this.calculateBaseScore(basicChecks);
  const contextualScore = this.applyContextualMultipliers(baseScore, domain, patterns);
  
  // Generate smart suggestions
  const suggestions = await this.generateSmartSuggestions(prompt, {
    patterns, domain, education, basicChecks
  });
  
  return {
    score: contextualScore,
    grade: this.scoreToGrade(contextualScore),
    issues: basicChecks.issues,
    suggestions,
    patterns,
    domain,
    education,
    tokenCount: this.estimateTokens(prompt),
    estimatedCost: this.estimateCost(prompt),
    performancePrediction: this.predictPerformance(prompt),
    quickFixes: this.generateQuickFixes(prompt)
  };
}
```

#### Usage Examples
```typescript
// Basic analysis
const report = await analyzePrompt(myPrompt);

// Advanced analysis with all features
const advancedReport = await analyzePrompt(myPrompt, {
  domain: 'customer_service',
  skillLevel: 'intermediate',
  detectPatterns: true,
  analyzeDomain: true,
  includeExplanations: true,
  showExamples: true,
  learningPath: true,
  oneClickFixes: true
});

// Real-time analysis
const realtimeAnalyzer = new RealtimeAnalyzer();
realtimeAnalyzer.analyzeLive(myPrompt, (report) => {
  console.log(`Score: ${report.score}/10 (${report.grade})`);
  console.log(`Quick fixes: ${report.quickFixes.length} available`);
});
```

