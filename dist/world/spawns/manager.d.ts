/**
 * SPAWN MANAGER MODULE
 *
 * Manages creep spawning strategy with spawn lock protection and body scaling.
 *
 * RCL2 Strategy:
 * - 2 Miners + 3 Haulers (core production team)
 * - Spawn lock if any critical creep drops below 250 TTL
 * - Body scaling based on room energy capacity
 * - 1 Builder (idles when spawn locked, prioritizes extensions/roads)
 */
/**
 * Manages spawning for a single spawn structure.
 * Evaluates current room state and spawns the highest priority creep.
 *
 * @param spawn - The spawn structure to manage
 * @param room - The room the spawn is in
 * @param minerCount - Current number of miner creeps
 * @param upgraderCount - Current number of upgrader creeps
 * @param builderCount - Current number of builder creeps
 *
 * @remarks
 * This function should be called once per tick per spawn.
 * It will only spawn one creep per call (spawn can only spawn one at a time).
 *
 * @example
 * ```typescript
 * const spawn = Game.spawns['Spawn1'];
 * const room = spawn.room;
 * const creeps = room.find(FIND_MY_CREEPS);
 * const minerCount = creeps.filter(c => c.memory.role === 'miner').length;
 * const upgraderCount = creeps.filter(c => c.memory.role === 'upgrader').length;
 * const builderCount = creeps.filter(c => c.memory.role === 'builder').length;
 *
 * manageSpawn(spawn, room, minerCount, upgraderCount, builderCount);
 * ```
 */
export declare function manageSpawn(spawn: StructureSpawn, room: Room, minerCount: number, _upgraderCount: number, builderCount: number): void;
/**
 * Designs an optimal creep body based on available energy.
 *
 * Pattern: [WORK, CARRY, MOVE] repeating
 * - WORK: 100 energy (harvests 2 energy/tick, builds 5 progress/tick)
 * - CARRY: 50 energy (holds 50 energy)
 * - MOVE: 50 energy (moves 1 tile/tick on roads, 1 tile/2 ticks on plain)
 *
 * Cost per unit: 200 energy
 *
 * Examples:
 * - 300 energy → [W, C, M] (minimum viable)
 * - 550 energy → [W, C, M, W, C, M] (2 units)
 * - 800 energy → [W, C, M, W, C, M, W, C, M] (3 units)
 *
 * @param energy - Available energy for body design
 * @returns Array of body part constants
 *
 * @remarks
 * Max body size is 50 parts (hard limit in Screeps).
 * This function caps at 12 parts (4 units) to keep CPU cost reasonable.
 *
 * The [W,C,M] pattern ensures:
 * - Balanced performance (work + carry + mobility)
 * - No bottlenecks (can work and carry simultaneously)
 * - Efficient movement (1 MOVE per 2 parts)
 */
export declare function getBody(energy: number): BodyPartConstant[];
/**
 * Gets a human-readable summary of spawn status.
 * Useful for debugging and console output.
 *
 * @param spawn - The spawn to get status for
 * @returns Status string
 *
 * @example
 * ```typescript
 * const status = getSpawnStatus(Game.spawns['Spawn1']);
 * console.log(status); // "Spawning harvester_12345 (50% complete)"
 * ```
 */
export declare function getSpawnStatus(spawn: StructureSpawn): string;
//# sourceMappingURL=manager.d.ts.map