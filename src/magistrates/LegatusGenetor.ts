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

    // Check if we need more creeps
    const creepCount = Object.keys(Game.creeps).filter(name => 
      Game.creeps[name].memory.room === this.roomName
    ).length;

    // Early game: maintain minimum population
    const minCreeps = 6;
    const maxCreeps = 15;

    if (creepCount >= maxCreeps) return;

    // DON'T SPAWN if there are no available tasks (workers would just idle)
    // Check if there are ANY tasks that have open slots
    const availableTasks = tasks.filter(task => {
      const openSlots = task.creepsNeeded - task.assignedCreeps.length;
      return openSlots > 0;
    });

    if (availableTasks.length === 0 && creepCount >= minCreeps) {
      // No tasks available and we have minimum population - don't spawn
      // Let existing creeps renew instead
      return;
    }

    // Determine what type of creep to spawn based on room needs
    const energy = room.energyAvailable;
    
    // Only spawn if we have enough energy (don't spawn weak creeps)
    const minEnergyToSpawn = creepCount < minCreeps ? 200 : 300;
    if (energy < minEnergyToSpawn) return;

    // Decide body type based on current population and needs
    const creepType = this.determineNeededCreepType(room, tasks);
    const body = this.designCreepBody(creepType, energy);
    
    if (body.length === 0) return;

    const cost = this.calculateBodyCost(body);
    const role = creepType; // 'worker', 'hauler', 'defender', etc.

    const request: CreepRequest = {
      priority: creepCount < minCreeps ? 100 : 50, // Emergency priority if below min
      body: body,
      memory: {
        role: role,
        room: this.roomName
      },
      initialTask: undefined, // Workers are not spawned for specific tasks
      cost: cost,
      role: role
    };

    this.spawnCreep(spawns[0], request);
  }

  /**
   * Determine what type of creep the room needs most
   */
  private determineNeededCreepType(room: Room, _tasks: Task[]): string {
    const creeps = Object.values(Game.creeps).filter(c => c.memory.room === this.roomName);
    
    // Count creeps by capability
    const workCreeps = creeps.filter(c => c.getActiveBodyparts(WORK) > 0).length;
    const carryCreeps = creeps.filter(c => c.getActiveBodyparts(CARRY) > 0).length;
    const attackCreeps = creeps.filter(c => c.getActiveBodyparts(ATTACK) > 0).length;

    // Check for defense needs
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    if (hostiles.length > 0 && attackCreeps < 2) {
      return 'defender';
    }

    // Early game: need workers who can do everything
    if (workCreeps < 4) {
      return 'worker'; // WORK + CARRY + MOVE - can harvest, build, upgrade, transfer
    }

    // Mid game: specialized haulers for efficiency
    if (carryCreeps < workCreeps * 0.5) {
      return 'hauler'; // Mostly CARRY + MOVE - fast energy transport
    }

    // Default: balanced worker
    return 'worker';
  }

  /**
   * Design a creep body based on type and available energy
   */
  private designCreepBody(type: string, energy: number): BodyPartConstant[] {
    switch (type) {
      case 'worker':
        return this.designWorker(energy);
      case 'hauler':
        return this.designHauler(energy);
      case 'defender':
        return this.designDefender(energy);
      default:
        return this.designWorker(energy);
    }
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
   * Design a specialized hauler: Mostly CARRY + MOVE
   * Fast energy transport
   */
  private designHauler(energy: number): BodyPartConstant[] {
    // Hauler: Maximize CARRY with MOVE for speed
    const parts: BodyPartConstant[] = [];
    
    // At least 1 WORK for emergency harvesting
    if (energy >= 150) {
      parts.push(WORK);
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 150;
    }
    
    // Rest is CARRY + MOVE
    while (energy >= 100) {
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 100;
    }

    return parts.length > 0 ? parts : [CARRY, MOVE];
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

  private spawnCreep(spawn: StructureSpawn, request: CreepRequest): void {
    const name = `${request.role}_${Game.time}`;
    const result = spawn.spawnCreep(request.body, name, { memory: request.memory });

    if (result === OK) {
      console.log(`🏛️ Spawning ${request.role}: ${name} (${request.cost} energy)`);
    } else if (result === ERR_NOT_ENOUGH_ENERGY) {
      // This is fine - we'll try again next tick
    } else {
      console.log(`⚠️ Failed to spawn ${request.role}: ${result}`);
    }
  }
}
