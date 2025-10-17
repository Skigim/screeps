import { Task, CreepRequest } from '../interfaces';

/**
 * Legatus Genetor - The Broodmother
 * 
 * Responsibility: Maintain optimal creep population with intelligent body designs
 * Philosophy: Spawn versatile workers, let tasks find them
 * 
 * The Broodmother analyzes room needs and spawns creeps with appropriate
 * body configurations. Creeps are assigned tasks based on their capabilities.
 */
export class LegatusGenetor {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze room population and spawn creeps as needed
   */
  public run(tasks: Task[]): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    // Find available spawns
    const spawns = room.find(FIND_MY_SPAWNS, {
      filter: (s) => !s.spawning
    });

    if (spawns.length === 0) return;

    // Get current creep census by role
    const creeps = Object.values(Game.creeps).filter(c => c.memory.room === this.roomName);
    const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
    const haulerCount = creeps.filter(c => c.memory.role === 'hauler').length;
    const defenderCount = creeps.filter(c => c.memory.role === 'defender').length;
    
    const totalCreeps = creeps.length;
    const minCreeps = 6;
    const maxCreeps = 15;

    if (totalCreeps >= maxCreeps) return;

    const energy = room.energyAvailable;
    const minEnergyToSpawn = totalCreeps < minCreeps ? 200 : 300;
    if (energy < minEnergyToSpawn) return;

    // PRIORITY SPAWN ORDER:
    // 1. Defenders (if hostiles present)
    // 2. Harvesters (1 per source, target 5 WORK parts) - ALWAYS SPAWN IF NEEDED
    // 3. Haulers (2-3 for logistics) - ALWAYS SPAWN IF NEEDED
    // 4. Workers (versatile, fill remaining slots) - ONLY if tasks available

    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    if (hostiles.length > 0 && defenderCount < 2) {
      this.spawnCreepByType('defender', spawns[0], energy, totalCreeps < minCreeps);
      return;
    }

    // Count sources in room
    const sources = room.find(FIND_SOURCES);
    const targetHarvesters = sources.length; // 1 dedicated harvester per source

    // ALWAYS spawn harvesters if below target - they're critical infrastructure
    if (harvesterCount < targetHarvesters) {
      this.spawnCreepByType('harvester', spawns[0], energy, totalCreeps < minCreeps);
      return;
    }

    // Target 2-3 haulers for efficient logistics
    const targetHaulers = Math.min(3, sources.length * 2);
    
    // ALWAYS spawn haulers if below target - they enable energy flow
    if (haulerCount < targetHaulers) {
      this.spawnCreepByType('hauler', spawns[0], energy, totalCreeps < minCreeps);
      return;
    }

    // Only spawn workers if there are tasks available (they're versatile backup)
    const availableTasks = tasks.filter(task => {
      const openSlots = task.creepsNeeded - task.assignedCreeps.length;
      return openSlots > 0;
    });

    if (availableTasks.length === 0 && totalCreeps >= minCreeps) {
      return; // No tasks available for workers, don't spawn more
    }

    // Fill remaining slots with versatile workers
    this.spawnCreepByType('worker', spawns[0], energy, totalCreeps < minCreeps);
  }

  /**
   * Spawn a specific creep type with appropriate body design
   */
  private spawnCreepByType(type: string, spawn: StructureSpawn, energy: number, isEmergency: boolean): void {
    const body = this.designCreepBody(type, energy);
    if (body.length === 0) return;

    const cost = this.calculateBodyCost(body);
    const name = `${type}_${Game.time}`;

    const request: CreepRequest = {
      priority: isEmergency ? 100 : 50,
      body: body,
      memory: {
        role: type,
        room: this.roomName
      },
      initialTask: undefined,
      cost: cost,
      role: type
    };

    const result = spawn.spawnCreep(request.body, name, { memory: request.memory });

    if (result === OK) {
      console.log(`🏛️ Spawning ${type}: ${name} (${cost} energy, ${body.length} parts)`);
    } else if (result !== ERR_NOT_ENOUGH_ENERGY) {
      console.log(`⚠️ Failed to spawn ${type}: ${result}`);
    }
  }

  /**
   * Design a creep body based on type and available energy
   */
  private designCreepBody(type: string, energy: number): BodyPartConstant[] {
    switch (type) {
      case 'harvester':
        return this.designHarvester(energy);
      case 'hauler':
        return this.designHauler(energy);
      case 'worker':
        return this.designWorker(energy);
      case 'defender':
        return this.designDefender(energy);
      default:
        return this.designWorker(energy);
    }
  }

  /**
   * Design a dedicated harvester: Target 5 WORK parts, 1 MOVE, NO CARRY
   * These creeps ONLY harvest and drop energy, haulers pick it up
   */
  private designHarvester(energy: number): BodyPartConstant[] {
    const parts: BodyPartConstant[] = [];
    
    // Target: 5 WORK parts for maximum harvest efficiency (10 energy/tick)
    // Formula: [WORK, WORK, WORK, WORK, WORK, MOVE]
    // Cost: 550 energy (ideal)
    
    // Scale down if low energy:
    // 550+ = 5 WORK (ideal) - [W,W,W,W,W,M] = 550
    // 450-549 = 4 WORK - [W,W,W,W,M] = 450
    // 350-449 = 3 WORK - [W,W,W,M] = 350
    // 250-349 = 2 WORK - [W,W,M] = 250
    // 150-249 = 1 WORK - [W,M] = 150 (emergency)
    
    let workParts = 1;
    if (energy >= 550) workParts = 5;
    else if (energy >= 450) workParts = 4;
    else if (energy >= 350) workParts = 3;
    else if (energy >= 250) workParts = 2;
    
    // Add WORK parts
    for (let i = 0; i < workParts; i++) {
      parts.push(WORK);
    }
    
    // Add 1 MOVE part (just enough to reach the source)
    parts.push(MOVE);
    
    return parts;
  }

  /**
   * Design a general-purpose worker: WORK + CARRY + MOVE
   * Can harvest, build, upgrade, repair, and transfer
   */
  private designWorker(energy: number): BodyPartConstant[] {
    // Worker: Balanced WORK, CARRY, MOVE (versatile, can do anything)
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 200) {
      parts.push(WORK);   // 100
      parts.push(CARRY);  // 50
      parts.push(MOVE);   // 50 = 200 total
      energy -= 200;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  /**
   * Design a specialized hauler: Maximize CARRY, no WORK parts
   * Pure logistics - pickup, transfer, refill only
   */
  private designHauler(energy: number): BodyPartConstant[] {
    const parts: BodyPartConstant[] = [];
    
    // NO WORK PARTS - haulers are pure logistics
    // Formula: [CARRY, CARRY, MOVE, MOVE] repeating
    // Each pair costs 100 energy and gives 100 capacity
    
    while (energy >= 100 && parts.length < 16) { // Cap at 16 parts (8 CARRY + 8 MOVE)
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 100;
    }
    
    // Minimum: 2 CARRY + 2 MOVE
    if (parts.length === 0) {
      parts.push(CARRY, MOVE);
    }
    
    return parts;
  }

  private designDefender(energy: number): BodyPartConstant[] {
    // Defender: ATTACK, MOVE, some TOUGH
    const parts: BodyPartConstant[] = [];
    
    // Add tough armor first
    if (energy >= 10) {
      parts.push(TOUGH);
      energy -= 10;
    }

    // Add attack and move
    while (energy >= 130) {
      parts.push(ATTACK);
      parts.push(MOVE);
      energy -= 130;
    }

    return parts.length > 0 ? parts : [ATTACK, MOVE];
  }

  private calculateBodyCost(body: BodyPartConstant[]): number {
    const costs: { [key: string]: number } = {
      [MOVE]: 50,
      [WORK]: 100,
      [CARRY]: 50,
      [ATTACK]: 80,
      [RANGED_ATTACK]: 150,
      [HEAL]: 250,
      [TOUGH]: 10,
      [CLAIM]: 600
    };

    return body.reduce((sum, part) => sum + (costs[part] || 0), 0);
  }
}
