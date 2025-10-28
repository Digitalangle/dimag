# 🚀 Dimag Extension - Installation & Testing Guide

## 📋 Table of Contents
- [Quick Testing (F5 Method)](#quick-testing-f5-method)
- [Local Installation (.vsix)](#local-installation-vsix)
- [Repository Visibility (Public vs Private)](#repository-visibility-public-vs-private)
- [Marketplace Publishing](#marketplace-publishing)

---

## 🧪 Quick Testing (F5 Method)

**Best for:** Development and debugging
**Time:** Instant
**Installation:** Not required

### Steps:

```bash
# 1. Open the extension folder
cd /Users/da-studio2/Documents/dimag-brain/extension
code .

# 2. Press F5 (or Run → Start Debugging)
# This launches a new "Extension Development Host" window

# 3. In the Extension Development Host window:
#    - Learning consent dialog should appear
#    - Status bar shows "🧠 Dimag"
#    - Press Cmd+Shift+P and type "Dimag" to see commands

# 4. Test commands:
#    - Dimag: Show Learning Dashboard
#    - Dimag: Analyze and Improve Project
#    - Dimag: Sync Learnings from Community

# 5. Debug Console (in original window):
#    - View → Debug Console
#    - See all console.log output and errors

# 6. Stop testing:
#    - Click red square in Debug toolbar
```

### What Gets Tested:
- ✅ Extension activation
- ✅ Command registration
- ✅ Learning consent dialog
- ✅ Dashboard UI
- ✅ Learning capture
- ✅ All functionality in isolated environment

### Pros:
- ✅ Instant - no compilation or packaging
- ✅ Live debugging with breakpoints
- ✅ Console logs visible
- ✅ Doesn't affect your main VS Code

### Cons:
- ⚠️ Separate VS Code window (Extension Development Host)
- ⚠️ Settings isolated from main VS Code
- ⚠️ Needs to be relaunched each time

---

## 📦 Local Installation (.vsix)

**Best for:** Testing in real VS Code environment
**Time:** 2-3 minutes
**Installation:** Creates installable package

### Steps:

```bash
# 1. Navigate to extension folder
cd /Users/da-studio2/Documents/dimag-brain/extension

# 2. Install packaging tool (one-time)
npm install -g @vscode/vsce

# 3. Compile TypeScript
npm run compile

# 4. Create .vsix package
vsce package
# Creates: dimag-0.1.0.vsix

# 5. Install in VS Code (Option A - Command Line)
code --install-extension dimag-0.1.0.vsix

# OR (Option B - VS Code UI)
# - Open VS Code
# - Extensions sidebar (Cmd+Shift+X)
# - Click "..." menu (top right)
# - Select "Install from VSIX..."
# - Choose dimag-0.1.0.vsix

# 6. Reload VS Code
# Cmd+Shift+P → "Developer: Reload Window"
```

### What Gets Tested:
- ✅ Real VS Code environment
- ✅ Persistent settings
- ✅ Works across all VS Code windows
- ✅ Exactly as users will experience it

### Pros:
- ✅ Tests in real VS Code (not isolated)
- ✅ Settings persist
- ✅ Available in all workspaces
- ✅ True user experience

### Cons:
- ⚠️ Need to repackage after code changes
- ⚠️ Need to uninstall/reinstall for updates
- ⚠️ No debugging features

### Uninstall:
```bash
# Command line
code --uninstall-extension digitalangle.dimag

# OR via VS Code UI
# Extensions sidebar → Dimag → Uninstall
```

---

## 🌍 Repository Visibility (Public vs Private)

### ❓ Does the repository HAVE to be public?

**Answer: NO!** The repository can be either public or private.

### Option 1: Private Repository ✅ RECOMMENDED FOR NOW

**Pros:**
- ✅ Keep patterns proprietary during development
- ✅ Control who can see and contribute
- ✅ Test thoroughly before going public
- ✅ Works perfectly with VS Code Git authentication

**Cons:**
- ⚠️ Requires GitHub paid plan OR organization with private repos
- ⚠️ No community contributions
- ⚠️ Patterns not shared publicly

**Setup:**
```bash
# When creating on GitHub:
1. Go to github.com/digitalangle
2. Create new repository: "dimag-brain"
3. Select: ⚫ Private  # ← Choose private
4. Don't initialize with README
```

**How it works:**
- VS Code Git authentication handles private repos automatically
- Your Git credentials (already configured in VS Code) are used
- No additional setup needed
- Extension can clone, pull, and push to private repo

---

### Option 2: Public Repository

**Pros:**
- ✅ Open-source community learning
- ✅ Anyone can contribute patterns
- ✅ Full transparency
- ✅ Free on GitHub

**Cons:**
- ⚠️ Everyone can see your patterns
- ⚠️ Anyone can submit patterns (need moderation)
- ⚠️ Harder to control quality initially

**Setup:**
```bash
# When creating on GitHub:
1. Go to github.com/digitalangle
2. Create new repository: "dimag-brain"
3. Select: ⚪ Public  # ← Choose public
4. Don't initialize with README
```

---

### 🎯 Recommendation: START PRIVATE

**Phase 1 (Now - Testing):**
- Create as **PRIVATE**
- Test learning system thoroughly
- Ensure quality patterns are being generated
- No public exposure during development

**Phase 2 (After Testing):**
- Make repository **PUBLIC** when ready
- Enable community contributions
- Add CONTRIBUTING.md guidelines
- Set up pattern review process

**How to switch:**
```bash
# Make public later:
# GitHub → Repository Settings → Danger Zone → Change visibility → Make public
```

---

## 🏪 Marketplace Publishing

**Best for:** Public distribution
**Time:** 5-10 minutes (first time)
**Installation:** Users install from VS Code Marketplace

### Prerequisites:

1. **Microsoft Publisher Account**
   - Go to: https://marketplace.visualstudio.com/manage
   - Sign in with Microsoft account
   - Create publisher (e.g., "digitalangle")

2. **Personal Access Token (PAT)**
   - Go to: https://dev.azure.com
   - User Settings → Personal Access Tokens
   - Create token with "Marketplace (Manage)" permission
   - Save token securely

### Steps:

```bash
# 1. Set up credentials
export VSCE_PAT="your-personal-access-token"

# 2. Login to publisher
vsce login digitalangle

# 3. Publish extension
cd /Users/da-studio2/Documents/dimag-brain/extension
vsce publish

# Extension is now live on VS Code Marketplace!
# Users can install: Extensions → Search "Dimag"
```

### Automated Publishing (GitHub Actions):

Our `.github/workflows/publish-extension.yml` workflow automates this!

**Setup:**
1. Add GitHub secrets:
   - `VSCE_PAT` - Your Visual Studio Marketplace token
   - `OVSX_PAT` - Open VSX token (optional, for open-source registry)

2. Trigger publish:
   ```bash
   # Option A: Create GitHub release
   git tag v0.1.0
   git push origin v0.1.0
   # Workflow runs automatically

   # Option B: Manual dispatch
   # GitHub → Actions → Publish Extension → Run workflow
   ```

---

## 🔄 Complete Testing Workflow

### Recommended order:

```bash
# 1. DEVELOPMENT (Daily)
cd extension && code .
# Press F5 to test changes
# Iterate quickly with live debugging

# 2. LOCAL TESTING (Before commit)
npm run compile
vsce package
code --install-extension dimag-0.1.0.vsix
# Test in real VS Code environment

# 3. CI/CD (On commit)
git add -A && git commit -m "..."
git push
# GitHub Actions runs builds and tests

# 4. PUBLISH (When ready)
git tag v0.1.0
git push origin v0.1.0
# GitHub Actions publishes to marketplace
```

---

## 🆘 Troubleshooting

### F5 doesn't work
```bash
# Check launch.json exists
ls .vscode/launch.json

# If missing, VS Code will create it when you press F5
```

### Extension doesn't activate
```bash
# Check Debug Console for errors
# View → Debug Console

# Common issues:
# - TypeScript not compiled: npm run compile
# - Dependencies missing: npm install
# - Syntax errors: Check Debug Console
```

### .vsix installation fails
```bash
# Ensure package was created successfully
ls dimag-*.vsix

# Try verbose install
code --install-extension dimag-0.1.0.vsix --force

# Check VS Code version
code --version  # Should be 1.85.0 or higher
```

### Private repo access fails
```bash
# Extension uses VS Code Git credentials
# Ensure you're signed into GitHub in VS Code:
# Accounts icon (bottom left) → Sign in with GitHub

# Test Git access manually
cd ~/.vscode/extensions
git clone https://github.com/digitalangle/dimag-brain.git
# If this works, extension will work
```

---

## 📚 Additional Resources

- **VS Code Extension API:** https://code.visualstudio.com/api
- **Extension Testing:** https://code.visualstudio.com/api/working-with-extensions/testing-extension
- **Publishing Extensions:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **vsce CLI:** https://github.com/microsoft/vscode-vsce

---

## ✅ Quick Reference

| Method | Use Case | Time | Installation |
|--------|----------|------|--------------|
| **F5 Debug** | Development | Instant | None |
| **.vsix Local** | Real testing | 3 min | Temporary |
| **Marketplace** | Public release | 10 min | Permanent |

**For now:** Use **F5 Debug** for testing while developing.

**When ready:** Create **private repository** and test thoroughly.

**Future:** Publish to **marketplace** when confident and ready for users.

---

*All installation methods stored in Dimag memory for future reference.*
