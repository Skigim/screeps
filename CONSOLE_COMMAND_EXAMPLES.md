# Console Command Examples - Argument Reference

Complete examples showing what values go in each argument for all console commands.

## Type Reference Quick Guide

```typescript
// String types
string                    // "E3S42", "H1", "harvester_basic", etc.

// Number types  
number                    // 25, 30, 10, 5, etc.

// Array types
BodyPartConstant[]        // [WORK, CARRY, MOVE]

// Room Position
RoomPosition              // new RoomPosition(25, 30, 'E3S42')

// Optional parameters (shown with ?)
room?: string             // Can be omitted - defaults to current room
duration?: number         // Can be omitted - defaults to 3
```

## Status & Info Commands

### `status()`
```typescript
status(roomName?: string): void
```

Display colony-wide status with all rooms and creep information.
```javascript
status()                    // string: undefined (show all rooms)
status('E3S42')             // string: "E3S42" (show specific room)
```

### `help()`
```typescript
help(): void
```

Display all available commands with usage information.
```javascript
help()                      // No arguments
```

### `memory()`
```typescript
memory(key?: string): void
```

View Memory structure and creep-specific data.
```javascript
memory()                    // string: undefined (show all)
memory('harvester_12345')   // string: "harvester_12345" (creep name)
memory('empire')            // string: "empire" (memory key)
```

### `config()`
```typescript
config(rcl?: number): void
```

View behavior configuration for different RCL levels.
```javascript
config()                    // number: undefined (all rooms)
config(1)                   // number: 1 (RCL 1)
config(2)                   // number: 2 (RCL 2)
```

### `rooms()`
```typescript
rooms(): void
```

List all owned rooms with stats.
```javascript
rooms()                     // No arguments
```

### `room()`
```typescript
room(name: string): Room | null
```

Get a specific Room object by name.
```javascript
room('E3S42')               // string: "E3S42"
room('W1N1')                // string: "W1N1"
```

---

## Spawning & Creep Management

### `spawn()`
```typescript
spawn(role: string, roomName?: string): Creep | false
```

Spawn a creep with auto-generated name. Room defaults to current room.

**Arguments:**
- `role: string` - Role type: `'harvester'` | `'upgrader'` | `'builder'` | `'scout'` | `'hauler'`
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
spawn('harvester')          // spawn(role: "harvester", roomName: undefined)
spawn('harvester', 'E3S42') // spawn(role: "harvester", roomName: "E3S42")
spawn('upgrader', 'W1N1')   // spawn(role: "upgrader", roomName: "W1N1")
spawn('builder')            // spawn(role: "builder", roomName: undefined)
spawn('scout', 'E3S42')     // spawn(role: "scout", roomName: "E3S42")
```

**Generated names will be:** `harvester_74178500`, `upgrader_74178501`, etc.

### `spawnCreep()`
```typescript
spawnCreep(
  creepName: string,
  role: string,
  bodyTypeOrArray: string | BodyPartConstant[],
  roomName?: string
): Creep | false
```

Spawn a creep with custom name and body config. Room defaults to current room.

**Arguments:**
- `creepName: string` - Custom creep name: `'H1'`, `'Harvester1'`, `'Scout_Alpha'`, etc.
- `role: string` - Role type: `'harvester'` | `'upgrader'` | `'builder'` | `'scout'` | `'hauler'` | `'worker'`
- `bodyTypeOrArray: string | BodyPartConstant[]` - Either a registered body config name OR an array of body parts
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
// Using named body configs (strings)
spawnCreep('H1', 'harvester', 'harvester_basic')
// spawnCreep(creepName: "H1", role: "harvester", bodyTypeOrArray: "harvester_basic", roomName: undefined)

spawnCreep('H1', 'harvester', 'harvester_basic', 'E3S42')
// spawnCreep(creepName: "H1", role: "harvester", bodyTypeOrArray: "harvester_basic", roomName: "E3S42")

spawnCreep('U1', 'upgrader', 'upgrader_basic')
// spawnCreep(creepName: "U1", role: "upgrader", bodyTypeOrArray: "upgrader_basic", roomName: undefined)

spawnCreep('B1', 'builder', 'builder_basic', 'W1N1')
// spawnCreep(creepName: "B1", role: "builder", bodyTypeOrArray: "builder_basic", roomName: "W1N1")

// Using custom body part arrays (BodyPartConstant[])
spawnCreep('H2', 'harvester', [WORK, WORK, CARRY, MOVE], 'E3S42')
// spawnCreep(creepName: "H2", role: "harvester", bodyTypeOrArray: [WORK, WORK, CARRY, MOVE], roomName: "E3S42")

spawnCreep('Worker', 'worker', [WORK, CARRY, MOVE])
// spawnCreep(creepName: "Worker", role: "worker", bodyTypeOrArray: [WORK, CARRY, MOVE], roomName: undefined)

spawnCreep('Mover', 'scout', [MOVE, MOVE])
// spawnCreep(creepName: "Mover", role: "scout", bodyTypeOrArray: [MOVE, MOVE], roomName: undefined)
```

### `despawn()`
```typescript
despawn(creepName: string): void
```

Delete a creep immediately.

**Arguments:**
- `creepName: string` - Name of creep to delete

```javascript
despawn('H1')               // despawn(creepName: "H1")
despawn('harvester_74178500')  // despawn(creepName: "harvester_74178500")
despawn('Scout_Alpha')      // despawn(creepName: "Scout_Alpha")
```

### `creeps()`
```typescript
creeps(roomName?: string): void
```

List all creeps, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name (optional, shows all if omitted)

```javascript
creeps()                    // creeps(roomName: undefined)
creeps('E3S42')             // creeps(roomName: "E3S42")
creeps('W1N1')              // creeps(roomName: "W1N1")
```

---

## Body Configuration

### `bodies()`
```typescript
bodies(role?: string): void
```

List all registered body configurations, optionally filtered by role.

**Arguments:**
- `role?: string` - Role name (optional, shows all if omitted)

```javascript
bodies()                    // bodies(role: undefined)
bodies('harvester')         // bodies(role: "harvester")
bodies('upgrader')          // bodies(role: "upgrader")
bodies('builder')           // bodies(role: "builder")
```

**Output examples:**
```
harvester_basic     [WORK, CARRY, MOVE]         Cost: 200
harvester_v2        [WORK, WORK, CARRY, MOVE]  Cost: 300
scout               [MOVE]                      Cost: 50
```

### `regBody()`
```typescript
regBody(name: string, partsArray: BodyPartConstant[], role?: string): void
```

Register a new body configuration.

**Arguments:**
- `name: string` - Unique config name: `'harvester_v2'`, `'my_scout'`, `'transport'`, etc.
- `partsArray: BodyPartConstant[]` - Array of body parts: `[WORK, WORK, CARRY, MOVE]`
- `role?: string` - Optional role label (defaults to `'generic'`)

```javascript
regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
// regBody(name: "harvester_v2", partsArray: [WORK, WORK, CARRY, MOVE], role: "harvester")

regBody('super_upgrader', [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE], 'upgrader')
// regBody(name: "super_upgrader", partsArray: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE], role: "upgrader")

regBody('fast_scout', [MOVE, MOVE])
// regBody(name: "fast_scout", partsArray: [MOVE, MOVE], role: undefined)

regBody('transport', [CARRY, CARRY, CARRY, MOVE, MOVE], 'hauler')
// regBody(name: "transport", partsArray: [CARRY, CARRY, CARRY, MOVE, MOVE], role: "hauler")
```

**Available body parts:** `MOVE`, `WORK`, `CARRY`, `ATTACK`, `RANGED_ATTACK`, `HEAL`, `TOUGH`, `CLAIM`

---

## Task Assignment

### `task()`
```typescript
task(creepName: string, taskType: string, targetId?: string): void
```

Assign a task to a creep.

**Arguments:**
- `creepName: string` - Name of creep: `'H1'`, `'harvester_74178500'`, `'Scout'`, etc.
- `taskType: string` - Task type: `'harvest'` | `'deliver'` | `'build'` | `'upgrade'` | `'repair'` | `'move'` | `'idle'`
- `targetId?: string` - Target identifier (depends on task type, optional for some tasks)

```javascript
// Harvest tasks (need source ID/name)
task('H1', 'harvest', 'SourceA')
// task(creepName: "H1", taskType: "harvest", targetId: "SourceA")

task('harvester_74178500', 'harvest', 'abc123def456')
// task(creepName: "harvester_74178500", taskType: "harvest", targetId: "abc123def456")

// Deliver tasks (need target structure ID/name)
task('H1', 'deliver', 'SpawnMain')
// task(creepName: "H1", taskType: "deliver", targetId: "SpawnMain")

task('Hauler1', 'deliver', 'ExtensionA')
// task(creepName: "Hauler1", taskType: "deliver", targetId: "ExtensionA")

// Build tasks (need construction site ID/name)
task('B1', 'build', 'site1')
// task(creepName: "B1", taskType: "build", targetId: "site1")

task('builder_74178600', 'build', 'def456abc123')
// task(creepName: "builder_74178600", taskType: "build", targetId: "def456abc123")

// Upgrade tasks (no target needed)
task('U1', 'upgrade')
// task(creepName: "U1", taskType: "upgrade", targetId: undefined)

task('upgrader_74178550', 'upgrade')
// task(creepName: "upgrader_74178550", taskType: "upgrade", targetId: undefined)

// Repair tasks (need structure ID/name)
task('B1', 'repair', 'Wall1')
// task(creepName: "B1", taskType: "repair", targetId: "Wall1")

task('repairBot', 'repair', 'abc123')
// task(creepName: "repairBot", taskType: "repair", targetId: "abc123")

// Move tasks (need position as "x:y:roomName" string format)
task('Scout', 'move', '25:30:E3S42')
// task(creepName: "Scout", taskType: "move", targetId: "25:30:E3S42")

task('H1', 'move', '10:15:E3S42')
// task(creepName: "H1", taskType: "move", targetId: "10:15:E3S42")

// Idle task (no target)
task('H1', 'idle')
// task(creepName: "H1", taskType: "idle", targetId: undefined)
```

### `tasks()`
```typescript
tasks(roomName?: string): void
```

View all tasks assigned to creeps, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name (optional, shows all if omitted)

```javascript
tasks()                     // tasks(roomName: undefined)
tasks('E3S42')              // tasks(roomName: "E3S42")
tasks('W1N1')               // tasks(roomName: "W1N1")
```

### `untask()`
```typescript
untask(creepName: string): void
```

Clear a task from a creep.

**Arguments:**
- `creepName: string` - Name of creep to clear task from

```javascript
untask('H1')                // untask(creepName: "H1")
untask('harvester_74178500')  // untask(creepName: "harvester_74178500")
```

---

## Structure Management

### `scan()`
```typescript
scan(roomName?: string): void
```

Register/update structures in a room. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, scans current room or all if none active)

```javascript
scan()                      // scan(roomName: undefined)
scan('E3S42')               // scan(roomName: "E3S42")
scan('W1N1')                // scan(roomName: "W1N1")
```

**Auto-generates names like:** `SourceA`, `SourceB`, `SpawnMain`, `ExtensionA`, `site1`, `Tower`, etc.

### `structures()`
```typescript
structures(roomName?: string): void
```

List all registered structures, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name (optional, shows all if omitted)

```javascript
structures()                // structures(roomName: undefined)
structures('E3S42')         // structures(roomName: "E3S42")
structures('W1N1')          // structures(roomName: "W1N1")
```

### `rename()`
```typescript
rename(oldName: string, newName: string): void
```

Rename a registered structure.

**Arguments:**
- `oldName: string` - Current structure name or ID
- `newName: string` - New name for the structure

```javascript
rename('SourceA', 'MainSource')
// rename(oldName: "SourceA", newName: "MainSource")

rename('SpawnMain', 'SpawnPrimary')
// rename(oldName: "SpawnMain", newName: "SpawnPrimary")

rename('ExtensionA', 'EastExtension')
// rename(oldName: "ExtensionA", newName: "EastExtension")

rename('site1', 'WallA')
// rename(oldName: "site1", newName: "WallA")
```

### `lock()`
```typescript
lock(nameOrId: string): void
```

Lock a structure to prevent creep actions on it.

**Arguments:**
- `nameOrId: string` - Structure registered name or structure ID

```javascript
lock('SourceA')             // lock(nameOrId: "SourceA")
lock('SpawnMain')           // lock(nameOrId: "SpawnMain")
lock('ExtensionA')          // lock(nameOrId: "ExtensionA")
lock('abc123def456')        // lock(nameOrId: "abc123def456")
```

### `unlock()`
```typescript
unlock(nameOrId: string): void
```

Unlock a structure to allow creep actions.

**Arguments:**
- `nameOrId: string` - Structure registered name or structure ID

```javascript
unlock('SourceA')           // unlock(nameOrId: "SourceA")
unlock('SpawnMain')         // unlock(nameOrId: "SpawnMain")
unlock('abc123def456')      // unlock(nameOrId: "abc123def456")
```

### `locked()`
```typescript
locked(roomName?: string): void
```

View all locked structures, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name (optional, shows all if omitted)

```javascript
locked()                    // locked(roomName: undefined)
locked('E3S42')             // locked(roomName: "E3S42")
locked('W1N1')              // locked(roomName: "W1N1")
```

---

## Visual Labels

### `showNames()`
```typescript
showNames(roomName?: string, duration?: number): void
```

Display structure names as labels on the map. Room defaults to current room, duration defaults to 3 ticks.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)
- `duration?: number` - How many ticks to display labels (optional, defaults to 3)

```javascript
showNames()                 // showNames(roomName: undefined, duration: 3)
showNames('E3S42')          // showNames(roomName: "E3S42", duration: 3)
showNames('E3S42', 10)      // showNames(roomName: "E3S42", duration: 10)
showNames('W1N1', 5)        // showNames(roomName: "W1N1", duration: 5)
```

### `hideNames()`
```typescript
hideNames(roomName?: string): void
```

Hide structure name displays. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
hideNames()                 // hideNames(roomName: undefined)
hideNames('E3S42')          // hideNames(roomName: "E3S42")
hideNames('W1N1')           // hideNames(roomName: "W1N1")
```

---

## Legatus Commands

### `legaStatus()`
```typescript
legaStatus(roomName?: string): void
```

Show LegatusOficio (command processor) assignments in a room. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
legaStatus()                // legaStatus(roomName: undefined)
legaStatus('E3S42')         // legaStatus(roomName: "E3S42")
legaStatus('W1N1')          // legaStatus(roomName: "W1N1")
```

**Output shows:**
- Creep name
- Command type (harvest, deliver, build, etc.)
- Time assigned (in ticks)

### `legaList()`
```typescript
legaList(roomName?: string): void
```

List all Legatus assignments in a room. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
legaList()                  // legaList(roomName: undefined)
legaList('E3S42')           // legaList(roomName: "E3S42")
legaList('W1N1')            // legaList(roomName: "W1N1")
```

---

## Movement & Navigation

### `goto()`
```typescript
goto(
  x: number | RoomPosition | string,
  y?: number,
  roomName?: string
): void
```

Move all creeps to a target position.

**Arguments:**
- `x: number | RoomPosition | string` - X coordinate, RoomPosition object, or creep name
- `y?: number` - Y coordinate (only used with number x value)
- `roomName?: string` - Room name (only used with number x/y values)

```javascript
// Using RoomPosition object
goto(new RoomPosition(25, 30, 'E3S42'))
// goto(x: RoomPosition, y: undefined, roomName: undefined)

// Using coordinates and room
goto(25, 30, 'E3S42')
// goto(x: 25, y: 30, roomName: "E3S42")

goto(10, 15, 'W1N1')
// goto(x: 10, y: 15, roomName: "W1N1")

// Using creep name (move to creep's position)
goto('H1')
// goto(x: "H1", y: undefined, roomName: undefined)

goto('Scout')
// goto(x: "Scout", y: undefined, roomName: undefined)
```

### `flag()`
```typescript
flag(x: number, y: number, roomName: string): void
```

Place a visual flag for reference (visual marker only).

**Arguments:**
- `x: number` - X coordinate
- `y: number` - Y coordinate
- `roomName: string` - Room name

```javascript
flag(25, 25, 'E3S42')       // flag(x: 25, y: 25, roomName: "E3S42")
flag(15, 20, 'W1N1')        // flag(x: 15, y: 20, roomName: "W1N1")
flag(30, 35, 'E3S42')       // flag(x: 30, y: 35, roomName: "E3S42")
```

---

## Empire Mode

### `mode()`
```typescript
mode(newMode?: 'command' | 'delegate'): void
```

Display or switch empire mode.

**Arguments:**
- `newMode?: 'command' | 'delegate'` - Mode to switch to (optional, displays current if omitted)

```javascript
mode()                      // mode(newMode: undefined) - Display current mode
mode('command')             // mode(newMode: "command") - Switch to COMMAND mode
mode('delegate')            // mode(newMode: "delegate") - Switch to DELEGATE mode
```

---

## Utility Commands

### `clear()`
```typescript
clear(): void
```

Clear console output.

```javascript
clear()                     // No arguments
```

---

## Quick Reference: Room Names

Standard Screeps room naming:
- `E3S42` - East quadrant (E), 3 rooms from center, South (S), 42
- `W1N1` - West quadrant (W), 1 room from center, North (N), 1
- `E0N0` - Center room (neutral controller)

## Quick Reference: Structure Names

Auto-named by scan:
- `SourceA`, `SourceB` - Energy sources
- `SpawnMain` - Spawn structure
- `ExtensionA`, `ExtensionB`, etc. - Extensions
- `site1`, `site2`, etc. - Construction sites
- `Tower` - Tower structure
- `Controller` - Room controller

## Quick Reference: Body Parts & Costs

```
MOVE       = 50 energy
CARRY      = 50 energy
WORK       = 100 energy
ATTACK     = 80 energy
RANGED_ATTACK = 150 energy
HEAL       = 250 energy
TOUGH      = 10 energy
CLAIM      = 600 energy
```

Common combinations:
```javascript
[WORK, CARRY, MOVE]              // Basic: 200 energy
[WORK, WORK, CARRY, MOVE]        // Upgraded: 300 energy
[MOVE]                           // Scout: 50 energy
[WORK, WORK, MOVE, MOVE]         // Strong worker: 250 energy
[CARRY, CARRY, MOVE]             // Hauler: 150 energy
```
