#!/usr/bin/env node

/**
 * Validate pattern quality
 * Ensures patterns meet minimum quality standards
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '../learnings/patterns/architectural-decisions.json');

console.log('🔍 Validating pattern quality...\n');

// Check if file exists
if (!fs.existsSync(PATTERNS_FILE)) {
  console.error('❌ Error: Pattern file not found:', PATTERNS_FILE);
  process.exit(1);
}

// Read and parse JSON
let data;
try {
  const content = fs.readFileSync(PATTERNS_FILE, 'utf-8');
  data = JSON.parse(content);
} catch (error) {
  console.error('❌ Error: Invalid JSON format');
  console.error(error.message);
  process.exit(1);
}

const MIN_CONFIDENCE = 0.5;
const MIN_SUCCESS_RATE = 0.5;
const MIN_USAGE_COUNT = 2;

const qualityIssues = [];
const warnings = [];

data.patterns.forEach((pattern, index) => {
  const prefix = `Pattern ${index + 1} (${pattern.id}):`;

  // Check confidence
  if (pattern.pattern?.confidence < MIN_CONFIDENCE) {
    qualityIssues.push(`${prefix} Low confidence (${pattern.pattern.confidence}), minimum is ${MIN_CONFIDENCE}`);
  }

  // Check success rate
  if (pattern.metadata?.successRate < MIN_SUCCESS_RATE) {
    qualityIssues.push(`${prefix} Low success rate (${pattern.metadata.successRate}), minimum is ${MIN_SUCCESS_RATE}`);
  }

  // Check usage count
  if (pattern.metadata?.usageCount < MIN_USAGE_COUNT) {
    warnings.push(`${prefix} Low usage count (${pattern.metadata.usageCount}), recommended minimum is ${MIN_USAGE_COUNT}`);
  }

  // Check for empty context
  const context = pattern.pattern?.context;
  if (!context || Object.keys(context).length === 0) {
    qualityIssues.push(`${prefix} Empty context`);
  }

  // Check for empty solution
  const solution = pattern.pattern?.solution;
  if (!solution || Object.keys(solution).length === 0) {
    qualityIssues.push(`${prefix} Empty solution`);
  }

  // Check for missing technologies
  if (context?.technologies && context.technologies.length === 0) {
    warnings.push(`${prefix} No technologies specified in context`);
  }

  // Check for missing approach in solution
  if (solution && !solution.approach) {
    warnings.push(`${prefix} No approach specified in solution`);
  }
});

// Report quality issues (errors)
if (qualityIssues.length > 0) {
  console.error('❌ Quality validation failed:\n');
  qualityIssues.forEach(issue => console.error(`  - ${issue}`));
  console.error(`\nTotal quality issues: ${qualityIssues.length}`);
  process.exit(1);
}

// Report warnings (don't fail)
if (warnings.length > 0) {
  console.warn('⚠️  Quality warnings:\n');
  warnings.forEach(warning => console.warn(`  - ${warning}`));
  console.warn(`\nTotal warnings: ${warnings.length}`);
  console.warn('These are warnings, not errors.\n');
}

// Calculate quality metrics
const avgConfidence = data.patterns.reduce((sum, p) => sum + (p.pattern?.confidence || 0), 0) / data.patterns.length;
const avgSuccessRate = data.patterns.reduce((sum, p) => sum + (p.metadata?.successRate || 0), 0) / data.patterns.length;
const avgUsageCount = data.patterns.reduce((sum, p) => sum + (p.metadata?.usageCount || 0), 0) / data.patterns.length;

// Success
console.log('✅ Pattern quality validation passed!');
console.log(`   Total patterns: ${data.patterns.length}`);
console.log(`   Average confidence: ${avgConfidence.toFixed(2)}`);
console.log(`   Average success rate: ${avgSuccessRate.toFixed(2)}`);
console.log(`   Average usage count: ${avgUsageCount.toFixed(1)}`);

if (warnings.length > 0) {
  console.log(`   ⚠️  ${warnings.length} warnings (review recommended)`);
}

process.exit(0);
