/**
 * CONSOLE COMMANDS QUICK REFERENCE
 * 
 * Use these in the Screeps console to control your colony manually.
 * Type help() in console for full documentation.
 */

// ═══════════════════════════════════════════════════════════════
// VIEW STATUS
// ═══════════════════════════════════════════════════════════════

// Full colony overview
status()

// Status for specific room
status('W1N1')

// List all creeps
creeps()

// List creeps in specific room
creeps('W1N1')

// View memory
memory()

// View creep memory
memory('harvester_12345')

// View behavior config
config()

// View config for specific RCL
config(1)

// List all owned rooms
rooms()

// Get room object
room('W1N1')

// ═══════════════════════════════════════════════════════════════
// SPAWN & CONTROL
// ═══════════════════════════════════════════════════════════════

// Spawn a harvester in W1N1
spawn('harvester', 'W1N1')

// Spawn an upgrader
spawn('upgrader', 'W1N1')

// Spawn a builder
spawn('builder', 'W1N1')

// Kill a creep
despawn('harvester_12345')

// Move all creeps to position
goto(25, 25, 'W1N1')

// Move all creeps to another creep
goto('harvester_12345')

// ═══════════════════════════════════════════════════════════════
// TASK ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

// Assign harvest task to a creep
task('harvester_12345', 'harvest', '5e123abc')

// Assign delivery task
task('harvester_12345', 'deliver', '5e456def')

// Assign build task
task('builder_12345', 'build', '5e789ghi')

// Assign upgrade task
task('upgrader_12345', 'upgrade')

// Assign move task (position format: x:y:roomName)
task('harvester_12345', 'move', '25:20:W1N1')

// Assign repair task
task('harvester_12345', 'repair', '5e000jkl')

// Make creep do nothing
task('harvester_12345', 'idle')

// View all assigned tasks
tasks()

// View tasks in specific room
tasks('W1N1')

// Clear task from creep
untask('harvester_12345')

// ═══════════════════════════════════════════════════════════════
// STRUCTURE REGISTRY & NAMING
// ═══════════════════════════════════════════════════════════════

// Scan room and auto-register structures
scan('W1N1')
// ✅ Scanned room W1N1
// Automatically creates: SourceA, SourceB, SpawnMain, ExtensionA, etc.

// Scan all rooms
scan()

// List all registered structures
structures()

// List structures in a room
structures('W1N1')

// Rename a structure
rename('SourceA', 'MainHarvestSource')
// ✅ Renamed SourceA → MainHarvestSource

// ═══════════════════════════════════════════════════════════════
// STRUCTURE LOCKING
// ═══════════════════════════════════════════════════════════════

// Lock a structure (prevents harvesting, building, etc.)
lock('SourceA')
// 🔒 Locked SourceA

// Unlock a structure
unlock('SourceA')
// 🔓 Unlocked SourceA

// View all locked structures
locked()

// View locked structures in a room
locked('W1N1')

// ═══════════════════════════════════════════════════════════════
// VISUAL LABELS ON MAP
// ═══════════════════════════════════════════════════════════════

// Display structure names on the map for 3 ticks
showNames('W1N1')
// 👁️  Structure labels will display for 3 ticks

// Display names for custom duration
showNames('W1N1', 10)
// 👁️  Structure labels will display for 10 ticks

// Hide structure name displays
hideNames('W1N1')
// 🚫 Hidden structure names in W1N1

// ═══════════════════════════════════════════════════════════════
// LEGATUS OF OFICIO (TASKMASTER)
// ═══════════════════════════════════════════════════════════════

// Show Legatus command status
legaStatus('W1N1')
// 🎯 Legatus W1N1: 3 active assignments
// harvester_1234567890 → harvest (5 ticks)
// builder_9876543210 → build (8 ticks)
// upgrader_1111111111 → upgrade (2 ticks)

// List all assignments in a room
legaList('W1N1')
// 📋 Legatus W1N1: 3 assignments
// ─────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// EMPIRE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Show current empire mode
mode()

// Switch to COMMAND mode (direct creep control)
mode('command')
// 🎮 Empire mode changed: DELEGATE → COMMAND

// Switch to DELEGATE mode (automatic AI)
mode('delegate')
// 🎮 Empire mode changed: COMMAND → DELEGATE

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

// Show help menu
help()

// Clear console
clear()

// Place a flag for reference
flag(25, 25, 'W1N1')

// ═══════════════════════════════════════════════════════════════
// EXAMPLES
// ═══════════════════════════════════════════════════════════════

// Check colony status
status()

// Spawn more harvesters if needed
for(let i = 0; i < 3; i++) spawn('harvester', 'W1N1')

// Move creeps to source
goto(15, 20, 'W1N1')

// Monitor a specific creep
setInterval(() => {
  const creep = Game.creeps['harvester_12345']
  if(creep) console.log(`HP: ${creep.hits}/${creep.hitsMax}, Energy: ${creep.store.getUsedCapacity()}`)
}, 5)

// Kill all builders
Object.keys(Memory.creeps).filter(n => Memory.creeps[n].role === 'builder').forEach(despawn)

// Get all harvesters in a room
Game.rooms['W1N1'].find(FIND_MY_CREEPS).filter(c => c.memory.role === 'harvester')
