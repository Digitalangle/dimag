# Dimag Brain Validation Scripts

Automated validation scripts for ensuring pattern quality and consistency.

## Scripts

### 1. `validate-patterns.js`
Validates the structure of pattern JSON files.

**Checks:**
- JSON syntax validity
- Required fields present (`id`, `category`, `pattern`, `metadata`)
- Pattern confidence in valid range (0-1)
- Success rate in valid range (0-1)
- Metadata completeness
- Total patterns count matches array length

**Usage:**
```bash
node validate-patterns.js
```

---

### 2. `validate-statistics.js`
Validates the statistics JSON file structure.

**Checks:**
- JSON syntax validity
- Required fields present
- Correct data types
- Growth array structure
- Category object structure

**Usage:**
```bash
node validate-statistics.js
```

---

### 3. `check-duplicates.js`
Checks for duplicate patterns.

**Checks:**
- Duplicate pattern IDs
- Similar patterns (same context + solution)
- Warns about potential duplicates without failing

**Usage:**
```bash
node check-duplicates.js
```

---

### 4. `validate-quality.js`
Validates pattern quality standards.

**Checks:**
- Minimum confidence threshold (0.5)
- Minimum success rate (0.5)
- Minimum usage count (2)
- Non-empty context and solution
- Calculates quality metrics

**Usage:**
```bash
node validate-quality.js
```

---

## Run All Validations

```bash
npm run validate
```

This runs all four validation scripts in sequence.

---

## CI/CD Integration

These scripts are automatically run by GitHub Actions when:
- Pattern files are modified
- Pull requests are created
- Commits are pushed to main

See `.github/workflows/validate-learnings.yml` for the full CI workflow.

---

## Exit Codes

- `0`: All validations passed
- `1`: Validation failed (errors found)

Warnings do not cause failure but are reported for manual review.

---

## Quality Standards

### Minimum Requirements

| Metric | Minimum | Recommended |
|--------|---------|-------------|
| Confidence | 0.5 | 0.7 |
| Success Rate | 0.5 | 0.7 |
| Usage Count | 2 | 5 |
| Context Fields | 1 | 3+ |
| Technologies | 0 | 2+ |

Patterns below minimum requirements will fail validation.

---

## Development

To add new validations:

1. Create new script in `scripts/` directory
2. Add to `package.json` scripts
3. Update GitHub Actions workflow
4. Document here

---

## Dependencies

```bash
cd scripts
npm install
```

Only dependency: `ajv` (JSON schema validation, currently unused but reserved for future)
