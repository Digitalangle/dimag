# Learned Patterns

This directory contains patterns learned from real developer usage.

## Pattern Categories

### 1. architectural-decisions.json
High-level architecture choices (frameworks, deployment, infrastructure)

### 2. tech-stack-patterns.json
Technology stack combinations that work well together

### 3. deployment-patterns.json
Deployment-specific patterns (configs, credentials, processes)

### 4. debugging-patterns.json
Common debugging approaches and solutions

## Pattern Schema

```typescript
interface Pattern {
  type: 'ARCHITECTURAL_DECISION' | 'TECH_STACK_PATTERN' | 'DEPLOYMENT_PATTERN' | 'DEBUG_PATTERN';
  pattern: {
    trigger: string;           // When to apply this pattern
    solution: string;          // What to do
    why: string;              // Why it works
    confidence: number;       // 0-1 confidence score
    occurrences: number;      // How many times seen
    successRate: number;      // % of successful outcomes
    learnedFrom: string[];    // Contributors (anonymized)
    examples?: any[];         // Example scenarios
    relatedPatterns?: string[]; // Links to related patterns
  };
}
```

## Contributing Patterns

Patterns are added automatically by the extension, but you can also add manually:

1. Follow the schema above
2. Add to appropriate category file
3. Submit PR
4. CI/CD validates format

## Pattern Lifecycle

```
New pattern (confidence: 0.5)
    ↓ Used successfully
Updated (confidence: 0.7, occurrences: 3)
    ↓ Used more
Mature (confidence: 0.9+, occurrences: 10+)
    ↓ If fails repeatedly
Deprecated (moved to anti-patterns/)
```
