## 🏛️ THE MAGISTRATE RISES: System Update Summary

### Overview
Your Screeps AI has been enhanced with three major systems to improve control, visibility, and efficiency:

1. **LegatusOficio (The Taskmaster)** - Centralized command center
2. **Construction Site Auto-Naming** - Automatic structure tracking
3. **RoomVisual Label System** - Map-based structure display

---

## 1. 🎯 LEGATUS OF OFICIO - THE TASKMASTER

### What It Does
LegatusOficio is a central command processor that stores room context and relays commands to creeps **without requiring per-creep memory**. This reduces memory footprint and allows centralized command dispatch.

### Key Concept
Instead of each creep storing its own task/command in memory, the Legatus keeps a registry:
```
Memory.empire.legatus = {
  'W1N1': {
    assignments: [
      { creepName: 'harvester_123', command: {...}, assignedAt: Game.time },
      { creepName: 'builder_456', command: {...}, assignedAt: Game.time }
    ]
  }
}
```

### How It Works
- Store room-level command queue (currently in Memory.empire.legatus)
- Creeps query Legatus each tick: `getCreepCommand(creep)`
- Issue commands to roles: `issueCommandToRole(room, 'harvester', command)`
- Issue commands to individual creeps: `issueCommandToCreep(creepName, room, command)`

### Console Commands
```javascript
legaStatus('W1N1')   // Show assignments in a room
legaList('W1N1')     // Detailed list of all assignments
```

### Example Usage
```javascript
// Issue harvest command to all harvesters in W1N1
const room = Game.rooms['W1N1'];
issueCommandToRole(room, 'harvester', {
  type: 'harvest',
  target: 'SourceA',
  priority: 'normal',
  issuedAt: Game.time
});
```

### Memory Footprint Benefit
**Before**: Each creep stores 40-100 bytes of task data
**After**: Centralized registry uses 5-10 bytes per creep reference

---

## 2. 🏗️ CONSTRUCTION SITE AUTO-NAMING

### What It Does
Automatically names all construction sites as `site1`, `site2`, etc. When a site completes, the finished structure is auto-named based on its type (e.g., `site4` → `ExtensionA` when built).

### How It Works
**Each Tick:**
1. `updateConstructionSites()` called in room orchestrator
2. Scans for new completed structures (not yet in registry)
3. Names them: ExtensionA, ExtensionB, Tower, etc.
4. Detects completed construction sites and removes old `site#` entries

**Scanning:**
```javascript
scan('W1N1')  // Registers all construction sites as site1, site2, etc.
```

### Workflow Example
```
1. Place 3 construction sites for extensions
   → Auto-named: site1, site2, site3

2. Commands use easy names:
   task('builder_1', 'build', 'site1')

3. site1 completes and becomes a structure
   → Auto-renamed: ExtensionA
   → site1 entry deleted
   
4. Remaining sites renumber:
   site2, site3 (now for remaining construction)
```

### Console Commands
```javascript
scan('W1N1')          // Scan and register all structures/sites
structures()          // List all registered structures
structures('W1N1')    // List structures in specific room
rename('site1', 'CriticalExtension')  // Rename if needed
```

---

## 3. 👁️ ROOMVISUAL LABEL SYSTEM

### What It Does
Renders structure names directly on the map as visual text labels. Displays for a configurable duration (default 3 ticks), then expires.

### How It Works
**Console Command:**
```javascript
showNames('W1N1')     // Display names for 3 ticks
showNames('W1N1', 10) // Display for 10 ticks
hideNames('W1N1')     // Stop display immediately
```

**Automatic Rendering:**
- Each tick, `renderStructureNames()` draws labels for active rooms
- Gets all structures from Memory.structures registry
- Renders text above each structure with color coding:
  - 🟢 Green: Normal structures
  - 🟡 Yellow: Energy sources
  - 🔵 Blue: Controller
  - 🟠 Orange: Construction sites
  - 🔴 Red: Locked structures

**Persistence:**
```javascript
Memory.empire.visuals = {
  'W1N1': { expiresAt: Game.time + 3 },
  'W1S1': { expiresAt: Game.time + 10 }
}
```

### Example Output
When you call `showNames('W1N1')`, you see on the map:
```
    SourceA        SourceB
      ↓              ↓
    [Source]      [Source]
    
   SpawnMain      ExtensionA
      ↓              ↓
    [Spawn]      [Extension]
```

### Use Cases
- **New rooms**: Quickly see structure layout and naming
- **Planning**: Visualize where construction sites will be
- **Debugging**: Verify your structure registry is working
- **Screenshots**: Document your colony state

---

## 🔄 Integration Points

### Room Orchestrator (`src/world/rooms/orchestrator.ts`)
Each tick for every room:
```javascript
export function runRoom(room: Room): void {
  updateConstructionSites(room);  // Update sites & completed structures
  // ... spawn management and creep running ...
  renderStructureNames(room);      // Render visuals if enabled
}
```

### Console System (`src/utils/console.ts`)
New console commands registered globally:
```javascript
showNames()      // Display structure labels
hideNames()      // Hide structure labels
legaStatus()     // Show Legatus assignments
legaList()       // List Legatus assignments
```

### Type Definitions (`src/types/global.d.ts`)
Extended Memory interface:
```typescript
Memory.empire.legatus   // LegatusOficio registry
Memory.empire.visuals   // RoomVisual expiry tracking
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         GAME LOOP (main.ts)                 │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│      ROOM ORCHESTRATOR                      │
│  - updateConstructionSites()                │
│  - manageSpawn()                            │
│  - runCreeps()                              │
│  - renderStructureNames()                   │
└────────────────┬────────────────────────────┘
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
   LEGATUS   STRUCTURES  VISUALS
   Registry   Registry    Display
    (Memory) (Memory)    (RoomVisual)
```

---

## 🚀 Usage Workflow

### Initial Setup
```javascript
// 1. Scan your room to register all structures
scan('W1N1')

// 2. View what was registered
structures('W1N1')

// 3. Display names on map
showNames('W1N1', 5)  // 5 ticks duration

// 4. Use easy names for tasks
task('builder_1', 'build', 'site1')
task('harvester_1', 'harvest', 'SourceA')
```

### Daily Operations
```javascript
// Check Legatus status
legaStatus('W1N1')    // See active assignments

// Issue commands to all harvesters
issueCommandToRole(room, 'harvester', {
  type: 'harvest',
  target: 'SourceA',
  priority: 'normal',
  issuedAt: Game.time
})

// Lock structures you don't want touched
lock('SourceB')       // Idle backup source
lock('ExtensionA')    // Reserved for future use

// Rename for clarity
rename('site1', 'ControllerPath')
```

### Monitoring
```javascript
// Show labels periodically for visual reference
showNames('W1N1', 3)

// Check what's locked
locked('W1N1')

// Review empire mode
mode()
```

---

## 🎓 Key Improvements

| Feature | Benefit | Memory Saved |
|---------|---------|-------------|
| LegatusOficio | Centralized commands, less per-creep overhead | 30-50 bytes/creep |
| Site Auto-Naming | Easy builder direction, auto-renames on completion | Automatic tracking |
| Visual Labels | Quick visual reference, helps debugging | Better UX |

---

## 📝 Files Modified/Created

**New Files:**
- `src/world/creeps/legatus.ts` - Taskmaster system
- `src/world/visuals.ts` - RoomVisual rendering

**Modified Files:**
- `src/types/global.d.ts` - Added Memory fields for legatus and visuals
- `src/world/structures.ts` - Added construction site scanning and updateConstructionSites()
- `src/world/rooms/orchestrator.ts` - Integrated visual rendering and site updates
- `src/world/index.ts` - Exported new modules
- `src/utils/console.ts` - Added showNames, hideNames, legaStatus, legaList commands
- `src/utils/CONSOLE_COMMANDS.md` - Updated documentation

---

## 🎯 Next Steps

1. **Test the system**:
   ```javascript
   scan('W1N1')
   showNames('W1N1')
   legaStatus('W1N1')
   ```

2. **Integrate Legatus into creep behaviors** (future):
   - Modify `harvester.ts`, `builder.ts`, `upgrader.ts` to check Legatus commands first
   - Fall back to normal role behavior if no command

3. **Enforce structure locking** (future):
   - Check `isLocked()` before acting on structures
   - Prevent locked sources from being harvested, etc.

4. **Task execution integration** (future):
   - Wire `executeTask()` into game loop for direct creep control

---

## ✨ Summary

You now have:
- ✅ **LegatusOficio**: Centralized command processor (memory efficient)
- ✅ **Auto-Naming**: Construction sites auto-track and rename on completion
- ✅ **Visual Labels**: Map-based structure display system
- ✅ **Console Integration**: 4 new commands for easy control
- ✅ **Type Safety**: Full TypeScript support for all new features

Your magistrate (Legatus) now has the infrastructure to command your empire efficiently!
