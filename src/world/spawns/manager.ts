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

import { isSpawnLocked } from './spawnLock';
import { 
  getOptimalMinerBody, 
  getOptimalHaulerBody, 
  getOptimalBuilderBody,
  calculateBodyCost 
} from './bodyScaling';

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
export function manageSpawn(
  spawn: StructureSpawn,
  room: Room,
  minerCount: number,
  _upgraderCount: number,
  builderCount: number
): void {
  // Don't try to spawn if already spawning
  if (spawn.spawning) return;

  // Check spawn lock - prevents spawning if critical team at risk
  if (isSpawnLocked(room)) {
    return;
  }

  const energy = room.energyAvailable;
  const energyCapacity = room.energyCapacityAvailable;
  const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);

  // PRIORITY 1: Emergency - Always maintain minimum miners (2)
  // Without miners, no energy flows and the economy collapses
  if (minerCount < 2) {
    const minerBody = getOptimalMinerBody(energyCapacity);
    if (energy >= calculateBodyCost(minerBody)) {
      spawnMiner(spawn, room, minerBody);
    }
    return;
  }

  // PRIORITY 2: Maintain haulers (3 total: 2 per source + 1 roaming)
  // Haulers move energy to spawn/storage
  if (minerCount >= 2 && builderCount < 3) {
    const haulerBody = getOptimalHaulerBody(energyCapacity);
    if (energy >= calculateBodyCost(haulerBody)) {
      spawnHauler(spawn, room, haulerBody);
    }
    return;
  }

  // PRIORITY 3: Spawn builder if construction sites exist
  // Extensions → Roads → Controller (if TTL < 5000)
  if (constructionSites.length > 0 && builderCount < 1) {
    const builderBody = getOptimalBuilderBody(energyCapacity);
    if (energy >= calculateBodyCost(builderBody)) {
      spawnBuilder(spawn, room, builderBody);
    }
    return;
  }

  // No spawning needed at this time
}

/**
 * Spawns a miner creep with specified or optimal body.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param bodyOrEnergy - Either body array or energy number for auto-design
 */
function spawnMiner(spawn: StructureSpawn, room: Room, bodyOrEnergy: BodyPartConstant[] | number): void {
  const body = Array.isArray(bodyOrEnergy) ? bodyOrEnergy : getBody(bodyOrEnergy);
  const result = spawn.spawnCreep(body, `miner_${Game.time}`, {
    memory: { role: 'miner', room: room.name, working: false }
  });
  
  if (result === OK) {
    const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    console.log(`🌾 Spawning miner (${body.length} parts, ${cost}E)`);
  }
}

/**
 * Spawns a hauler creep with specified or optimal body.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param bodyOrEnergy - Either body array or energy number for auto-design
 */
function spawnHauler(spawn: StructureSpawn, room: Room, bodyOrEnergy: BodyPartConstant[] | number): void {
  const body = Array.isArray(bodyOrEnergy) ? bodyOrEnergy : getBody(bodyOrEnergy);
  const result = spawn.spawnCreep(body, `hauler_${Game.time}`, {
    memory: { role: 'hauler', room: room.name, working: false }
  });
  
  if (result === OK) {
    const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    console.log(`🚚 Spawning hauler (${body.length} parts, ${cost}E)`);
  }
}

/**
 * Spawns a builder creep with specified or optimal body.
 * 
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param bodyOrEnergy - Either body array or energy number for auto-design
 */
function spawnBuilder(spawn: StructureSpawn, room: Room, bodyOrEnergy: BodyPartConstant[] | number): void {
  const body = Array.isArray(bodyOrEnergy) ? bodyOrEnergy : getBody(bodyOrEnergy);
  const result = spawn.spawnCreep(body, `builder_${Game.time}`, {
    memory: { role: 'builder', room: room.name, working: false }
  });
  
  if (result === OK) {
    const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    console.log(`🔨 Spawning builder (${body.length} parts, ${cost}E)`);
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
