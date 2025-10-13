import type { SpawnRequest } from "./SpawnRequestGenerator";
import { SpawnRequestGenerator } from "./SpawnRequestGenerator";

/**
 * Spawn Manager - Demand-Based Spawning
 * Evaluates spawn requests and spawns creeps based on actual room needs
 */
export class SpawnManager {
  /**
   * Main spawn logic - evaluates requests and spawns
   */
  public static run(spawn: StructureSpawn): void {
    // Don't spawn if already spawning
    if (spawn.spawning) {
      this.displaySpawningStatus(spawn);
      return;
    }

    const room = spawn.room;

    // Generate spawn requests based on room conditions
    const requests = SpawnRequestGenerator.generateRequests(room);

    // Display status periodically
    if (Game.time % 10 === 0) {
      this.displayStatus(room, requests);
    }

    // Process requests by priority
    this.processRequests(spawn, requests);
  }

  /**
   * Process spawn requests in priority order
   */
  private static processRequests(spawn: StructureSpawn, requests: SpawnRequest[]): void {
    if (requests.length === 0) {
      return; // No requests
    }

    // Sort by priority (lower number = higher priority)
    const sortedRequests = requests.sort((a, b) => a.priority - b.priority);

    // Emergency: If no creeps alive, spawn first request immediately
    const totalCreeps = Object.keys(Game.creeps).filter(
      name => Game.creeps[name].room.name === spawn.room.name
    ).length;

    if (totalCreeps === 0) {
      console.log("⚠️ CRITICAL: No creeps alive! Spawning emergency creep");
      const firstRequest = sortedRequests[0];
      this.spawnFromRequest(spawn, firstRequest);
      return;
    }

    // Process first viable request
    for (const request of sortedRequests) {
      // Check if we can afford this spawn
      const bodyCost = this.calculateBodyCost(request.body);
      const minEnergy = request.minEnergy || bodyCost;

      if (spawn.room.energyAvailable >= minEnergy) {
        const result = this.spawnFromRequest(spawn, request);

        if (result === OK) {
          return; // Successfully spawned
        } else if (result !== ERR_NOT_ENOUGH_ENERGY) {
          console.log(`❌ Spawn failed for ${request.role}: ${this.getErrorName(result)}`);
        }
      }
    }
  }

  /**
   * Spawn a creep from a request
   */
  private static spawnFromRequest(spawn: StructureSpawn, request: SpawnRequest): ScreepsReturnCode {
    const name = `${request.role.charAt(0).toUpperCase() + request.role.slice(1)}_${Game.time}`;

    const result = spawn.spawnCreep(request.body, name, {
      memory: {
        role: request.role,
        room: spawn.room.name,
        working: false
      }
    });

    if (result === OK) {
      console.log(`✅ Spawning ${request.role}: ${name} (${request.reason})`);
    }

    return result;
  }

  /**
   * Display spawning status
   */
  private static displaySpawningStatus(spawn: StructureSpawn): void {
    if (!spawn.spawning) return;

    const spawningCreep = Game.creeps[spawn.spawning.name];
    spawn.room.visual.text(
      `🛠️ ${spawningCreep.memory.role}`,
      spawn.pos.x + 1,
      spawn.pos.y,
      { align: "left", opacity: 0.8 }
    );
  }

  /**
   * Display room status with active requests
   */
  private static displayStatus(room: Room, requests: SpawnRequest[]): void {
    const creeps = room.find(FIND_MY_CREEPS);
    const creepCounts: { [role: string]: number } = {};

    for (const creep of creeps) {
      const role = creep.memory.role;
      creepCounts[role] = (creepCounts[role] || 0) + 1;
    }

    console.log(`\n=== Room Status (${room.name}) ===`);
    console.log(`RCL: ${room.controller?.level || 0} | Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);
    console.log(`Controller: ${room.controller?.progress}/${room.controller?.progressTotal}`);

    // Show creep counts
    console.log(`\nCreeps:`);
    const allRoles = new Set([...Object.keys(creepCounts), ...requests.map(r => r.role)]);
    for (const role of allRoles) {
      const count = creepCounts[role] || 0;
      const request = requests.find(r => r.role === role);
      const max = request?.maxCount || '?';
      console.log(`  ${role}: ${count}/${max}`);
    }

    // Show active requests
    if (requests.length > 0) {
      console.log(`\nSpawn Requests (${requests.length}):`);
      const sorted = requests.sort((a, b) => a.priority - b.priority);
      for (const req of sorted.slice(0, 3)) { // Show top 3
        console.log(`  [P${req.priority}] ${req.role}: ${req.reason}`);
      }
    }
  }

  /**
   * Calculate body cost
   */
  private static calculateBodyCost(body: BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
  }

  /**
   * Get error name from code
   */
  private static getErrorName(code: ScreepsReturnCode): string {
    const errors: { [key: number]: string } = {
      [ERR_NOT_OWNER]: "ERR_NOT_OWNER",
      [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS",
      [ERR_BUSY]: "ERR_BUSY",
      [ERR_NOT_ENOUGH_ENERGY]: "ERR_NOT_ENOUGH_ENERGY",
      [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS",
      [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH"
    };
    return errors[code] || `Error code: ${code}`;
  }
}
