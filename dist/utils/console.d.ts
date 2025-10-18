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
/**
 * HELP - Display all available commands
 *
 * @example help()
 */
export declare function help(): void;
/**
 * STATUS - Display colony-wide status
 *
 * @param roomName - Optional: show only this room
 * @example status()
 * @example status('W1N1')
 */
export declare function status(roomName?: string): void;
/**
 * SPAWN - Spawn a creep of a given role
 *
 * @param role - Role name (harvester, upgrader, builder)
 * @param roomName - Room to spawn in
 * @returns The new creep, or false if failed
 *
 * @example spawn('harvester', 'W1N1')
 */
export declare function spawn(role: string, roomName: string): Creep | false;
/**
 * DESPAWN - Delete a creep
 *
 * @param creepName - Name of creep to delete
 * @example despawn('harvester_12345')
 */
export declare function despawn(creepName: string): void;
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
export declare function spawnCreep(creepName: string, role: string, bodyTypeOrArray: string | BodyPartConstant[], roomName: string): Creep | false;
/**
 * CREEPS - List all creeps (optionally filtered by room)
 *
 * @param roomName - Optional: filter by room
 * @example creeps()
 * @example creeps('W1N1')
 */
export declare function creeps(roomName?: string): void;
/**
 * MEMORY - View memory structure
 *
 * @param key - Optional: view specific key (creep name or memory path)
 * @example memory()
 * @example memory('harvester_12345')
 */
export declare function memory(key?: string): void;
/**
 * CONFIG - Display current behavior configuration
 *
 * @example config()
 * @example config(1)  // for RCL 1
 */
export declare function config(rcl?: number): void;
/**
 * ROOMS - List all owned rooms
 *
 * @example rooms()
 */
export declare function rooms(): void;
/**
 * ROOM - Get a room object by name
 *
 * @param name - Room name (e.g., 'W1N1')
 * @example room('W1N1')
 */
export declare function room(name: string): Room | null;
/**
 * GOTO - Move all creeps to a target position
 *
 * @param target - Target room position, creep name, or structure
 * @example goto(new RoomPosition(25, 25, 'W1N1'))
 * @example goto('W1N1', 25, 25)
 */
export declare function goto(x: number | RoomPosition | string, y?: number, roomName?: string): void;
/**
 * FLAG - Place a flag at a position (for visual reference)
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param roomName - Room name
 * @example flag(25, 25, 'W1N1')
 */
export declare function flag(x: number, y: number, roomName: string): void;
/**
 * CLEAR - Clear console history
 *
 * @example clear()
 */
export declare function clear(): void;
/**
 * MODE - Display or switch empire mode
 *
 * @param newMode - Optional: 'command' or 'delegate' to switch modes
 * @example mode()
 * @example mode('command')
 * @example mode('delegate')
 */
export declare function mode(newMode?: 'command' | 'delegate'): void;
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
export declare function task(creepName: string, taskType: string, targetId?: string): void;
/**
 * TASKS - View tasks assigned to creeps
 *
 * @param roomName - Optional: filter by room
 * @example tasks()
 * @example tasks('W1N1')
 */
export declare function tasks(roomName?: string): void;
/**
 * UNTASK - Clear task from a creep
 *
 * @param creepName - Name of creep to clear task from
 * @example untask('harvester_123')
 */
export declare function untask(creepName: string): void;
/**
 * SCAN - Scan a room and register its structures
 *
 * @param roomName - Room to scan (defaults to first owned room)
 * @example scan()
 * @example scan('W1N1')
 */
export declare function scan(roomName?: string): void;
/**
 * STRUCTURES - List registered structures
 *
 * @param roomName - Optional: filter by room
 * @example structures()
 * @example structures('W1N1')
 */
export declare function structures(roomName?: string): void;
/**
 * LOCK - Lock a structure (prevent actions on it)
 *
 * @param nameOrId - Structure name or ID
 * @example lock('SourceA')
 * @example lock('SpawnMain')
 */
export declare function lock(nameOrId: string): void;
/**
 * UNLOCK - Unlock a structure
 *
 * @param nameOrId - Structure name or ID
 * @example unlock('SourceA')
 * @example unlock('SpawnMain')
 */
export declare function unlock(nameOrId: string): void;
/**
 * LOCKED - View all locked structures
 *
 * @param roomName - Optional: filter by room
 * @example locked()
 * @example locked('W1N1')
 */
export declare function locked(roomName?: string): void;
/**
 * RENAME - Rename a structure
 *
 * @param oldName - Current name or ID
 * @param newName - New name
 * @example rename('SourceA', 'MainSource')
 * @example rename('SpawnMain', 'SpawnPrimary')
 */
export declare function rename(oldName: string, newName: string): void;
/**
 * SHOWNALES - Display structure names as visual labels on the map
 *
 * @param roomName - Room to display labels in
 * @param duration - How many ticks to persist (default 3)
 * @example showNames('W1N1')
 * @example showNames('W1N1', 10)
 */
export declare function showNames(roomName: string, duration?: number): void;
/**
 * HIDENAMES - Hide structure name displays
 *
 * @param roomName - Room to hide labels in
 * @example hideNames('W1N1')
 */
export declare function hideNames(roomName: string): void;
/**
 * LEGASTATUS - Show LegatusOficio status for a room
 *
 * @param roomName - Room to query
 * @example legaStatus('W1N1')
 */
export declare function legaStatus(roomName: string): void;
/**
 * LEGALIRT - List all Legatus assignments in a room
 *
 * @param roomName - Room to list
 * @example legaList('W1N1')
 */
export declare function legaList(roomName: string): void;
/**
 * BODIES - List all registered body configurations
 *
 * @param role - Optional: filter by role
 * @example bodies()
 * @example bodies('harvester')
 */
export declare function bodies(role?: string): void;
/**
 * REGBODY - Register a new body configuration
 *
 * @param name - Name of the body type
 * @param partsArray - Array of body parts
 * @param role - Optional: role this body is for
 * @example regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
 * @example regBody('scout', [MOVE])
 */
export declare function regBody(name: string, partsArray: BodyPartConstant[], role?: string): void;
/**
 * Register all console commands globally
 * This is called from main.ts to make all commands available
 */
export declare function registerConsoleCommands(): void;
//# sourceMappingURL=console.d.ts.map