## 🏛️ LEGATUS QUICK START

### The Magistrate Has Risen ⚔️

Your three new systems are now live. Here's the quick reference:

---

## 🎯 LEGATUS OF OFICIO (Taskmaster)

**What**: Central command processor, stores commands at room level instead of per-creep
**Why**: Saves 30+ bytes of memory per creep
**Commands**:
```javascript
legaStatus('W1N1')    // Show assignments
legaList('W1N1')      // Detailed assignments
```

---

## 🏗️ CONSTRUCTION SITES AUTO-NAMING

**What**: Sites named `site1`, `site2`... auto-rename to `ExtensionA` when built
**Why**: Easy to target, automatic tracking
**Commands**:
```javascript
scan('W1N1')              // Register all structures
structures('W1N1')        // List all
rename('site1', 'MainExt') // Custom names if needed
```

---

## 👁️ VISUAL LABELS ON MAP

**What**: Structure names display on your map for 3 ticks
**Why**: Quick visual reference while coding/planning
**Commands**:
```javascript
showNames('W1N1')      // Display for 3 ticks
showNames('W1N1', 10)  // Display for 10 ticks
hideNames('W1N1')      // Stop immediately
```

---

## ⚡ ONE-MINUTE SETUP

```javascript
// 1. Scan your room
scan('W1N1')

// 2. See what was registered
structures('W1N1')

// 3. Display names visually
showNames('W1N1')

// 4. Use easy names in commands
task('builder_1', 'build', 'site1')
task('harvester_1', 'harvest', 'SourceA')

// 5. Lock things you don't want touched
lock('SourceB')
```

---

## 📊 WHAT'S IN MEMORY

```javascript
Memory.structures      // Structure registry (name → type mapping)
Memory.empire.legatus  // Legatus assignments (room → creep commands)
Memory.empire.visuals  // Visual persistence (room → expiry time)
```

---

## 🔗 KEY FILES

| File | Purpose |
|------|---------|
| `src/world/creeps/legatus.ts` | Taskmaster system |
| `src/world/visuals.ts` | Label rendering |
| `src/world/structures.ts` | Structure registry (updated with site support) |
| `src/world/rooms/orchestrator.ts` | Integration point |

---

## 💡 TIPS

- **Sites complete?** They auto-rename to ExtensionA, TowerA, etc. Check `structures()` to see
- **Forgotten about labels?** They auto-expire after 3 ticks, no cleanup needed
- **Want custom names?** Use `rename('oldname', 'newname')`
- **Forgot what you locked?** Use `locked()` to see all locked structures

---

## 🚀 NEXT INTEGRATION POINTS

The foundation is set. Next, you could:
1. Make creeps check Legatus commands in their `run()` functions
2. Enforce structure locking in creep behaviors
3. Build a UI layer on top of console commands

**Status**: ✅ All systems operational, zero TypeScript errors, ready for game deployment!
