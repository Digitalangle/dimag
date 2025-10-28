#!/usr/bin/env node

/**
 * Validate statistics JSON file
 * Ensures statistics structure is correct
 */

const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../learnings/statistics/learning-metrics.json');

console.log('🔍 Validating statistics JSON structure...\n');

// Check if file exists
if (!fs.existsSync(STATS_FILE)) {
  console.error('❌ Error: Statistics file not found:', STATS_FILE);
  process.exit(1);
}

// Read and parse JSON
let data;
try {
  const content = fs.readFileSync(STATS_FILE, 'utf-8');
  data = JSON.parse(content);
} catch (error) {
  console.error('❌ Error: Invalid JSON format');
  console.error(error.message);
  process.exit(1);
}

// Validate required fields
const requiredFields = [
  'totalPatterns',
  'totalContributors',
  'totalLearningEvents',
  'categories',
  'growth',
  'lastUpdated'
];

const errors = [];

for (const field of requiredFields) {
  if (!(field in data)) {
    errors.push(`Missing required field: ${field}`);
  }
}

// Validate types
if (typeof data.totalPatterns !== 'number') {
  errors.push('totalPatterns must be a number');
}

if (typeof data.totalContributors !== 'number') {
  errors.push('totalContributors must be a number');
}

if (typeof data.totalLearningEvents !== 'number') {
  errors.push('totalLearningEvents must be a number');
}

if (typeof data.categories !== 'object' || Array.isArray(data.categories)) {
  errors.push('categories must be an object (not an array)');
}

if (!Array.isArray(data.growth)) {
  errors.push('growth must be an array');
} else {
  // Validate growth entries
  data.growth.forEach((entry, index) => {
    if (!entry.date) {
      errors.push(`growth[${index}]: Missing "date" field`);
    }
    if (typeof entry.patternsAdded !== 'number') {
      errors.push(`growth[${index}]: "patternsAdded" must be a number`);
    }
  });
}

if (typeof data.lastUpdated !== 'string') {
  errors.push('lastUpdated must be a string (ISO date)');
}

// Report errors
if (errors.length > 0) {
  console.error('❌ Validation failed with errors:\n');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error(`\nTotal errors: ${errors.length}`);
  process.exit(1);
}

// Success
console.log('✅ Statistics validation passed!');
console.log(`   Total patterns: ${data.totalPatterns}`);
console.log(`   Total contributors: ${data.totalContributors}`);
console.log(`   Total learning events: ${data.totalLearningEvents}`);
console.log(`   Last updated: ${data.lastUpdated}`);
process.exit(0);
