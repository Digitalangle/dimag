#!/usr/bin/env node

/**
 * Validate pattern JSON files
 * Ensures all patterns follow the correct structure
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '../learnings/patterns/architectural-decisions.json');

console.log('🔍 Validating pattern JSON structure...\n');

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

// Validate top-level structure
if (!data.patterns || !Array.isArray(data.patterns)) {
  console.error('❌ Error: Missing or invalid "patterns" array');
  process.exit(1);
}

if (!data.metadata || typeof data.metadata !== 'object') {
  console.error('❌ Error: Missing or invalid "metadata" object');
  process.exit(1);
}

// Validate metadata
const requiredMetadataFields = ['lastUpdated', 'totalPatterns', 'version'];
for (const field of requiredMetadataFields) {
  if (!(field in data.metadata)) {
    console.error(`❌ Error: Missing metadata field: ${field}`);
    process.exit(1);
  }
}

// Validate totalPatterns matches array length
if (data.metadata.totalPatterns !== data.patterns.length) {
  console.error(`❌ Error: totalPatterns (${data.metadata.totalPatterns}) doesn't match array length (${data.patterns.length})`);
  process.exit(1);
}

// Validate each pattern
const errors = [];
const ids = new Set();

data.patterns.forEach((pattern, index) => {
  const prefix = `Pattern ${index + 1}:`;

  // Required fields
  if (!pattern.id) {
    errors.push(`${prefix} Missing "id"`);
  } else {
    // Check for duplicate IDs
    if (ids.has(pattern.id)) {
      errors.push(`${prefix} Duplicate ID: ${pattern.id}`);
    }
    ids.add(pattern.id);
  }

  if (!pattern.category) {
    errors.push(`${prefix} Missing "category"`);
  }

  if (!pattern.pattern || typeof pattern.pattern !== 'object') {
    errors.push(`${prefix} Missing or invalid "pattern" object`);
  } else {
    // Validate pattern structure
    if (!pattern.pattern.context) {
      errors.push(`${prefix} Missing "pattern.context"`);
    }
    if (!pattern.pattern.solution) {
      errors.push(`${prefix} Missing "pattern.solution"`);
    }
    if (typeof pattern.pattern.confidence !== 'number') {
      errors.push(`${prefix} Missing or invalid "pattern.confidence"`);
    } else if (pattern.pattern.confidence < 0 || pattern.pattern.confidence > 1) {
      errors.push(`${prefix} Invalid confidence value (must be 0-1): ${pattern.pattern.confidence}`);
    }
  }

  if (!pattern.metadata || typeof pattern.metadata !== 'object') {
    errors.push(`${prefix} Missing or invalid "metadata" object`);
  } else {
    // Validate metadata
    if (!pattern.metadata.createdAt) {
      errors.push(`${prefix} Missing "metadata.createdAt"`);
    }
    if (typeof pattern.metadata.usageCount !== 'number') {
      errors.push(`${prefix} Missing or invalid "metadata.usageCount"`);
    }
    if (typeof pattern.metadata.successRate !== 'number') {
      errors.push(`${prefix} Missing or invalid "metadata.successRate"`);
    } else if (pattern.metadata.successRate < 0 || pattern.metadata.successRate > 1) {
      errors.push(`${prefix} Invalid successRate (must be 0-1): ${pattern.metadata.successRate}`);
    }
  }
});

// Report errors
if (errors.length > 0) {
  console.error('❌ Validation failed with errors:\n');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error(`\nTotal errors: ${errors.length}`);
  process.exit(1);
}

// Success
console.log('✅ Pattern validation passed!');
console.log(`   Total patterns: ${data.patterns.length}`);
console.log(`   Version: ${data.metadata.version}`);
console.log(`   Last updated: ${data.metadata.lastUpdated}`);
process.exit(0);
