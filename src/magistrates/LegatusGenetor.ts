import { Task, CreepRequest, TaskType } from '../interfaces';

/**
 * Legatus Genetor - The Broodmother
 * 
 * Responsibility: Design and spawn creeps optimized for tasks
 * Philosophy: The right tool for the right job
 * 
 * The Broodmother looks at the task queue and determines if a new creep
 * is needed. If so, it designs the perfect body for that task.
 */
export class LegatusGenetor {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze tasks and spawn creeps as needed
   */
  public run(tasks: Task[]): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    // Find available spawns
    const spawns = room.find(FIND_MY_SPAWNS, {
      filter: (s) => !s.spawning
    });

    if (spawns.length === 0) return;

    // Find highest priority task that needs creeps
    const taskNeedingCreeps = tasks.find(t => 
      t.assignedCreeps.length < t.creepsNeeded
    );

    if (!taskNeedingCreeps) return;

    // Design and spawn a creep for this task
    const request = this.designCreep(taskNeedingCreeps, room);
    if (request) {
      this.spawnCreep(spawns[0], request);
    }
  }

  private designCreep(task: Task, room: Room): CreepRequest | null {
    const energy = room.energyAvailable;
    
    // Design body based on task type
    let body: BodyPartConstant[] = [];
    let role: string = '';

    switch (task.type) {
      case TaskType.HARVEST_ENERGY:
        body = this.designHarvester(energy);
        role = 'harvester';
        break;
      
      case TaskType.HAUL_ENERGY:
      case TaskType.REFILL_TOWER:
      case TaskType.REFILL_SPAWN:
      case TaskType.REFILL_EXTENSION:
        body = this.designHauler(energy);
        role = 'hauler';
        break;
      
      case TaskType.BUILD:
        body = this.designBuilder(energy);
        role = 'builder';
        break;
      
      case TaskType.REPAIR:
        body = this.designRepairer(energy);
        role = 'repairer';
        break;
      
      case TaskType.UPGRADE_CONTROLLER:
        body = this.designUpgrader(energy);
        role = 'upgrader';
        break;
      
      case TaskType.DEFEND_ROOM:
        body = this.designDefender(energy);
        role = 'defender';
        break;
      
      default:
        body = this.designWorker(energy);
        role = 'worker';
    }

    if (body.length === 0) return null;

    const cost = this.calculateBodyCost(body);

    return {
      priority: task.priority,
      body: body,
      memory: {
        role: role,
        room: this.roomName,
        task: task.id,
        targetId: task.targetId?.toString()
      },
      initialTask: task,
      cost: cost,
      role: role
    };
  }

  private designHarvester(energy: number): BodyPartConstant[] {
    // Optimal harvester: 1 WORK, 1 CARRY, 2 MOVE for roads
    // Max 5 WORK parts (source energy/tick limit)
    const parts: BodyPartConstant[] = [];
    const maxWork = 5;
    let workParts = 0;

    while (energy >= 250 && workParts < maxWork) {
      parts.push(WORK);   // 100
      parts.push(CARRY);  // 50
      parts.push(MOVE);   // 50
      parts.push(MOVE);   // 50 = 250 total, 1:1 ratio on roads
      workParts++;
      energy -= 250;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private designHauler(energy: number): BodyPartConstant[] {
    // Hauler: Maximize CARRY with MOVE for speed
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 100) {
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 100;
    }

    return parts.length > 0 ? parts : [CARRY, MOVE];
  }

  private designBuilder(energy: number): BodyPartConstant[] {
    // Builder: 1 WORK, 1 CARRY, 2 MOVE (1:1 ratio on roads)
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 250) {
      parts.push(WORK);   // 100
      parts.push(CARRY);  // 50
      parts.push(MOVE);   // 50
      parts.push(MOVE);   // 50 = 250 total
      energy -= 250;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private designRepairer(energy: number): BodyPartConstant[] {
    // Same as builder
    return this.designBuilder(energy);
  }

  private designUpgrader(energy: number): BodyPartConstant[] {
    // Upgrader: 2 WORK, 1 CARRY, 2 MOVE (balanced for efficiency and speed)
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 350) {
      parts.push(WORK);   // 100
      parts.push(WORK);   // 100
      parts.push(CARRY);  // 50
      parts.push(MOVE);   // 50
      parts.push(MOVE);   // 50 = 350 total, 3 parts : 2 MOVE
      energy -= 350;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
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

  private designWorker(energy: number): BodyPartConstant[] {
    // Generic worker: balanced parts
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 200) {
      parts.push(WORK);
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 200;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
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
