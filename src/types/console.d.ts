/**
 * Global Console Command Declarations
 * 
 * These are the global functions registered by registerConsoleCommands()
 * This file provides VS Code autocomplete and parameter hints for console commands.
 * 
 * Usage in VS Code:
 * 1. Type a command name (e.g., 'spawn')
 * 2. Press Ctrl+Space for autocomplete suggestions
 * 3. See full parameter hints and return types
 * 4. Copy the command and paste into Screeps console
 * 
 * @example
 * // In VS Code, you'll get autocomplete for:
 * status()
 * spawn('harvester', 'E3S42')
 * spawnCreep('H1', 'harvester', 'harvester_basic')
 */

// ==================== STATUS & INFO ====================

/**
 * Display colony-wide status with all rooms and creep information.
 * @param roomName - Optional: specific room to show (defaults to all rooms)
 * @example status()
 * @example status('E3S42')
 */
declare function status(roomName?: string): void;

/**
 * Display all available commands with usage information.
 * @example help()
 */
declare function help(): void;

/**
 * View Memory structure and creep-specific data.
 * @param key - Optional: specific creep name or memory key
 * @example memory()
 * @example memory('harvester_12345')
 * @example memory('empire')
 */
declare function memory(key?: string): void;

/**
 * View behavior configuration for different RCL levels.
 * @param rcl - Optional: specific RCL level (1, 2, etc.)
 * @example config()
 * @example config(1)
 */
declare function config(rcl?: number): void;

/**
 * List all owned rooms with stats.
 * @example rooms()
 */
declare function rooms(): void;

/**
 * Get a specific Room object by name.
 * @param name - Room name (e.g., 'E3S42', 'W1N1')
 * @returns Room object or null if not found
 * @example room('E3S42')
 */
declare function room(name: string): Room | null;

// ==================== SPAWNING & CREEPS ====================

/**
 * Spawn a creep with auto-generated name.
 * @param role - Role type: 'harvester' | 'upgrader' | 'builder' | 'scout' | 'hauler'
 * @param roomName - Optional: room name (defaults to current room)
 * @returns The new creep or false if spawn failed
 * @example spawn('harvester')
 * @example spawn('harvester', 'E3S42')
 */
declare function spawn(role: string, roomName?: string): Creep | false;

/**
 * Spawn a creep with custom name and body configuration.
 * @param creepName - Custom creep name (e.g., 'H1', 'Scout_Alpha')
 * @param role - Role type (e.g., 'harvester', 'upgrader', 'builder')
 * @param bodyTypeOrArray - Either a registered body config name or array of body parts
 * @param roomName - Optional: room name (defaults to current room)
 * @returns The new creep or false if spawn failed
 * @example spawnCreep('H1', 'harvester', 'harvester_basic')
 * @example spawnCreep('H2', 'harvester', [WORK, WORK, CARRY, MOVE], 'E3S42')
 */
declare function spawnCreep(
  creepName: string,
  role: string,
  bodyTypeOrArray: string | BodyPartConstant[],
  roomName?: string
): Creep | false;

/**
 * Delete a creep immediately.
 * @param creepName - Name of creep to delete
 * @example despawn('H1')
 */
declare function despawn(creepName: string): void;

/**
 * List all creeps, optionally filtered by room.
 * @param roomName - Optional: filter by room name
 * @example creeps()
 * @example creeps('E3S42')
 */
declare function creeps(roomName?: string): void;

// ==================== BODY CONFIGURATIONS ====================

/**
 * List all registered body configurations, optionally filtered by role.
 * @param role - Optional: filter by role (e.g., 'harvester', 'upgrader')
 * @example bodies()
 * @example bodies('harvester')
 */
declare function bodies(role?: string): void;

/**
 * Register a new body configuration.
 * @param name - Unique config name (e.g., 'harvester_v2', 'scout')
 * @param partsArray - Array of body parts (e.g., [WORK, CARRY, MOVE])
 * @param role - Optional: role label (defaults to 'generic')
 * @example regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
 * @example regBody('fast_scout', [MOVE, MOVE])
 */
declare function regBody(
  name: string,
  partsArray: BodyPartConstant[],
  role?: string
): void;

// ==================== TASK ASSIGNMENT ====================

/**
 * Assign a task to a creep.
 * @param creepName - Name of creep to assign task to
 * @param taskType - Task type: 'harvest' | 'deliver' | 'build' | 'upgrade' | 'repair' | 'move' | 'idle'
 * @param targetId - Optional: target ID/name (required for harvest, deliver, build, repair, move)
 * @example task('H1', 'harvest', 'SourceA')
 * @example task('U1', 'upgrade')
 * @example task('Scout', 'move', '25:30:E3S42')
 */
declare function task(
  creepName: string,
  taskType: string,
  targetId?: string
): void;

/**
 * View all tasks assigned to creeps, optionally filtered by room.
 * @param roomName - Optional: filter by room name
 * @example tasks()
 * @example tasks('E3S42')
 */
declare function tasks(roomName?: string): void;

/**
 * Clear a task from a creep.
 * @param creepName - Name of creep to clear task from
 * @example untask('H1')
 */
declare function untask(creepName: string): void;

// ==================== STRUCTURE MANAGEMENT ====================

/**
 * Register/update structures in a room.
 * @param roomName - Optional: room name (defaults to current room or scans all if none)
 * @example scan()
 * @example scan('E3S42')
 */
declare function scan(roomName?: string): void;

/**
 * List all registered structures, optionally filtered by room.
 * @param roomName - Optional: filter by room name
 * @example structures()
 * @example structures('E3S42')
 */
declare function structures(roomName?: string): void;

/**
 * Rename a registered structure.
 * @param oldName - Current structure name or ID
 * @param newName - New name for the structure
 * @example rename('SourceA', 'MainSource')
 */
declare function rename(oldName: string, newName: string): void;

/**
 * Lock a structure to prevent creep actions on it.
 * @param nameOrId - Structure registered name or ID
 * @example lock('SourceA')
 */
declare function lock(nameOrId: string): void;

/**
 * Unlock a structure to allow creep actions.
 * @param nameOrId - Structure registered name or ID
 * @example unlock('SourceA')
 */
declare function unlock(nameOrId: string): void;

/**
 * View all locked structures, optionally filtered by room.
 * @param roomName - Optional: filter by room name
 * @example locked()
 * @example locked('E3S42')
 */
declare function locked(roomName?: string): void;

// ==================== VISUAL LABELS ====================

/**
 * Display structure names as labels on the map.
 * @param roomName - Optional: room name (defaults to current room)
 * @param duration - Optional: how many ticks to display labels (defaults to 3)
 * @example showNames()
 * @example showNames('E3S42')
 * @example showNames('E3S42', 10)
 */
declare function showNames(roomName?: string, duration?: number): void;

/**
 * Hide structure name displays.
 * @param roomName - Optional: room name (defaults to current room)
 * @example hideNames()
 * @example hideNames('E3S42')
 */
declare function hideNames(roomName?: string): void;

// ==================== LEGATUS COMMANDS ====================

/**
 * Show LegatusOficio command processor assignments in a room.
 * @param roomName - Optional: room name (defaults to current room)
 * @example legaStatus()
 * @example legaStatus('E3S42')
 */
declare function legaStatus(roomName?: string): void;

/**
 * List all Legatus assignments in a room.
 * @param roomName - Optional: room name (defaults to current room)
 * @example legaList()
 * @example legaList('E3S42')
 */
declare function legaList(roomName?: string): void;

// ==================== MOVEMENT & NAVIGATION ====================

/**
 * Move all creeps to a target position.
 * @param x - X coordinate, RoomPosition object, or creep name
 * @param y - Optional: Y coordinate (only with number x)
 * @param roomName - Optional: room name (only with number x/y)
 * @example goto(new RoomPosition(25, 30, 'E3S42'))
 * @example goto(25, 30, 'E3S42')
 * @example goto('H1')
 */
declare function goto(
  x: number | RoomPosition | string,
  y?: number,
  roomName?: string
): void;

/**
 * Place a visual flag for reference (visual marker only).
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param roomName - Room name
 * @example flag(25, 25, 'E3S42')
 */
declare function flag(x: number, y: number, roomName: string): void;

// ==================== EMPIRE MODE ====================

/**
 * Display or switch empire mode.
 * @param newMode - Optional: 'command' (manual) or 'delegate' (automatic AI)
 * @example mode()
 * @example mode('command')
 * @example mode('delegate')
 */
declare function mode(newMode?: 'command' | 'delegate'): void;

// ==================== UTILITY ====================

/**
 * Clear console output.
 * @example clear()
 */
declare function clear(): void;
