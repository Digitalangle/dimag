#!/usr/bin/env node

/**
 * Check for duplicate patterns
 * Prevents accidentally adding the same pattern twice
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '../learnings/patterns/architectural-decisions.json');

console.log('🔍 Checking for duplicate patterns...\n');

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

// Check for duplicate IDs
const ids = new Map();
const duplicateIds = [];

data.patterns.forEach((pattern, index) => {
  if (!pattern.id) {
    return; // Will be caught by validate-patterns.js
  }

  if (ids.has(pattern.id)) {
    duplicateIds.push({
      id: pattern.id,
      indices: [ids.get(pattern.id), index]
    });
  } else {
    ids.set(pattern.id, index);
  }
});

if (duplicateIds.length > 0) {
  console.error('❌ Found duplicate pattern IDs:\n');
  duplicateIds.forEach(dup => {
    console.error(`  - ID "${dup.id}" appears at indices: ${dup.indices.join(', ')}`);
  });
  console.error(`\nTotal duplicates: ${duplicateIds.length}`);
  process.exit(1);
}

// Check for similar patterns (same context + solution)
const signatures = new Map();
const similarPatterns = [];

data.patterns.forEach((pattern, index) => {
  // Create signature from context and solution
  const signature = JSON.stringify({
    projectType: pattern.pattern?.context?.projectType,
    technologies: pattern.pattern?.context?.technologies?.sort(),
    problemType: pattern.pattern?.context?.problemType,
    approach: pattern.pattern?.solution?.approach
  });

  if (signatures.has(signature)) {
    similarPatterns.push({
      signature,
      indices: [signatures.get(signature), index],
      patterns: [
        data.patterns[signatures.get(signature)],
        pattern
      ]
    });
  } else {
    signatures.set(signature, index);
  }
});

if (similarPatterns.length > 0) {
  console.warn('⚠️  Found potentially similar patterns:\n');
  similarPatterns.forEach((sim, i) => {
    console.warn(`  ${i + 1}. Patterns at indices ${sim.indices.join(', ')} have similar context/solution`);
    console.warn(`     IDs: ${sim.patterns.map(p => p.id).join(', ')}`);
  });
  console.warn(`\nTotal similar patterns: ${similarPatterns.length}`);
  console.warn('This is a warning, not an error. Review manually if needed.\n');
}

// Success
console.log('✅ No duplicate IDs found!');
console.log(`   Total unique patterns: ${ids.size}`);

if (similarPatterns.length > 0) {
  console.log(`   ⚠️  ${similarPatterns.length} potentially similar patterns (review recommended)`);
}

process.exit(0);
