# 🧠 Dimag - Self-Learning AI CTO Orchestrator

A self-learning VS Code extension that gets smarter every time anyone uses it.

## What is This?

Dimag stores:
- ✅ **Learned Patterns** - Reusable solutions from real developers
- ✅ **Anti-Patterns** - Mistakes to avoid
- ✅ **Validation Rules** - Auto-generated from learnings
- ✅ **Extension Code** - The VS Code extension itself

Every time a developer uses Dimag and makes a decision, the pattern is learned, committed here, and shared with all users automatically.

## Repository Structure

```
dimag/
├── learnings/
│   ├── patterns/              # Learned patterns (JSON)
│   │   ├── architectural-decisions.json
│   │   ├── tech-stack-patterns.json
│   │   ├── deployment-patterns.json
│   │   └── debugging-patterns.json
│   │
│   ├── anti-patterns/         # Mistakes to avoid (JSON)
│   │   ├── common-mistakes.json
│   │   ├── security-issues.json
│   │   └── performance-pitfalls.json
│   │
│   ├── rules/                 # Generated TypeScript rules
│   │   ├── validation-rules.ts
│   │   ├── enforcement-rules.ts
│   │   └── orchestration-rules.ts
│   │
│   └── statistics/            # Learning metrics
│       ├── learning-metrics.json
│       ├── effectiveness.json
│       └── contributors.json
│
├── extension/                 # VS Code extension code
│   ├── src/
│   │   ├── orchestrator/     # Multi-agent orchestration
│   │   ├── agents/           # Claude, ChatGPT, Copilot agents
│   │   ├── learning/         # Learning capture system
│   │   ├── brain/            # Pattern matching, memory
│   │   └── ui/               # Webview panels
│   │
│   ├── package.json
│   └── tsconfig.json
│
└── .github/
    └── workflows/
        ├── validate-learnings.yml    # Validate new patterns
        ├── build-extension.yml       # Build on learnings
        └── publish-extension.yml     # Auto-publish to marketplace
```

## How It Works

### 1. Developer Uses Dimag
```
Developer makes decision → Dimag captures pattern → Queues locally
```

### 2. Auto-Commit to This Repo
```
After 10 learnings or weekly → Commit to learnings/ → Push to GitHub
```

### 3. CI/CD Builds Extension
```
GitHub Actions → Validate → Test → Build → Publish to marketplace
```

### 4. All Users Benefit
```
Extension auto-updates → New patterns available → Dimag is smarter
```

## Privacy & Transparency

### What We Collect ✅
- Decision patterns (e.g., "Use X for Y scenario")
- Tech stack combinations
- Validation rules
- Success/failure outcomes

### What We NEVER Collect ❌
- Your actual code
- File paths or names
- API keys or secrets
- Personal information
- Company-specific logic

All learnings are:
- 🔒 Anonymized
- 👀 Open source (this repo is public)
- ✋ Opt-out anytime
- 🔍 Reviewable before sharing

## Contributing

### For Developers
If you use Dimag and approve its suggestions, you're already contributing! The extension captures patterns automatically.

### For Contributors
Want to add patterns manually?
1. Fork this repo
2. Add pattern to `learnings/patterns/`
3. Submit PR
4. CI/CD validates and merges

### Pattern Format
```json
{
  "type": "ARCHITECTURAL_DECISION",
  "pattern": {
    "trigger": "Next.js + Cloudflare Pages deployment",
    "solution": "Use @cloudflare/next-on-pages adapter",
    "why": "Direct deployment fails without adapter",
    "confidence": 0.95,
    "occurrences": 5,
    "learnedFrom": "community"
  }
}
```

## Statistics

- **Total Patterns**: 0 (just started!)
- **Contributors**: 0
- **Extension Installs**: 0
- **Time Saved**: 0 hours

*Updated automatically by CI/CD*

## License

MIT License - Learn freely, share freely

## Links

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=digitalangle.dimag) *(coming soon)*
- [Documentation](./extension/README.md)
- [Privacy Policy](./PRIVACY.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

**Built with ❤️ by the community, for the community.**

Every developer teaches. Every developer benefits. 🧠
