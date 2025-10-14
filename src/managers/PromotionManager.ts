import type { RoomStateManager } from "./RoomStateManager";
import type { RCLConfig } from "configs/RCL1Config";
import type { MethodsIndex } from "../core/MethodsIndex";

/**
 * PromotionManager - Upgrades creeps to better bodies as economy improves
 *
 * Strategy:
 * - Track creep body costs in memory
 * - When storage fills and no spawn requests pending, identify weak creeps
 * - Kill weak creeps and queue upgraded replacements
 * - Ensures smooth transitions without breaking economy
 *
 * Benefits:
 * - Natural progression from weak to strong creeps
 * - No manual intervention needed
 * - Economy-aware (only promotes when stable)
 * - Role-specific promotion strategies
 */

interface PromotionCandidate {
  creep: Creep;
  role: string;
  currentCost: number;
  potentialCost: number;
  upgrade: number; // How much better the new body would be (energy cost difference)
}

export class PromotionManager {
  /**
   * Check if any creeps can be promoted
   * Called from main loop when spawn is idle
   * @param room - The room to check for promotions
   * @param methodsIndex - Service locator for accessing RoomStateManager
   */
  static run(room: Room, methodsIndex: MethodsIndex): void {
    // Only run occasionally (every 50 ticks) to reduce CPU
    if (Game.time % 50 !== 0) return;

    // Get room config via methodsIndex (breaks circular dependency)
    const RoomStateManager = methodsIndex.get<typeof import("./RoomStateManager").RoomStateManager>("RoomStateManager");
    const config = RoomStateManager.getConfigForRoom(room);
    if (!config) return;

    // Check if conditions are right for promotions
    if (!this.canPromote(room)) return;

    // Find best promotion candidate
    const candidate = this.findBestPromotionCandidate(room, config);
    if (!candidate) return;

    // Execute promotion
    this.promoteCreep(candidate, room, config);
  }

  /**
   * Check if room conditions allow promotions
   */
  private static canPromote(room: Room): boolean {
    // Need a spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return false;

    // Spawn must be idle
    const spawn = spawns[0];
    if (spawn.spawning) return false;

    // Must have good energy reserves
    const energy = room.energyAvailable;
    const capacity = room.energyCapacityAvailable;

    // Need at least 75% capacity to consider promotions
    if (energy < capacity * 0.75) return false;

    // Check storage if it exists (RCL 4+)
    const storage = room.storage;
    if (storage) {
      // Storage should have at least 50k energy for safe promotions
      if (storage.store[RESOURCE_ENERGY] < 50000) return false;
    }

    return true;
  }

  /**
   * Find the best creep to promote
   * Prioritizes roles that benefit most from upgrades
   */
  private static findBestPromotionCandidate(room: Room, config: RCLConfig): PromotionCandidate | null {
    const candidates: PromotionCandidate[] = [];
    const availableEnergy = room.energyCapacityAvailable;

    // Check all creeps in room
    const creeps = room.find(FIND_MY_CREEPS);

    for (const creep of creeps) {
      const role = creep.memory.role;
      const roleConfig = (config.roles as any)[role];

      if (!roleConfig) continue;

      // Calculate current body cost
      const currentCost = this.calculateBodyCost(creep.body.map(p => p.type));

      // Skip if creep is already max size for available energy
      if (currentCost >= availableEnergy * 0.9) continue;

      // Calculate potential upgraded body cost
      let potentialBody: BodyPartConstant[] = [];

      if (typeof roleConfig.body === 'function') {
        potentialBody = roleConfig.body(availableEnergy, room);
      } else if (Array.isArray(roleConfig.body)) {
        potentialBody = roleConfig.body;
      }

      const potentialCost = this.calculateBodyCost(potentialBody);

      // Check if upgrade would be significant (at least 20% better)
      if (potentialCost <= currentCost * 1.2) continue;

      // Calculate upgrade value
      const upgrade = potentialCost - currentCost;

      candidates.push({
        creep,
        role,
        currentCost,
        potentialCost,
        upgrade
      });
    }

    if (candidates.length === 0) return null;

    // Prioritize by role importance, then by upgrade amount
    const rolePriority: { [key: string]: number } = {
      harvester: 10, // Highest priority - more harvesting = more income
      hauler: 9,     // High priority - better logistics
      upgrader: 5,   // Medium priority
      builder: 4     // Lower priority - can wait
    };

    candidates.sort((a, b) => {
      const aPriority = rolePriority[a.role] || 0;
      const bPriority = rolePriority[b.role] || 0;

      // First by role priority
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then by upgrade amount
      return b.upgrade - a.upgrade;
    });

    return candidates[0];
  }

  /**
   * Execute a creep promotion
   */
  private static promoteCreep(candidate: PromotionCandidate, room: Room, config: RCLConfig): void {
    const { creep, role, currentCost, potentialCost } = candidate;

    console.log(
      `🎖️ PROMOTION: Upgrading ${creep.name} (${role}) from ${currentCost} to ${potentialCost} energy body (+${potentialCost - currentCost})`
    );

    // Store promotion info in memory for spawn request generator to pick up
    if (!Memory.promotionQueue) {
      Memory.promotionQueue = {};
    }

    if (!Memory.promotionQueue[room.name]) {
      Memory.promotionQueue[room.name] = [];
    }

    // Add to promotion queue
    Memory.promotionQueue[room.name].push({
      role: role,
      replacingCreep: creep.name,
      targetBodyCost: potentialCost,
      timestamp: Game.time
    });

    // Kill the old creep
    creep.suicide();

    console.log(`💀 Killed ${creep.name} for promotion - replacement queued`);
  }

  /**
   * Check if there are pending promotions for a room
   */
  static hasPendingPromotions(room: Room): boolean {
    if (!Memory.promotionQueue) return false;
    const queue = Memory.promotionQueue[room.name];
    return queue && queue.length > 0;
  }

  /**
   * Get the next promotion request for a room
   */
  static getNextPromotion(room: Room): any | null {
    if (!Memory.promotionQueue) return null;
    const queue = Memory.promotionQueue[room.name];
    if (!queue || queue.length === 0) return null;

    return queue[0];
  }

  /**
   * Remove a promotion from the queue after it's been fulfilled
   */
  static completePromotion(room: Room): void {
    if (!Memory.promotionQueue) return;
    const queue = Memory.promotionQueue[room.name];
    if (!queue || queue.length === 0) return;

    queue.shift();

    // Clean up empty queues
    if (queue.length === 0) {
      delete Memory.promotionQueue[room.name];
    }
  }

  /**
   * Clean up old promotion requests (older than 100 ticks)
   */
  static cleanupStalePromotions(): void {
    if (!Memory.promotionQueue) return;

    for (const roomName in Memory.promotionQueue) {
      const queue = Memory.promotionQueue[roomName];

      // Remove stale requests
      Memory.promotionQueue[roomName] = queue.filter(
        (req: PromotionRequest) => Game.time - req.timestamp < 100
      );

      // Clean up empty queues
      if (Memory.promotionQueue[roomName].length === 0) {
        delete Memory.promotionQueue[roomName];
      }
    }
  }

  /**
   * Calculate the energy cost of a body
   */
  private static calculateBodyCost(body: BodyPartConstant[]): number {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  }
}
