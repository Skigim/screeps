/**
 * SPAWN MANAGER MODULE
 * 
 * Manages creep spawning strategy and body design for RCL1 foundation.
 * 
 * Spawning Priority (RCL1):
 * 1. Minimum 2 harvesters (critical - economy collapses without them)
 * 2. Minimum 2 upgraders (prevent controller downgrade)
 * 3. Builders only if construction sites exist (max 2)
 * 4. Scale up upgraders if excess energy (max 4)
 * 
 * Body Design Philosophy:
 * - Simple [WORK, CARRY, MOVE] repeating pattern
 * - Scales automatically with available energy
 * - Cost per unit: 200 energy
 * - Balanced: 1 WORK (mining/building), 1 CARRY (transport), 1 MOVE (speed)
 */

/**
 * Manages spawning for a single spawn structure.
 * Evaluates current room state and spawns the highest priority creep.
 * 
 * @param spawn - The spawn structure to manage
 * @param room - The room the spawn is in
 * @param harvesterCount - Current number of harvester creeps
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
 * const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
 * const upgraderCount = creeps.filter(c => c.memory.role === 'upgrader').length;
 * const builderCount = creeps.filter(c => c.memory.role === 'builder').length;
 * 
 * manageSpawn(spawn, room, harvesterCount, upgraderCount, builderCount);
 * ```
 */
export function manageSpawn(
  spawn: StructureSpawn,
  room: Room,
  harvesterCount: number,
  upgraderCount: number,
  builderCount: number
): void {
  // Don't try to spawn if already spawning
  if (spawn.spawning) return;

  const energy = room.energyAvailable;
  const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);

  // PRIORITY 1: Emergency - Always maintain minimum harvesters
  // Without harvesters, no energy flows and the economy collapses
  if (harvesterCount < 2) {
    spawnHarvester(spawn, room, energy);
    return;
  }

  // PRIORITY 2: Maintain upgraders to prevent controller downgrade
  // Controller downgrade would reset RCL progress and waste time
  if (upgraderCount < 2) {
    spawnUpgrader(spawn, room, energy);
    return;
  }

  // PRIORITY 3: Spawn builder if construction sites exist
  // Only spawn builders when there's work for them to do
  if (constructionSites.length > 0 && builderCount < 2) {
    spawnBuilder(spawn, room, energy);
    return;
  }

  // PRIORITY 4: Expansion - Add more upgraders if we have energy to spare
  // More upgraders = faster RCL progression
  // Only spawn if we have at least 550 energy (can afford decent body)
  if (upgraderCount < 4 && energy >= 550) {
    spawnUpgrader(spawn, room, energy);
    return;
  }

  // No spawning needed at this time
}

/**
 * Spawns a harvester creep with optimal body for available energy.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnHarvester(spawn: StructureSpawn, room: Room, energy: number): void {
  const body = getBody(energy);
  const result = spawn.spawnCreep(body, `harvester_${Game.time}`, {
    memory: { role: 'harvester', room: room.name, working: false }
  });
  
  if (result === OK) {
    console.log(`🌾 Spawning harvester with ${energy} energy (${body.length} parts)`);
  }
  // Possible errors: ERR_NOT_ENOUGH_ENERGY, ERR_NAME_EXISTS, ERR_BUSY
}

/**
 * Spawns an upgrader creep with optimal body for available energy.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnUpgrader(spawn: StructureSpawn, room: Room, energy: number): void {
  const body = getBody(energy);
  const result = spawn.spawnCreep(body, `upgrader_${Game.time}`, {
    memory: { role: 'upgrader', room: room.name, working: false }
  });
  
  if (result === OK) {
    console.log(`⬆️ Spawning upgrader with ${energy} energy (${body.length} parts)`);
  }
}

/**
 * Spawns a builder creep with optimal body for available energy.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnBuilder(spawn: StructureSpawn, room: Room, energy: number): void {
  const body = getBody(energy);
  const result = spawn.spawnCreep(body, `builder_${Game.time}`, {
    memory: { role: 'builder', room: room.name, working: false }
  });
  
  if (result === OK) {
    console.log(`🔨 Spawning builder with ${energy} energy (${body.length} parts)`);
  }
}

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
export function getBody(energy: number): BodyPartConstant[] {
  const body: BodyPartConstant[] = [];
  
  // Start with basic unit cost
  const unitCost = 200; // WORK (100) + CARRY (50) + MOVE (50)
  let remainingEnergy = energy;

  // Add [W, C, M] units until we run out of energy or hit size limit
  // Cap at 12 parts (4 units) to keep CPU cost reasonable for RCL1
  while (remainingEnergy >= unitCost && body.length < 12) {
    body.push(WORK, CARRY, MOVE);
    remainingEnergy -= unitCost;
  }

  // Minimum viable creep: At least one [W, C, M] unit
  // This ensures the creep can actually perform its job
  if (body.length === 0) {
    body.push(WORK, CARRY, MOVE); // Force at least one unit (200 energy)
  }

  return body;
}

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
export function getSpawnStatus(spawn: StructureSpawn): string {
  if (spawn.spawning) {
    const progress = Math.round((1 - spawn.spawning.remainingTime / spawn.spawning.needTime) * 100);
    return `Spawning ${spawn.spawning.name} (${progress}% complete)`;
  }
  return 'Idle';
}
