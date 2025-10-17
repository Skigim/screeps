# 🔍 Project Imperium - Debugging Guide

## Console Log Symbols

### Task Assignment
- `📋` - Creep assigned to new task
- `💤` - Creep idle (no tasks available)
- `⚠️` - Warning (executor not found, task missing)

### Task Execution
- `⚙️` - Executing task
- `📊` - Task result status
- `🔧` - UpgradeExecutor debug info (energy, distance, position)
- `🚶` - Movement command issued
- `📍` - Movement result code

### Task Results
- `✅` - Task completed successfully
- `❌` - Task failed
- `🚫` - Task blocked

## Common Issues & Solutions

### Issue: "Upgrader spawned and received assignment but doesn't move"

**Possible Causes:**

1. **Creep has no energy**
   - Console will show: `🔧 CreepName: Energy=0`
   - Fix: Creep needs to harvest or withdraw energy first
   - Expected: Task completes, creep gets reassigned to HARVEST_ENERGY

2. **moveTo returns ERR_NO_PATH**
   - Console will show: `📍 CreepName: moveTo result = -2`
   - Fix: Controller might be blocked, check room layout
   - Solution: Remove blocking structures or wait for path to clear

3. **moveTo returns ERR_TIRED**
   - Console will show: `📍 CreepName: moveTo result = -4`
   - This is normal: Creep moved successfully but fatigued
   - Will continue moving next tick

4. **Task not in task list**
   - Console will show: `⚠️ CreepName: Task TASK_ID not found`
   - Issue: Taskmaster not generating upgrade tasks
   - Check: Controller level, energy availability

5. **No executor registered**
   - Console will show: `⚠️ CreepName: No executor for task type UPGRADE_CONTROLLER`
   - Issue: ExecutorFactory not initialized
   - Check: Should see `✅ ExecutorFactory initialized with X executors` on first tick

## Debug Console Commands

### Check Creep Status
```javascript
Game.creeps['CreepName'].memory
// Shows: { task: 'TASK_ID', role: 'upgrader' }

Game.creeps['CreepName'].store.getUsedCapacity(RESOURCE_ENERGY)
// Shows: Current energy amount

Game.creeps['CreepName'].pos
// Shows: RoomPosition object
```

### Check Task List
```javascript
// In console after tasks generated
Game.rooms['RoomName'].memory.tasks
// Shows: Array of current tasks (if you're storing them)
```

### Force Task Reassignment
```javascript
Game.creeps['CreepName'].memory.task = undefined
// Clears current task, creep will be reassigned next tick
```

### Check Controller
```javascript
Game.rooms['RoomName'].controller.pos
// Shows: Controller position

Game.rooms['RoomName'].controller.level
// Shows: Current RCL
```

## Expected Console Output (Normal Operation)

### First Tick (Initialization)
```
🏛️ The Empire awakens...
⚔️ Ave Imperator! Project Imperium initializing...
✅ ExecutorFactory initialized with 14 executors
```

### Creep Spawn
```
📋 Upgrader1 assigned to UPGRADE_CONTROLLER
```

### Upgrader With Energy (Moving)
```
⚙️ Upgrader1: Executing UPGRADE_CONTROLLER (room_upgrade_12345)
🔧 Upgrader1: Energy=50, Distance=8, Pos=[room E1 x10y20]
🚶 Upgrader1: Moving to controller at [room E1 x25y25]
📍 Upgrader1: moveTo result = 0
📊 Upgrader1: Result = IN_PROGRESS, Moving to controller (0)
```

### Upgrader With Energy (At Controller)
```
⚙️ Upgrader1: Executing UPGRADE_CONTROLLER (room_upgrade_12345)
🔧 Upgrader1: Energy=50, Distance=2, Pos=[room E1 x23y24]
📊 Upgrader1: Result = IN_PROGRESS, Upgrading
```

### Upgrader Out of Energy
```
⚙️ Upgrader1: Executing UPGRADE_CONTROLLER (room_upgrade_12345)
🔧 Upgrader1: Energy=0, Distance=2, Pos=[room E1 x23y24]
📊 Upgrader1: Result = COMPLETED, No energy
✅ Upgrader1 completed UPGRADE_CONTROLLER
📋 Upgrader1 assigned to HARVEST_ENERGY
```

## moveTo Return Codes

| Code | Constant | Meaning | Action |
|------|----------|---------|--------|
| 0 | OK | Success | Continue |
| -2 | ERR_NO_PATH | No path found | Check obstacles |
| -4 | ERR_TIRED | Fatigue (moved successfully) | Normal, wait |
| -7 | ERR_INVALID_TARGET | Target invalid | Task error |
| -10 | ERR_INVALID_ARGS | Bad arguments | Code bug |

## Troubleshooting Steps

1. **Check console for initialization message**
   - Should see "ExecutorFactory initialized"
   
2. **Verify creep has task assigned**
   - Look for "📋 CreepName assigned to..."
   
3. **Check executor is being called**
   - Look for "⚙️ CreepName: Executing..."
   
4. **Check energy level**
   - Look for "🔧 CreepName: Energy=X"
   
5. **Check movement**
   - Look for "🚶 CreepName: Moving to..."
   - Check moveTo result code
   
6. **Verify task completion logic**
   - Look for "✅ CreepName completed..."
   - Should see reassignment immediately after

## Quick Fixes

### Creep stuck idle:
```javascript
// Clear task and force reassignment
Game.creeps['CreepName'].memory.task = undefined;
```

### Force all creeps to reset:
```javascript
Object.values(Game.creeps).forEach(c => c.memory.task = undefined);
```

### Check executor count:
```javascript
// Should return ~14
ExecutorFactory.getExecutorCount()
```

## Performance Notes

- Enhanced logging adds ~900 bytes to bundle
- Minimal CPU impact (<0.1 per creep)
- Can remove debug logs after testing by:
  1. Remove console.log statements from UpgradeExecutor
  2. Remove console.log statements from LegatusLegionum
  3. Rebuild and redeploy

**Ave Imperator! Debug wisely!** 🔍⚔️
