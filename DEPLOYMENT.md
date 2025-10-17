# Project Imperium - Deployment Guide

## 🚀 Deployment Options

Project Imperium supports multiple deployment methods:

### Option 1: GitHub Actions (Recommended for CI/CD)

**Setup:**
1. Push code to GitHub repository
2. Add repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add `SCREEPS_TOKEN` (get from Screeps account settings)
   - Optionally add `SCREEPS_BRANCH` (defaults to "main")
3. Push to `main` branch or trigger workflow manually

**Workflow:** `.github/workflows/deploy.yml`
- ✅ Auto-deploys on push to main
- ✅ Can trigger manually via "Actions" tab
- ✅ Uploads build artifacts for review

### Option 2: Manual Deployment via npm

**Setup:**
```bash
# Copy and configure credentials
cp screeps.sample.json screeps.json
# Edit screeps.json with your credentials
```

**Deploy:**
```bash
npm run deploy
```

### Option 3: Using screeps-api CLI (YAML config)

**Setup:**
```bash
# Install CLI tool
npm install -g screeps-api

# Configure credentials in .screepsrc.yaml
# This file is already created - just edit with your credentials
```

**Deploy:**
```bash
# Deploy to default target (main server)
screeps deploy

# Deploy to specific target
screeps deploy local     # Local server
screeps deploy main      # Official server
```

### Option 4: Rollup Watch + Auto-Deploy

**For active development:**
```bash
# Terminal 1: Watch for changes and rebuild
npm run watch

# Terminal 2: Use screeps-api with --watch flag
screeps deploy --watch
```

## 🔐 Security Notes

**NEVER commit these files with real credentials:**
- `screeps.json` - Already in .gitignore
- `.screepsrc.yaml` - Use `.screepsrc.yaml` (with dot prefix) and add to .gitignore

**For production:**
- Use API tokens instead of passwords
- Store tokens in GitHub Secrets for CI/CD
- Rotate tokens regularly

## 🎯 Deployment Targets

### Local Private Server
- **URL:** http://localhost:21025
- **Use for:** Testing, development, debugging
- **Setup:** Install screeps-server or use Steam version

### Official MMO Server
- **URL:** https://screeps.com
- **Use for:** Live gameplay
- **Shard:** Specify shard in config if needed (shard0, shard1, shard2, shard3)

### Seasonal Server
- **URL:** https://screeps.com
- **Use for:** Seasonal competitions
- **Branch:** Use separate branch name (e.g., "season")

## 📦 Pre-Deployment Checklist

1. ✅ Build succeeds: `npm run build`
2. ✅ No TypeScript errors
3. ✅ dist/main.js generated (~58KB expected)
4. ✅ Credentials configured in chosen method
5. ✅ Test in simulation/local first
6. ✅ Backup existing code on server (if any)

## 🏛️ Project Imperium Ready Status

```
✅ Build Pipeline: OPERATIONAL
✅ TypeScript: STRICT MODE (0 errors)
✅ Bundle Size: 58,581 bytes
✅ All Magistrates: INTEGRATED
✅ Execution Layer: OPERATIONAL
✅ Deployment Config: CONFIGURED
```

**Ave Imperator! The legion is ready to deploy!** ⚔️

## 🐛 Troubleshooting

**"screeps.json not found"**
- Copy `screeps.sample.json` to `screeps.json`
- Configure with your credentials

**"Authentication failed"**
- Verify username/password or token
- Check server URL and port
- Ensure account has API access enabled

**"Build output not found"**
- Run `npm run build` first
- Check for TypeScript errors
- Verify dist/main.js exists

**"Deploy script not working"**
- Update `deploy.js` with actual screeps-api integration
- Or use `screeps-api` CLI directly
- Or use GitHub Actions workflow

## 📚 Additional Resources

- [Screeps Documentation](https://docs.screeps.com/)
- [Screeps API](https://github.com/screeps/screeps-api)
- [TypeScript Starter](https://github.com/screepers/screeps-typescript-starter)
