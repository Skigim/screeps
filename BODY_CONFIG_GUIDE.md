## 📦 BODY CONFIG SYSTEM

### Quick Reference

The body config system lets you define creep bodies once, then spawn them with simple names.

---

## Usage Examples

### **Spawn with preset body**
```javascript
// Predefined bodies (auto-registered at startup)
spawnCreep('Harvester1', 'harvester', 'harvester_basic', 'W1N1')
spawnCreep('Scout1', 'scout', 'scout', 'W1N1')
spawnCreep('Hauler1', 'hauler', 'hauler', 'W1N1')
```

### **Spawn with custom body**
```javascript
// Define body parts inline
spawnCreep('Expert1', 'harvester', [WORK, WORK, CARRY, MOVE], 'W1N1')
```

### **Register a custom body**
```javascript
// Save it for later use
regBody('harvester_v2', [WORK, WORK, CARRY, CARRY, MOVE], 'harvester')

// Then spawn with it
spawnCreep('Harvester2', 'harvester', 'harvester_v2', 'W1N1')
```

---

## Default Bodies (Pre-Registered)

| Name | Parts | Cost | Role |
|------|-------|------|------|
| `harvester_basic` | W, C, M | 200E | harvester |
| `upgrader_basic` | W, C, M | 200E | upgrader |
| `builder_basic` | W, C, M | 200E | builder |
| `scout` | M | 50E | scout |
| `hauler` | C, C, C, M, M | 250E | hauler |
| `worker` | W, W, C, M | 250E | worker |

---

## Console Commands

```javascript
bodies()              // List all registered bodies
bodies('harvester')   // List bodies for a role

regBody(name, parts, role)  // Register a new body
// Example:
regBody('cheap', [WORK, MOVE], 'harvester')

spawnCreep(name, role, body, room)  // Spawn with body
// Example:
spawnCreep('Cheap1', 'harvester', 'cheap', 'W1N1')
```

---

## Body Part Abbreviations

| Part | Constant | Cost | Function |
|------|----------|------|----------|
| W | WORK | 100E | Harvest, upgrade, build, repair |
| C | CARRY | 50E | Store energy |
| M | MOVE | 50E | Movement |
| A | ATTACK | 80E | Melee attack |
| H | HEAL | 250E | Heal creeps |
| R | RANGED_ATTACK | 150E | Ranged attack |
| T | TOUGH | 10E | Extra HP (10% damage reduction) |
| CL | CLAIM | 600E | Claim controllers |

---

## Why Use Body Configs?

**Benefits:**
- ✅ **Reusability**: Define once, use many times
- ✅ **Easy tweaking**: Update one config instead of multiple spawns
- ✅ **Console control**: Quick adjustments without editing code
- ✅ **Memory efficient**: Names stored, not full arrays
- ✅ **Consistency**: All harvester_v2 creeps have identical bodies

**Example:**
```javascript
// One command to optimize all scouts
regBody('scout_v2', [MOVE, MOVE], 'scout')

// Now spawn faster scouts everywhere
spawnCreep('FastScout1', 'scout', 'scout_v2', 'W1N1')
spawnCreep('FastScout2', 'scout', 'scout_v2', 'W1N1')
```

---

## Common Patterns

### **Aggressive Harvester** (early game)
```javascript
regBody('harvester_aggressive', [WORK, WORK, WORK, CARRY, MOVE], 'harvester')
spawnCreep('HarvestAgg1', 'harvester', 'harvester_aggressive', 'W1N1')
```

### **Carrier/Hauler** (lots of transport)
```javascript
regBody('hauler_mega', [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE], 'hauler')
spawnCreep('Hauler1', 'hauler', 'hauler_mega', 'W1N1')
```

### **Claimer** (expand to new rooms)
```javascript
regBody('claimer', [CLAIM, MOVE], 'claimer')
spawnCreep('Claimer1', 'claimer', 'claimer', 'W1N1')
```

### **Healer** (support unit)
```javascript
regBody('healer', [HEAL, HEAL, MOVE, MOVE], 'healer')
spawnCreep('Healer1', 'healer', 'healer', 'W1N1')
```

---

## Architecture

**File**: `src/world/spawns/bodies.ts`

**Functions:**
- `registerBody(name, parts, role)` - Register a body config
- `getBodyConfig(nameOrArray)` - Get body parts by name or return array
- `getBodyCost(nameOrArray)` - Calculate energy cost
- `listBodyConfigs(role?)` - List all or filter by role
- `registerDefaultBodies()` - Initialize presets (called at Game.time 0)

**Memory Location**:
```javascript
Memory.empire.bodyConfigs = {
  'scout': { name: 'scout', parts: [MOVE], role: 'scout', createdAt: 12345 },
  'harvester_v2': { ... }
}
```

---

## Workflow Example

```javascript
// 1. View what bodies exist
bodies()

// 2. Register a new optimization
regBody('harvester_turbo', [WORK, WORK, WORK, CARRY, CARRY, MOVE], 'harvester')

// 3. See it in the list
bodies('harvester')

// 4. Spawn with it
spawnCreep('TurboHarvest1', 'harvester', 'harvester_turbo', 'W1N1')

// 5. Use it repeatedly
spawnCreep('TurboHarvest2', 'harvester', 'harvester_turbo', 'W1N1')
spawnCreep('TurboHarvest3', 'harvester', 'harvester_turbo', 'W1N1')
```

---

## Pro Tips

- **Memory limited?** Use body configs to reuse names instead of storing full arrays
- **Testing builds?** Register and spawn quickly without code changes
- **RCL scaling?** Create new bodies for each RCL level (`harvester_rcl2`, `harvester_rcl3`, etc.)
- **Role optimization?** Export energy costs: a heavier body costs more but works better—choose based on room capacity

**Status**: ✅ Full system implemented, zero TypeScript errors, production-ready!
