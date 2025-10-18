# Screeps Console Commands - Complete Reference

This is the comprehensive guide to all console commands for the Screeps colony management system. Includes setup, usage, examples, and complete command documentation.

---

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Autocomplete Setup](#autocomplete-setup)
3. [Type Reference](#type-reference)
4. [All Commands by Category](#all-commands-by-category)
5. [Quick Reference Charts](#quick-reference-charts)
6. [Workflow Examples](#workflow-examples)
7. [Tips & Tricks](#tips--tricks)

---

## Quick Start

### Fastest Way to Use Commands

1. **Open any `.ts` or `.js` file in VS Code**
2. **Start typing a command name** (e.g., `spawn`)
3. **Press Ctrl+Space** to see autocomplete suggestions
4. **Select a command** and press Enter
5. **VS Code fills in the signature with parameter hints**
6. **Copy the entire line** and paste into your Screeps console
7. **Press Enter** in the console to execute

Example:
```javascript
// In VS Code, type and autocomplete:
spawn('harvester', 'E3S42')

// Copy and paste into Screeps console → Done!
```

---

## Autocomplete Setup

### Two-Layer Architecture

Your autocomplete has **two integrated layers**:

**Layer 1: Game API Types** (`@types/screeps@3.3.8`)
- Built-in Screeps API objects: `Game`, `Room`, `Creep`, `Structure`, etc.
- Automatically provided via npm package
- Used throughout your code for game mechanics

**Layer 2: Custom Console Commands** (`src/types/console.d.ts`)
- Your 28+ custom commands with full documentation
- TypeScript declarations with JSDoc comments
- Copy-paste ready with full type information

### File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Custom Commands | `src/types/console.d.ts` | Type definitions for your commands |
| Screeps API | `node_modules/@types/screeps/` | Game API types (npm package) |
| TypeScript Config | `tsconfig.json` | Compiler settings (auto-configured) |

### How It Works

VS Code automatically recognizes:
1. The npm package `@types/screeps` for game APIs
2. Your local `.d.ts` files for custom commands
3. Combines both into unified autocomplete

No additional setup needed! Just start typing.

---

## Type Reference

### Quick Type Guide

```typescript
// String types - use with quotes
string                    // "E3S42", "H1", "harvester_basic", etc.

// Number types - whole numbers
number                    // 25, 30, 10, 5, etc.

// Array types - wrapped in square brackets
BodyPartConstant[]        // [WORK, CARRY, MOVE]

// Room Position - Screeps position object
RoomPosition              // new RoomPosition(25, 30, 'E3S42')

// Optional parameters - shown with ? (can be omitted)
room?: string             // Can be omitted - defaults to current room
duration?: number         // Can be omitted - defaults to 3
```

### Body Part Types

These are the building blocks for creep bodies:

```javascript
MOVE              // 50 energy   - Movement/mobility
WORK              // 100 energy  - Harvesting/upgrading/building
CARRY             // 50 energy   - Carrying resources
ATTACK            // 80 energy   - Melee attack
RANGED_ATTACK     // 150 energy  - Ranged attack
HEAL              // 250 energy  - Healing nearby creeps
TOUGH             // 10 energy   - Damage reduction
CLAIM             // 600 energy  - Controller claiming
```

### Common Room Names

Standard Screeps quadrant naming:
```
E3S42     // East quadrant (E), 3 rooms from center, South (S), 42
W1N1      // West quadrant (W), 1 room from center, North (N), 1
E0N0      // Center room (closest to center)
N10W10    // Far north, far west
```

---

## All Commands by Category

### 📊 Status & Information Commands

#### `status()`
```typescript
status(roomName?: string): void
```

Display colony-wide status with all rooms and creep information.

**Arguments:**
- `roomName?: string` - Specific room to show, or omit to show all rooms

```javascript
status()                    // Show all rooms
status('E3S42')             // Show only E3S42
status('W1N1')              // Show only W1N1
```

---

#### `help()`
```typescript
help(): void
```

Display all available commands with usage information.

```javascript
help()                      // No arguments
```

---

#### `memory()`
```typescript
memory(key?: string): void
```

View Memory structure and creep-specific data.

**Arguments:**
- `key?: string` - Specific key to view, or omit to show all

```javascript
memory()                    // Show entire Memory
memory('harvester_12345')   // Show creep's memory
memory('empire')            // Show memory.empire
```

---

#### `config()`
```typescript
config(rcl?: number): void
```

View behavior configuration for different RCL (Room Control Level) settings.

**Arguments:**
- `rcl?: number` - Specific RCL (1-8), or omit to show all

```javascript
config()                    // Show all RCLs
config(1)                   // Show RCL 1 config
config(2)                   // Show RCL 2 config
config(8)                   // Show RCL 8 (max) config
```

---

#### `rooms()`
```typescript
rooms(): void
```

List all owned rooms with statistics.

```javascript
rooms()                     // No arguments
```

---

#### `room()`
```typescript
room(name: string): Room | null
```

Get a specific Room object by name.

**Arguments:**
- `name: string` - Room name to retrieve

```javascript
room('E3S42')               // Get Room object for E3S42
room('W1N1')                // Get Room object for W1N1
```

---

### 🎯 Spawning & Creep Management

#### `spawn()`
```typescript
spawn(role: string, roomName?: string): Creep | false
```

Spawn a creep with an auto-generated name. Room defaults to current room.

**Arguments:**
- `role: string` - Role type: `'harvester'` | `'upgrader'` | `'builder'` | `'scout'` | `'hauler'`
- `roomName?: string` - Room name (optional, defaults to current room)

**Returns:** The new Creep object, or `false` if spawn failed

```javascript
spawn('harvester')                    // Spawn harvester in current room
spawn('harvester', 'E3S42')           // Spawn harvester in E3S42
spawn('upgrader', 'W1N1')             // Spawn upgrader in W1N1
spawn('builder')                      // Spawn builder in current room
spawn('scout', 'E3S42')               // Spawn scout in E3S42

// Generated creep names will be like: harvester_74178500, upgrader_74178501, etc.
```

**Note:** Room defaults to your current room context (where you have a creep) or the first owned room.

---

#### `spawnCreep()`
```typescript
spawnCreep(
  creepName: string,
  role: string,
  bodyTypeOrArray: string | BodyPartConstant[],
  roomName?: string
): Creep | false
```

Spawn a creep with a custom name and body configuration. Room defaults to current room.

**Arguments:**
- `creepName: string` - Custom creep name: `'H1'`, `'Harvester1'`, `'Scout_Alpha'`, etc.
- `role: string` - Role type: `'harvester'` | `'upgrader'` | `'builder'` | `'scout'` | `'hauler'` | `'worker'`
- `bodyTypeOrArray: string | BodyPartConstant[]` - Either a registered body config name (string) OR an array of body parts
- `roomName?: string` - Room name (optional, defaults to current room)

**Returns:** The new Creep object, or `false` if spawn failed

```javascript
// Using registered body configs (strings)
spawnCreep('H1', 'harvester', 'harvester_basic')
// ↓ Uses the pre-registered 'harvester_basic' body

spawnCreep('H1', 'harvester', 'harvester_basic', 'E3S42')
// ↓ Explicitly set room to E3S42

spawnCreep('U1', 'upgrader', 'upgrader_basic')
// ↓ Spawn upgrader with upgraded body config

spawnCreep('B1', 'builder', 'builder_basic', 'W1N1')
// ↓ Spawn builder in W1N1

// Using custom body part arrays
spawnCreep('H2', 'harvester', [WORK, WORK, CARRY, MOVE], 'E3S42')
// ↓ Spawn harvester with custom body parts

spawnCreep('Worker', 'worker', [WORK, CARRY, MOVE])
// ↓ Spawn worker in current room with custom body

spawnCreep('Mover', 'scout', [MOVE, MOVE])
// ↓ Ultra-fast scout with just movement parts
```

---

#### `despawn()`
```typescript
despawn(creepName: string): void
```

Delete a creep immediately.

**Arguments:**
- `creepName: string` - Name of creep to delete

```javascript
despawn('H1')                         // Delete H1
despawn('harvester_74178500')         // Delete specific harvester
despawn('Scout_Alpha')                // Delete scout
```

---

#### `creeps()`
```typescript
creeps(roomName?: string): void
```

List all creeps in the empire, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name to filter (optional, shows all if omitted)

```javascript
creeps()                    // Show all creeps in all rooms
creeps('E3S42')             // Show only creeps in E3S42
creeps('W1N1')              // Show only creeps in W1N1
```

---

### 📦 Body Configuration

#### `bodies()`
```typescript
bodies(role?: string): void
```

List all registered body configurations, optionally filtered by role.

**Arguments:**
- `role?: string` - Role name to filter (optional, shows all if omitted)

```javascript
bodies()                    // Show all registered body configs
bodies('harvester')         // Show harvesters: harvester_basic, harvester_v2, etc.
bodies('upgrader')          // Show upgrader configs
bodies('builder')           // Show builder configs
```

**Output example:**
```
harvester_basic     [WORK, CARRY, MOVE]         Cost: 200
harvester_v2        [WORK, WORK, CARRY, MOVE]   Cost: 300
scout               [MOVE]                      Cost: 50
worker              [WORK, WORK, CARRY, MOVE]   Cost: 300
```

---

#### `regBody()`
```typescript
regBody(name: string, partsArray: BodyPartConstant[], role?: string): void
```

Register a new body configuration for reuse.

**Arguments:**
- `name: string` - Unique config name: `'harvester_v2'`, `'my_scout'`, `'transport'`, etc.
- `partsArray: BodyPartConstant[]` - Array of body parts: `[WORK, WORK, CARRY, MOVE]`
- `role?: string` - Optional role label (defaults to `'generic'`)

```javascript
regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
// ↓ Register upgraded harvester with 2 WORK parts

regBody('super_upgrader', [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE], 'upgrader')
// ↓ Register ultimate upgrader with 3 WORK parts

regBody('fast_scout', [MOVE, MOVE], 'scout')
// ↓ Register quick scout with maximum mobility

regBody('transport', [CARRY, CARRY, CARRY, MOVE, MOVE], 'hauler')
// ↓ Register transport body for hauling resources
```

---

### ✅ Task Assignment

#### `task()`
```typescript
task(creepName: string, taskType: string, targetId?: string): void
```

Assign a task to a creep for autonomous execution.

**Arguments:**
- `creepName: string` - Name of creep: `'H1'`, `'harvester_74178500'`, `'Scout'`, etc.
- `taskType: string` - Task type: `'harvest'` | `'deliver'` | `'build'` | `'upgrade'` | `'repair'` | `'move'` | `'idle'`
- `targetId?: string` - Target identifier (depends on task type, required for most tasks)

```javascript
// HARVEST tasks (need source ID/name)
task('H1', 'harvest', 'SourceA')
// ↓ Harvest from SourceA

task('harvester_74178500', 'harvest', 'abc123def456')
// ↓ Harvest from specific source by ID

// DELIVER tasks (need structure ID/name)
task('H1', 'deliver', 'SpawnMain')
// ↓ Deliver to SpawnMain

task('Hauler1', 'deliver', 'ExtensionA')
// ↓ Deliver to ExtensionA

// BUILD tasks (need construction site ID/name)
task('B1', 'build', 'site1')
// ↓ Build at construction site 1

task('builder_74178600', 'build', 'def456abc123')
// ↓ Build at specific site by ID

// UPGRADE tasks (no target needed)
task('U1', 'upgrade')
// ↓ Upgrade room controller (no target needed)

task('upgrader_74178550', 'upgrade')
// ↓ Continue upgrading

// REPAIR tasks (need structure ID/name)
task('B1', 'repair', 'Wall1')
// ↓ Repair Wall1

task('repairBot', 'repair', 'abc123')
// ↓ Repair structure by ID

// MOVE tasks (need position as "x:y:roomName")
task('Scout', 'move', '25:30:E3S42')
// ↓ Move to position (25,30) in E3S42

task('H1', 'move', '10:15:E3S42')
// ↓ Move scout to rally point

// IDLE task (no target needed)
task('H1', 'idle')
// ↓ Put creep into idle state (waiting for orders)
```

---

#### `tasks()`
```typescript
tasks(roomName?: string): void
```

View all tasks assigned to creeps in the empire, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name to filter (optional, shows all if omitted)

```javascript
tasks()                     // Show all tasks in all rooms
tasks('E3S42')              // Show tasks in E3S42 only
tasks('W1N1')               // Show tasks in W1N1 only
```

---

#### `untask()`
```typescript
untask(creepName: string): void
```

Clear a task from a creep (creep becomes idle).

**Arguments:**
- `creepName: string` - Name of creep to clear task from

```javascript
untask('H1')                        // Clear H1's task
untask('harvester_74178500')        // Clear harvester's task
```

---

### 🏗️ Structure Management

#### `scan()`
```typescript
scan(roomName?: string): void
```

Register/update structures in a room. Automatically generates friendly names. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name to scan (optional, defaults to current room)

```javascript
scan()                      // Scan current room
scan('E3S42')               // Scan E3S42
scan('W1N1')                // Scan W1N1
```

**Auto-generates names like:**
- `SourceA`, `SourceB` - Energy sources
- `SpawnMain` - Spawn structure
- `ExtensionA`, `ExtensionB`, etc. - Extensions
- `site1`, `site2`, etc. - Construction sites
- `Tower` - Tower structure
- `Controller` - Room controller

---

#### `structures()`
```typescript
structures(roomName?: string): void
```

List all registered structures, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name to filter (optional, shows all if omitted)

```javascript
structures()                // Show all structures in all rooms
structures('E3S42')         // Show structures in E3S42
structures('W1N1')          // Show structures in W1N1
```

---

#### `rename()`
```typescript
rename(oldName: string, newName: string): void
```

Rename a registered structure.

**Arguments:**
- `oldName: string` - Current structure name or ID
- `newName: string` - New name for the structure

```javascript
rename('SourceA', 'MainSource')
// ↓ Rename SourceA to MainSource

rename('SpawnMain', 'SpawnPrimary')
// ↓ Rename SpawnMain to SpawnPrimary

rename('ExtensionA', 'EastExtension')
// ↓ Rename ExtensionA to EastExtension

rename('site1', 'WallA')
// ↓ Rename construction site to WallA
```

---

#### `lock()`
```typescript
lock(nameOrId: string): void
```

Lock a structure to prevent creep actions on it.

**Arguments:**
- `nameOrId: string` - Structure registered name or ID

```javascript
lock('SourceA')             // Lock SourceA (prevent harvesting)
lock('SpawnMain')           // Lock spawn (prevent spawning here)
lock('ExtensionA')          // Lock extension (prevent charging)
lock('abc123def456')        // Lock structure by ID
```

---

#### `unlock()`
```typescript
unlock(nameOrId: string): void
```

Unlock a structure to allow creep actions.

**Arguments:**
- `nameOrId: string` - Structure registered name or ID

```javascript
unlock('SourceA')           // Unlock SourceA
unlock('SpawnMain')         // Unlock spawn
unlock('abc123def456')       // Unlock structure by ID
```

---

#### `locked()`
```typescript
locked(roomName?: string): void
```

View all locked structures, optionally filtered by room.

**Arguments:**
- `roomName?: string` - Room name to filter (optional, shows all if omitted)

```javascript
locked()                    // Show all locked structures
locked('E3S42')             // Show locked structures in E3S42
locked('W1N1')              // Show locked structures in W1N1
```

---

### 👁️ Visual Labels

#### `showNames()`
```typescript
showNames(roomName?: string, duration?: number): void
```

Display structure names as visual labels on the map. Room defaults to current room, duration defaults to 3 ticks.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)
- `duration?: number` - How many ticks to display labels (optional, defaults to 3)

```javascript
showNames()                 // Show labels in current room for 3 ticks
showNames('E3S42')          // Show labels in E3S42 for 3 ticks
showNames('E3S42', 10)      // Show labels in E3S42 for 10 ticks
showNames('W1N1', 5)        // Show labels in W1N1 for 5 ticks
```

---

#### `hideNames()`
```typescript
hideNames(roomName?: string): void
```

Hide structure name displays. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
hideNames()                 // Hide labels in current room
hideNames('E3S42')          // Hide labels in E3S42
hideNames('W1N1')           // Hide labels in W1N1
```

---

### 🎯 Legatus Command System

Legatus is the automated command processor for creeps.

#### `legaStatus()`
```typescript
legaStatus(roomName?: string): void
```

Show LegatusOficio (command processor) assignment status in a room. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
legaStatus()                // Show assignments in current room
legaStatus('E3S42')         // Show assignments in E3S42
legaStatus('W1N1')          // Show assignments in W1N1
```

**Output shows:**
- Creep name
- Command type (harvest, deliver, build, etc.)
- Time assigned (in ticks)

---

#### `legaList()`
```typescript
legaList(roomName?: string): void
```

List all Legatus (command processor) assignments in a room. Room defaults to current room.

**Arguments:**
- `roomName?: string` - Room name (optional, defaults to current room)

```javascript
legaList()                  // List all assignments in current room
legaList('E3S42')           // List assignments in E3S42
legaList('W1N1')            // List assignments in W1N1
```

---

### 🚀 Movement & Navigation

#### `goto()`
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
- `y?: number` - Y coordinate (only with numeric x)
- `roomName?: string` - Room name (only with numeric x/y)

```javascript
// Using RoomPosition object
goto(new RoomPosition(25, 30, 'E3S42'))
// ↓ Move to position (25,30) in E3S42

// Using coordinates and room
goto(25, 30, 'E3S42')
// ↓ Move to (25,30) in E3S42

goto(10, 15, 'W1N1')
// ↓ Move to (10,15) in W1N1

// Using creep name (move to creep's position)
goto('H1')
// ↓ Move all creeps to H1's position

goto('Scout')
// ↓ Move all creeps to Scout's position
```

---

#### `flag()`
```typescript
flag(x: number, y: number, roomName: string): void
```

Place a visual flag for reference (visual marker only, doesn't affect gameplay).

**Arguments:**
- `x: number` - X coordinate
- `y: number` - Y coordinate
- `roomName: string` - Room name

```javascript
flag(25, 25, 'E3S42')       // Place flag at (25,25) in E3S42
flag(15, 20, 'W1N1')        // Place flag at (15,20) in W1N1
flag(30, 35, 'E3S42')       // Place another flag in E3S42
```

---

### 🎮 Empire Mode

#### `mode()`
```typescript
mode(newMode?: 'command' | 'delegate'): void
```

Display or switch empire-wide operation mode.

**Arguments:**
- `newMode?: 'command' | 'delegate'` - Mode to switch to (optional, displays current if omitted)

**Modes:**
- `'command'` - Direct control mode (you issue all commands)
- `'delegate'` - Delegation mode (creeps work autonomously)

```javascript
mode()                      // Display current mode
mode('command')             // Switch to COMMAND mode
mode('delegate')            // Switch to DELEGATE mode
```

---

### 🛠️ Utility

#### `clear()`
```typescript
clear(): void
```

Clear console output.

```javascript
clear()                     // No arguments
```

---

## Quick Reference Charts

### Command Summary (28 Total)

| Category | Commands |
|----------|----------|
| **Status** | `status()`, `help()`, `memory()`, `config()`, `rooms()`, `room()` |
| **Spawning** | `spawn()`, `spawnCreep()`, `despawn()`, `creeps()` |
| **Bodies** | `bodies()`, `regBody()` |
| **Tasks** | `task()`, `tasks()`, `untask()` |
| **Structures** | `scan()`, `structures()`, `rename()`, `lock()`, `unlock()`, `locked()` |
| **Visuals** | `showNames()`, `hideNames()` |
| **Legatus** | `legaStatus()`, `legaList()` |
| **Movement** | `goto()`, `flag()` |
| **Empire** | `mode()` |
| **Utility** | `clear()` |

---

### Default Body Configurations

Pre-registered body configs you can use immediately:

```javascript
harvester_basic     [WORK, CARRY, MOVE]              // 200 energy
upgrader_basic      [WORK, CARRY, MOVE]              // 200 energy
builder_basic       [WORK, CARRY, MOVE]              // 200 energy
scout               [MOVE]                           // 50 energy
hauler              [CARRY, CARRY, CARRY, MOVE, MOVE] // 250 energy
worker              [WORK, WORK, CARRY, MOVE]        // 250 energy
```

---

### Body Part Costs

```
MOVE              50 energy
CARRY             50 energy
WORK             100 energy
TOUGH            10 energy
ATTACK            80 energy
RANGED_ATTACK    150 energy
HEAL             250 energy
CLAIM            600 energy
```

Common body combinations:
```javascript
[WORK, CARRY, MOVE]              // Basic: 200 energy
[WORK, WORK, CARRY, MOVE]        // Upgraded: 300 energy
[MOVE]                           // Scout: 50 energy
[WORK, WORK, MOVE, MOVE]         // Strong worker: 250 energy
[CARRY, CARRY, MOVE]             // Hauler: 150 energy
```

---

### Structure Auto-Names from `scan()`

When you run `scan()`, structures get auto-named:

```
Energy Sources:     SourceA, SourceB, ...
Spawns:             SpawnMain (first), Spawn2 (additional)
Extensions:         ExtensionA, ExtensionB, ExtensionC, ...
Construction Sites: site1, site2, site3, ...
Towers:             Tower, Tower2, ...
Controller:         Controller
```

---

## Workflow Examples

### Example 1: Setting Up a New Room

```javascript
// 1. Scan the room to register structures
scan('E3S42')

// 2. Show structure names on the map
showNames('E3S42', 10)

// 3. Check what structures were registered
structures('E3S42')

// 4. Spawn your first harvester
spawn('harvester', 'E3S42')

// 5. Assign it to harvest
task('harvester_74178500', 'harvest', 'SourceA')

// 6. Check status
status('E3S42')
```

### Example 2: Creating Custom Creeps

```javascript
// 1. Register a custom body config
regBody('super_worker', [WORK, WORK, CARRY, MOVE, MOVE], 'worker')

// 2. Spawn a creep using that config
spawnCreep('Worker1', 'worker', 'super_worker', 'E3S42')

// 3. Assign tasks
task('Worker1', 'harvest', 'SourceB')

// 4. View creeps
creeps('E3S42')
```

### Example 3: Multi-Room Management

```javascript
// 1. Check all rooms
rooms()

// 2. Scan all rooms
scan('E3S42')
scan('W1N1')
scan('E3N1')

// 3. Status check
status()

// 4. Show all creeps
creeps()

// 5. Show all tasks
tasks()
```

### Example 4: Manage Tasks

```javascript
// 1. Assign harvest task
task('H1', 'harvest', 'SourceA')

// 2. Check tasks
tasks('E3S42')

// 3. Change task
untask('H1')
task('H1', 'deliver', 'SpawnMain')

// 4. View updated tasks
tasks('E3S42')
```

### Example 5: Lock/Unlock Structures

```javascript
// 1. Lock a source to prevent harvesting
lock('SourceA')

// 2. View locked structures
locked()

// 3. Unlock when ready
unlock('SourceA')

// 4. Verify
locked()
```

---

## Tips & Tricks

### 💡 Tip 1: Use VS Code for Complex Commands

For multi-line commands or chaining operations:

1. **Create a temporary file** (e.g., `commands.js`)
2. **Write your commands** with autocomplete help
3. **Copy the entire block**
4. **Paste into Screeps console**

Example file:
```javascript
// My daily setup commands
scan('E3S42')
showNames('E3S42', 10)
status('E3S42')
tasks()
creeps()
```

### 💡 Tip 2: Parameter Hints During Typing

Press **Ctrl+Shift+Space** while inside function parentheses to see parameter info again:
```javascript
spawn('harvester', |
       ↑ Parameter hints appear here
```

### 💡 Tip 3: Hover for Full Documentation

Hover your mouse over any function name in VS Code to see the complete JSDoc documentation:
```javascript
spawn('harvester')
  ↑ Hover here to see full docs
```

### 💡 Tip 4: Room Defaults

Most commands with a `roomName` parameter will default to your "current room":
- First, it checks if you have any creeps (uses their room)
- Otherwise, it uses your first owned room

```javascript
spawn('harvester')      // Automatically uses your current room!
scan()                  // Scans your current room
status()                // Shows current room
```

### 💡 Tip 5: Go to Definition

Right-click any command → "Go to Definition" to jump to `src/types/console.d.ts` and see the full type definition.

### 💡 Tip 6: Search Commands

In VS Code, press **Ctrl+Shift+P** → "Go to Symbol" → type command name to jump to its definition:
```
Ctrl+Shift+P → "Go to Symbol"
Type: spawn
Select to jump to spawn() definition
```

### 💡 Tip 7: Keep a Snippet File

Create `console-snippets.js` with your most-used commands:
```javascript
// Quick access commands
spawn('harvester', 'E3S42')
spawnCreep('H1', 'harvester', 'harvester_basic', 'E3S42')
task('H1', 'harvest', 'SourceA')
showNames('E3S42', 10)
status('E3S42')
```

Then just copy from this file instead of typing!

### 💡 Tip 8: Copy Entire Command with Context

VS Code makes it easy to select and copy entire lines:
1. Click at the beginning of the line
2. Shift+End to select to end
3. Ctrl+C to copy
4. Paste into console

### 💡 Tip 9: Use `memory()` for Debugging

Check creep memory to debug task assignments:
```javascript
memory('H1')            // See H1's current state
memory('empire')        // See empire-wide settings
memory()                // See all memory
```

### 💡 Tip 10: Clear Console When Needed

Too much output? Clear it:
```javascript
clear()                 // Fresh start!
```

---

## Troubleshooting

### Q: Autocomplete isn't showing commands

**A:** Make sure you're in a `.ts` or `.js` file. VS Code needs to detect JavaScript/TypeScript context. Try:
1. Opening any `.ts` or `.js` file
2. Pressing Ctrl+Shift+P → "Reload Window"
3. Restarting VS Code

### Q: Parameter hints disappeared

**A:** Press **Ctrl+Shift+Space** while inside the function parentheses to bring them back.

### Q: Autocomplete shows old suggestions

**A:** 
1. Press Ctrl+Shift+P → "Reload Window"
2. Or: Ctrl+Shift+P → "TypeScript: Restart TS Server"

### Q: Command isn't working in console

**A:** Check:
1. You have the latest code deployed (check `INIT_VERSION` bump)
2. Correct room name (case-sensitive, e.g., `'E3S42'` not `'e3s42'`)
3. Creep/structure names are spelled correctly

### Q: Room defaults not working

**A:** Room defaults check in this order:
1. A room with one of your creeps
2. Your first owned room

If you have no creeps or owned rooms, specify room explicitly.

### Q: Can I use these commands in my code?

**A:** These are console-only commands registered at startup. They're not available in the main game loop. Use them to manage your colony from the in-game console only.

---

## File Organization

All command documentation is now consolidated in this single file:

```
CONSOLE_COMMANDS_REFERENCE.md  ← You are here (complete reference)
├─ Quick Start
├─ Autocomplete Setup
├─ Type Reference
├─ All Commands by Category (28 commands)
├─ Quick Reference Charts
├─ Workflow Examples
├─ Tips & Tricks
└─ Troubleshooting
```

**Related Files:**
- `src/types/console.d.ts` - TypeScript declarations (for VS Code autocomplete)
- `src/utils/console.ts` - Command implementations

---

## What's Next?

1. ✅ **Start typing commands** in VS Code
2. ✅ **Get autocomplete suggestions** with Ctrl+Space
3. ✅ **Copy commands** to Screeps console
4. ✅ **Execute** and watch your colony grow!

**Your autocomplete is production-ready!** 🚀

---

*Last Updated: October 2025*
*28 Commands | Full Type Definitions | Complete Examples | Ready to Use*
