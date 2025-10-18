/**
 * CONSOLE COMMAND SYSTEM
 * 
 * Provides a comprehensive command-line interface for controlling your colony.
 * All commands are called via console.log and global functions.
 * 
 * Usage:
 * ```
 * > help()                          // Show all commands
 * > status()                        // Full colony status
 * > status('W1N1')                  // Room-specific status
 * > spawn('harvester', 'W1N1')      // Spawn a role in a room
 * > despawn('creep_name')           // Delete a creep
 * > pos(10, 20, 'W1N1')             // Go to position
 * > memory()                        // View full memory
 * > memory('creep_name')            // View creep memory
 * > config()                        // View behavior config
 * ```
 */

import {
  getBehaviorConfig,
  getSpawnRequests,
  getSpawnStatus
} from '../world/creeps';

import {
  setMode,
  displayModeInfo
} from '../world/empire';

import {
  getTask,
  assignTask,
  clearTask,
  createHarvestTask,
  createDeliverTask,
  createBuildTask,
  createUpgradeTask,
  createMoveTask,
  createRepairTask,
  createIdleTask,
  getTaskDescription
} from '../world/creeps/tasks';

import {
  scanRoom,
  lockStructure,
  unlockStructure,
  getLockedStructures,
  listStructures,
  renameStructure,
  showNames as visualShowNames,
  hideNames as visualHideNames,
  getRoomAssignments,
  listLegaAssignments,
  getLegaStatus
} from '../world';

import {
  registerBody,
  getBodyConfig,
  listBodyConfigs,
  getBodyCost
} from '../world/spawns/bodies';

/**
 * Print a formatted header
 */
function header(text: string): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`║ ${text.padEnd(58)} ║`);
  console.log(`${'═'.repeat(60)}\n`);
}

/**
 * Print a section separator
 */
function section(text: string): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${text}`);
  console.log(`${'─'.repeat(60)}`);
}

/**
 * HELP - Display all available commands
 * 
 * @example help()
 */
export function help(): void {
  header('SCREEPS CONSOLE COMMANDS');

  section('VIEWING STATUS');
  console.log('  status()             - Full colony status (all rooms)');
  console.log('  status(roomName)     - Status for specific room');
  console.log('  memory()             - View full Memory object');
  console.log('  memory(creepName)    - View specific creep memory');
  console.log('  config()             - View behavior configuration');

  section('SPAWNING & CREEPS');
  console.log('  spawn(role, room)                - Spawn a creep (auto-name)');
  console.log('  spawnCreep(name, role, body, room) - Spawn with name & body');
  console.log('  despawn(creepName)               - Delete a creep');
  console.log('  creeps(room?)                    - List all creeps (or by room)');

  section('BODY CONFIGURATIONS');
  console.log('  bodies()             - List all registered body configs');
  console.log('  bodies(role)         - List bodies for a role');
  console.log('  regBody(name, arr, role) - Register a body config');

  section('MOVEMENT & TARGETING');
  console.log('  goto(x, y, room)     - Move all creeps to position');
  console.log('  goto(target)         - Go to creep/structure/source');

  section('TASK ASSIGNMENT');
  console.log('  task(name, type, id) - Assign task to creep');
  console.log('  tasks()              - View all assigned tasks');
  console.log('  tasks(room)          - View tasks in room');
  console.log('  untask(name)         - Clear task from creep');
  console.log('');
  console.log('  Task types: harvest, deliver, build, upgrade, repair, move, idle');
  console.log('  Example: task("harvester_1", "harvest", "SourceA")');

  section('STRUCTURE REGISTRY');
  console.log('  scan()               - Register structures in all rooms');
  console.log('  scan(room)           - Register structures in a room');
  console.log('  structures()         - List all registered structures');
  console.log('  structures(room)     - List structures in a room');
  console.log('  rename(old, new)     - Rename a structure');

  section('STRUCTURE LOCKING');
  console.log('  lock(name)           - Lock a structure (prevent actions)');
  console.log('  unlock(name)         - Unlock a structure');
  console.log('  locked()             - View all locked structures');
  console.log('  locked(room)         - View locked structures in room');

  section('VISUAL LABELS');
  console.log('  showNames(room)      - Display structure names on map (3 ticks)');
  console.log('  hideNames(room)      - Hide structure name displays');

  section('LEGATUS COMMANDS');
  console.log('  legaStatus(room)     - Show Legatus assignments in room');
  console.log('  legaList(room)       - List all assignments in room');

  section('ROOM MANAGEMENT');
  console.log('  rooms()              - List all owned rooms');
  console.log('  room(name)           - Get Room object');

  section('BUILDING & CONSTRUCTION');
  console.log('  plan()               - Show construction plan');
  console.log('  build(structType)    - Plan a structure to build');
  console.log('  cancel()             - Cancel construction sites');

  section('DEBUGGING');
  console.log('  flag(x, y, room)     - Place a flag (for visual reference)');
  console.log('  clear()              - Clear console output');

  section('EMPIRE MODE');
  console.log('  mode()               - Display current empire mode');
  console.log('  mode("command")      - Switch to COMMAND mode (direct control)');
  console.log('  mode("delegate")     - Switch to DELEGATE mode (automatic AI)');

  console.log('\n💡 Use any command without () to see its code\n');
}

/**
 * STATUS - Display colony-wide status
 * 
 * @param roomName - Optional: show only this room
 * @example status()
 * @example status('W1N1')
 */
export function status(roomName?: string): void {
  const rooms = roomName ? [Game.rooms[roomName]] : Object.values(Game.rooms);
  const ownedRooms = rooms.filter(r => r.controller?.my);

  if (ownedRooms.length === 0) {
    console.log('⚠️  No rooms under control');
    return;
  }

  header('COLONY STATUS');

  for (const room of ownedRooms) {
    section(`Room: ${room.name} | RCL: ${room.controller?.level || 0}`);

    // Room stats
    console.log(`Progress: ${room.controller?.progress || 0}/${room.controller?.progressTotal || 0}`);
    console.log(`Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);

    // Creep composition
    console.log(`\n📋 Creep Status:`);
    console.log(getSpawnStatus(room));

    // Spawn requests
    const requests = getSpawnRequests(room);
    if (requests.length > 0) {
      console.log(`\n🔄 Next to spawn: ${requests[0].reason}`);
    }

    // Structures
    const spawns = room.find(FIND_MY_SPAWNS);
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_EXTENSION
    });
    console.log(`\n🏗️  Structures: ${spawns.length} spawn(s), ${extensions.length} extension(s)`);

    // Construction sites
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    if (sites.length > 0) {
      console.log(`⚙️  Construction: ${sites.length} site(s)`);
    }
  }

  console.log();
}

/**
 * SPAWN - Spawn a creep of a given role
 * 
 * @param role - Role name (harvester, upgrader, builder)
 * @param roomName - Room to spawn in
 * @returns The new creep, or false if failed
 * 
 * @example spawn('harvester', 'W1N1')
 */
export function spawn(role: string, roomName: string): Creep | false {
  const room = Game.rooms[roomName];
  if (!room) {
    console.log(`❌ Room not found: ${roomName}`);
    return false;
  }

  const config = getBehaviorConfig(room.controller?.level || 1);
  const roleConfig = config.roles.find(r => r.name === role);

  if (!roleConfig) {
    console.log(`❌ Unknown role: ${role}`);
    console.log(`Available roles: ${config.roles.map(r => r.name).join(', ')}`);
    return false;
  }

  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length === 0) {
    console.log(`❌ No spawns in room`);
    return false;
  }

  const spawn = spawns[0];
  const creepName = `${role}_${Game.time}`;

  const result = spawn.spawnCreep(roleConfig.body, creepName, {
    memory: {
      role,
      room: roomName,
      working: false
    }
  });

  if (result === OK) {
    console.log(`✅ Spawned ${creepName}`);
    return Game.creeps[creepName];
  } else {
    console.log(`❌ Spawn failed: ${result}`);
    return false;
  }
}

/**
 * DESPAWN - Delete a creep
 * 
 * @param creepName - Name of creep to delete
 * @example despawn('harvester_12345')
 */
export function despawn(creepName: string): void {
  const creep = Game.creeps[creepName];
  if (!creep) {
    console.log(`❌ Creep not found: ${creepName}`);
    return;
  }

  creep.suicide();
  console.log(`💀 Killed ${creepName}`);
}

/**
 * SPAWNCREEP - Spawn a creep with specific name and body configuration
 * 
 * @param creepName - Custom name for the creep (e.g., 'Harvester1')
 * @param role - Role name (harvester, upgrader, builder)
 * @param bodyTypeOrArray - Body config name (e.g., 'harvester_basic') or array of parts
 * @param roomName - Room to spawn in
 * @returns The new creep, or false if failed
 * 
 * @example spawnCreep('Harvester1', 'harvester', 'harvester_basic', 'W1N1')
 * @example spawnCreep('Scout1', 'scout', [MOVE], 'W1N1')
 */
export function spawnCreep(
  creepName: string,
  role: string,
  bodyTypeOrArray: string | BodyPartConstant[],
  roomName: string
): Creep | false {
  const room = Game.rooms[roomName];
  if (!room) {
    console.log(`❌ Room not found: ${roomName}`);
    return false;
  }

  // Get body parts
  const bodyParts = getBodyConfig(bodyTypeOrArray);
  if (!bodyParts || bodyParts.length === 0) {
    console.log(`❌ Invalid body config: ${bodyTypeOrArray}`);
    console.log(`Available bodies: `);
    listBodyConfigs();
    return false;
  }

  // Check if name is already taken
  if (Game.creeps[creepName]) {
    console.log(`❌ Creep name already exists: ${creepName}`);
    return false;
  }

  // Find spawn
  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length === 0) {
    console.log(`❌ No spawns in room`);
    return false;
  }

  const spawnObj = spawns[0];

  // Attempt spawn
  const result = spawnObj.spawnCreep(bodyParts, creepName, {
    memory: {
      role,
      room: roomName,
      working: false
    }
  });

  if (result === OK) {
    const cost = getBodyCost(bodyParts);
    console.log(`✅ Spawned ${creepName} (${bodyParts.length} parts, ${cost}E)`);
    return Game.creeps[creepName];
  } else {
    const errorMsg = {
      [ERR_NOT_OWNER]: 'Not your spawn',
      [ERR_NAME_EXISTS]: 'Name already exists',
      [ERR_INVALID_ARGS]: 'Invalid body parts',
      [ERR_NOT_ENOUGH_ENERGY]: `Not enough energy (need ${getBodyCost(bodyParts)}E)`
    }[result as number] || `Error code ${result}`;
    
    console.log(`❌ Spawn failed: ${errorMsg}`);
    return false;
  }
}

/**
 * CREEPS - List all creeps (optionally filtered by room)
 * 
 * @param roomName - Optional: filter by room
 * @example creeps()
 * @example creeps('W1N1')
 */
export function creeps(roomName?: string): void {
  const allCreeps = Object.values(Game.creeps);
  const filtered = roomName
    ? allCreeps.filter(c => c.memory.room === roomName)
    : allCreeps;

  if (filtered.length === 0) {
    console.log('⚠️  No creeps found');
    return;
  }

  section(`CREEPS (${filtered.length} total)`);

  for (const creep of filtered) {
    const energy = `${creep.store.getUsedCapacity(RESOURCE_ENERGY)}/${creep.store.getCapacity(RESOURCE_ENERGY)}`;
    const working = creep.memory.working ? '🔨' : '⛏️';
    console.log(`  ${creep.name.padEnd(30)} | Role: ${creep.memory.role?.padEnd(10) || 'unknown'} | Energy: ${energy} | ${working}`);
  }

  console.log();
}

/**
 * MEMORY - View memory structure
 * 
 * @param key - Optional: view specific key (creep name or memory path)
 * @example memory()
 * @example memory('harvester_12345')
 */
export function memory(key?: string): void {
  if (!key) {
    console.log(JSON.stringify(Memory, null, 2));
    return;
  }

  // Try to find creep memory
  if (key in Memory.creeps) {
    console.log(JSON.stringify(Memory.creeps[key], null, 2));
    return;
  }

  // Try as direct memory path
  const value = (Memory as any)[key];
  if (value !== undefined) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  console.log(`⚠️  Key not found: ${key}`);
}

/**
 * CONFIG - Display current behavior configuration
 * 
 * @example config()
 * @example config(1)  // for RCL 1
 */
export function config(rcl?: number): void {
  if (rcl === undefined) {
    // Show configs for all controlled rooms
    for (const room of Object.values(Game.rooms)) {
      if (room.controller?.my) {
        config(room.controller.level);
      }
    }
    return;
  }

  const cfg = getBehaviorConfig(rcl);
  section(`BEHAVIOR CONFIG - RCL ${rcl}`);
  console.log(`Name: ${cfg.name}`);
  console.log(`Description: ${cfg.description}\n`);
  console.log('Roles:');

  for (const role of cfg.roles) {
    console.log(`  ${role.name.padEnd(15)} | Priority: ${role.priority.toString().padEnd(3)} | Target: ${role.targetCount} | Body: ${role.body.join(',')}`);
  }

  console.log();
}

/**
 * ROOMS - List all owned rooms
 * 
 * @example rooms()
 */
export function rooms(): void {
  const ownedRooms = Object.values(Game.rooms).filter(r => r.controller?.my);

  if (ownedRooms.length === 0) {
    console.log('⚠️  No rooms under control');
    return;
  }

  section(`OWNED ROOMS (${ownedRooms.length})`);

  for (const room of ownedRooms) {
    const creepCount = room.find(FIND_MY_CREEPS).length;
    const spawnCount = room.find(FIND_MY_SPAWNS).length;
    console.log(`  ${room.name.padEnd(10)} | RCL: ${room.controller?.level} | Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | Creeps: ${creepCount} | Spawns: ${spawnCount}`);
  }

  console.log();
}

/**
 * ROOM - Get a room object by name
 * 
 * @param name - Room name (e.g., 'W1N1')
 * @example room('W1N1')
 */
export function room(name: string): Room | null {
  const r = Game.rooms[name];
  if (!r) {
    console.log(`❌ Room not found: ${name}`);
    return null;
  }
  return r;
}

/**
 * GOTO - Move all creeps to a target position
 * 
 * @param target - Target room position, creep name, or structure
 * @example goto(new RoomPosition(25, 25, 'W1N1'))
 * @example goto('W1N1', 25, 25)
 */
export function goto(x: number | RoomPosition | string, y?: number, roomName?: string): void {
  let pos: RoomPosition;

  if (x instanceof RoomPosition) {
    pos = x;
  } else if (typeof x === 'string' && y !== undefined && roomName !== undefined) {
    pos = new RoomPosition(y, roomName as unknown as number, x);
  } else if (typeof x === 'string') {
    // Try to find creep or structure
    const creep = Game.creeps[x];
    if (creep) {
      pos = creep.pos;
    } else {
      console.log(`❌ Target not found: ${x}`);
      return;
    }
  } else {
    console.log('❌ Invalid arguments');
    return;
  }

  const creeps = Object.values(Game.creeps);
  console.log(`📍 Moving ${creeps.length} creeps to ${pos.x},${pos.y} in ${pos.roomName}`);

  for (const creep of creeps) {
    creep.travelTo(pos);
  }
}

/**
 * FLAG - Place a flag at a position (for visual reference)
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param roomName - Room name
 * @example flag(25, 25, 'W1N1')
 */
export function flag(x: number, y: number, roomName: string): void {
  const flagName = `flag_${Game.time}`;
  const result = Game.flags[flagName] ? Game.flags[flagName].remove() : OK;

  if (result === OK || result === ERR_NOT_FOUND) {
    Game.map.visual.circle(new RoomPosition(x, y, roomName), { radius: 0.5, stroke: 'red' });
    console.log(`🚩 Flag placed at ${x},${y} in ${roomName}`);
  }
}

/**
 * CLEAR - Clear console history
 * 
 * @example clear()
 */
export function clear(): void {
  console.clear?.();
  console.log('✨ Console cleared');
}

/**
 * MODE - Display or switch empire mode
 * 
 * @param newMode - Optional: 'command' or 'delegate' to switch modes
 * @example mode()
 * @example mode('command')
 * @example mode('delegate')
 */
export function mode(newMode?: 'command' | 'delegate'): void {
  if (newMode) {
    const changed = setMode(newMode);
    if (changed) {
      displayModeInfo();
      console.log(`✅ Empire mode switched to ${newMode.toUpperCase()}`);
    } else {
      console.log(`⚠️  Already in ${newMode} mode`);
    }
  } else {
    displayModeInfo();
  }
}

/**
 * TASK - Assign a task to a creep
 * 
 * @param creepName - Name of creep to assign task to
 * @param taskType - Type of task: harvest, deliver, build, upgrade, move, repair, idle
 * @param targetId - Target ID (for harvest, deliver, build, repair)
 * @example task('harvester_123', 'harvest', 'abc123def')
 * @example task('harvester_123', 'upgrade')
 * @example task('harvester_123', 'move', '25:20:W1N1')
 */
export function task(creepName: string, taskType: string, targetId?: string): void {
  const creep = Game.creeps[creepName];
  if (!creep) {
    console.log(`❌ Creep not found: ${creepName}`);
    return;
  }

  let t: any;

  switch (taskType.toLowerCase()) {
    case 'harvest':
      if (!targetId) {
        console.log('❌ harvest requires target source ID');
        return;
      }
      t = createHarvestTask(targetId);
      break;

    case 'deliver':
      if (!targetId) {
        console.log('❌ deliver requires target structure ID');
        return;
      }
      t = createDeliverTask(targetId);
      break;

    case 'build':
      if (!targetId) {
        console.log('❌ build requires target site ID');
        return;
      }
      t = createBuildTask(targetId);
      break;

    case 'upgrade':
      t = createUpgradeTask();
      break;

    case 'move': {
      if (!targetId) {
        console.log('❌ move requires target position (x:y:roomName)');
        return;
      }
      const parts = targetId.split(':');
      if (parts.length !== 3) {
        console.log('❌ move format: x:y:roomName (e.g., 25:20:W1N1)');
        return;
      }
      const [x, y, roomName] = parts;
      t = createMoveTask(parseInt(x), parseInt(y), roomName);
      break;
    }

    case 'repair':
      if (!targetId) {
        console.log('❌ repair requires target structure ID');
        return;
      }
      t = createRepairTask(targetId);
      break;

    case 'idle':
      t = createIdleTask();
      break;

    default:
      console.log(`❌ Unknown task type: ${taskType}`);
      console.log('Available: harvest, deliver, build, upgrade, move, repair, idle');
      return;
  }

  assignTask(creep, t);
  console.log(`✅ Assigned task to ${creepName}: ${getTaskDescription(t)}`);
}

/**
 * TASKS - View tasks assigned to creeps
 * 
 * @param roomName - Optional: filter by room
 * @example tasks()
 * @example tasks('W1N1')
 */
export function tasks(roomName?: string): void {
  const allCreeps = Object.values(Game.creeps);
  const filtered = roomName
    ? allCreeps.filter(c => c.memory.room === roomName)
    : allCreeps;

  const withTasks = filtered.filter(c => getTask(c));

  if (withTasks.length === 0) {
    console.log('⚠️  No creeps have assigned tasks');
    return;
  }

  section(`CREEP TASKS (${withTasks.length})`);

  for (const creep of withTasks) {
    const t = getTask(creep);
    if (t) {
      console.log(`  ${creep.name.padEnd(30)} | ${getTaskDescription(t)}`);
    }
  }

  console.log();
}

/**
 * UNTASK - Clear task from a creep
 * 
 * @param creepName - Name of creep to clear task from
 * @example untask('harvester_123')
 */
export function untask(creepName: string): void {
  const creep = Game.creeps[creepName];
  if (!creep) {
    console.log(`❌ Creep not found: ${creepName}`);
    return;
  }

  clearTask(creep);
  console.log(`✅ Cleared task from ${creepName}`);
}

/**
 * SCAN - Scan a room and register its structures
 * 
 * @param roomName - Room to scan (defaults to first owned room)
 * @example scan()
 * @example scan('W1N1')
 */
export function scan(roomName?: string): void {
  let targetRoom: Room | undefined;

  if (roomName) {
    targetRoom = Game.rooms[roomName];
    if (!targetRoom) {
      console.log(`❌ Room not found: ${roomName}`);
      return;
    }
  } else {
    // Scan all owned rooms
    for (const room of Object.values(Game.rooms)) {
      if (room.controller?.my) {
        scanRoom(room);
      }
    }
    console.log('✅ Scanned all owned rooms');
    return;
  }

  scanRoom(targetRoom);
  console.log(`✅ Scanned room ${roomName}`);
}

/**
 * STRUCTURES - List registered structures
 * 
 * @param roomName - Optional: filter by room
 * @example structures()
 * @example structures('W1N1')
 */
export function structures(roomName?: string): void {
  listStructures(roomName);
}

/**
 * LOCK - Lock a structure (prevent actions on it)
 * 
 * @param nameOrId - Structure name or ID
 * @example lock('SourceA')
 * @example lock('SpawnMain')
 */
export function lock(nameOrId: string): void {
  const success = lockStructure(nameOrId);
  if (success) {
    console.log(`🔒 Locked ${nameOrId}`);
  } else {
    console.log(`❌ Structure not found: ${nameOrId}`);
  }
}

/**
 * UNLOCK - Unlock a structure
 * 
 * @param nameOrId - Structure name or ID
 * @example unlock('SourceA')
 * @example unlock('SpawnMain')
 */
export function unlock(nameOrId: string): void {
  const success = unlockStructure(nameOrId);
  if (success) {
    console.log(`🔓 Unlocked ${nameOrId}`);
  } else {
    console.log(`❌ Structure not found: ${nameOrId}`);
  }
}

/**
 * LOCKED - View all locked structures
 * 
 * @param roomName - Optional: filter by room
 * @example locked()
 * @example locked('W1N1')
 */
export function locked(roomName?: string): void {
  const lockedStructs = getLockedStructures(roomName);

  if (lockedStructs.length === 0) {
    console.log('✅ No locked structures');
    return;
  }

  section(`LOCKED STRUCTURES (${lockedStructs.length})`);

  for (const info of lockedStructs) {
    console.log(`  🔒 ${info.name.padEnd(25)} | ${info.type} | ${info.roomName}`);
  }

  console.log();
}

/**
 * RENAME - Rename a structure
 * 
 * @param oldName - Current name or ID
 * @param newName - New name
 * @example rename('SourceA', 'MainSource')
 * @example rename('SpawnMain', 'SpawnPrimary')
 */
export function rename(oldName: string, newName: string): void {
  const success = renameStructure(oldName, newName);
  if (success) {
    console.log(`✅ Renamed ${oldName} → ${newName}`);
  } else {
    console.log(`❌ Failed to rename (not found or name conflict)`);
  }
}

/**
 * SHOWNALES - Display structure names as visual labels on the map
 * 
 * @param roomName - Room to display labels in
 * @param duration - How many ticks to persist (default 3)
 * @example showNames('W1N1')
 * @example showNames('W1N1', 10)
 */
export function showNames(roomName: string, duration: number = 3): void {
  const room = Game.rooms[roomName];
  if (!room) {
    console.log(`❌ Room not found: ${roomName}`);
    return;
  }

  visualShowNames(roomName, duration);
  console.log(`👁️  Structure labels will display for ${duration} ticks`);
}

/**
 * HIDENAMES - Hide structure name displays
 * 
 * @param roomName - Room to hide labels in
 * @example hideNames('W1N1')
 */
export function hideNames(roomName: string): void {
  visualHideNames(roomName);
}

/**
 * LEGASTATUS - Show LegatusOficio status for a room
 * 
 * @param roomName - Room to query
 * @example legaStatus('W1N1')
 */
export function legaStatus(roomName: string): void {
  const assignments = getRoomAssignments(roomName);
  console.log(getLegaStatus(roomName));
  
  if (assignments.length > 0) {
    console.log(`\nActive Assignments:`);
    for (const assignment of assignments) {
      const ageTicks = Game.time - assignment.assignedAt;
      console.log(
        `  ${assignment.creepName.padEnd(30)} → ${assignment.command.type.padEnd(12)} (${ageTicks} ticks)`
      );
    }
  }
}

/**
 * LEGALIRT - List all Legatus assignments in a room
 * 
 * @param roomName - Room to list
 * @example legaList('W1N1')
 */
export function legaList(roomName: string): void {
  listLegaAssignments(roomName);
}

/**
 * BODIES - List all registered body configurations
 * 
 * @param role - Optional: filter by role
 * @example bodies()
 * @example bodies('harvester')
 */
export function bodies(role?: string): void {
  listBodyConfigs(role);
}

/**
 * REGBODY - Register a new body configuration
 * 
 * @param name - Name of the body type
 * @param partsArray - Array of body parts
 * @param role - Optional: role this body is for
 * @example regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
 * @example regBody('scout', [MOVE])
 */
export function regBody(name: string, partsArray: BodyPartConstant[], role: string = 'generic'): void {
  registerBody(name, partsArray, role);
  const cost = getBodyCost(partsArray);
  console.log(`✅ Registered body '${name}' (${partsArray.length} parts, ${cost}E)`);
}

/**
 * Register all console commands globally
 * This is called from main.ts to make all commands available
 */
export function registerConsoleCommands(): void {
  (global as any).help = help;
  (global as any).status = status;
  (global as any).spawn = spawn;
  (global as any).spawnCreep = spawnCreep;
  (global as any).despawn = despawn;
  (global as any).creeps = creeps;
  (global as any).memory = memory;
  (global as any).config = config;
  (global as any).rooms = rooms;
  (global as any).room = room;
  (global as any).goto = goto;
  (global as any).flag = flag;
  (global as any).clear = clear;
  (global as any).mode = mode;
  (global as any).task = task;
  (global as any).tasks = tasks;
  (global as any).untask = untask;
  (global as any).scan = scan;
  (global as any).structures = structures;
  (global as any).lock = lock;
  (global as any).unlock = unlock;
  (global as any).locked = locked;
  (global as any).rename = rename;
  (global as any).showNames = showNames;
  (global as any).hideNames = hideNames;
  (global as any).legaStatus = legaStatus;
  (global as any).legaList = legaList;
  (global as any).bodies = bodies;
  (global as any).regBody = regBody;

  console.log('✅ Console commands registered. Type help() for usage.');
}
