/**
 * Spawn Request System
 * Generates spawn requests based on actual room conditions
 * Uses RCL configs for body parts and behaviors
 * Calculates counts dynamically based on room state
 */

import { RCLConfig } from "../configs/RCL1Config";
import { RoomStateManager } from "./RoomStateManager";

export interface SpawnRequest {
  role: string;
  priority: number; // Lower = higher priority
  reason: string; // Why this spawn is needed
  body: BodyPartConstant[];
  minEnergy?: number; // Minimum energy needed to spawn
  maxCount?: number; // Maximum number of this role
}

export class SpawnRequestGenerator {
  /**
   * Generate all spawn requests for a room
   */
  public static generateRequests(room: Room): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const config = RoomStateManager.getConfigForRoom(room);

    // Null check - if no config available, return empty requests
    if (!config) {
      console.log(`[SpawnRequestGenerator] No config found for room ${room.name}`);
      return requests;
    }

    // Always generate harvester requests first
    requests.push(...this.requestHarvesters(room, config));

    // Only request other roles if we have minimum harvesters
    const harvesterCount = this.getCreepCount(room, "harvester");
    const minHarvesters = this.getMinimumHarvesters(room);

    if (harvesterCount >= minHarvesters) {
      requests.push(...this.requestUpgraders(room, config));

      // Only request builders if enabled in config
      if (config.spawning.enableBuilders) {
        requests.push(...this.requestBuilders(room, config));
      }
    }

    return requests;
  }

  /**
   * Request harvesters based on source capacity
   * Uses RCL config for body composition
   */
  private static requestHarvesters(room: Room, config: RCLConfig): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const sources = room.find(FIND_SOURCES);
    const harvesterCount = this.getCreepCount(room, "harvester");

    // Calculate ideal harvester count: 1 harvester per source + 1 spare
    const idealCount = sources.length + 1;
    const currentCount = harvesterCount;

    if (currentCount < idealCount) {
      const harvesterConfig = config.roles.harvester;

      requests.push({
        role: "harvester",
        priority: harvesterConfig.priority,
        reason: `Source coverage: ${currentCount}/${idealCount} harvesters`,
        body: harvesterConfig.body, // Use body from config
        minEnergy: this.calculateBodyCost(harvesterConfig.body),
        maxCount: idealCount
      });
    }

    return requests;
  }

  /**
   * Request upgraders based on available energy and controller needs
   * Uses RCL config for body composition
   */
  private static requestUpgraders(room: Room, config: RCLConfig): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const upgraderCount = this.getCreepCount(room, "upgrader");
    const harvesterCount = this.getCreepCount(room, "harvester");

    // Don't spawn upgraders if we don't have enough harvesters
    const minHarvesters = this.getMinimumHarvesters(room);
    if (harvesterCount < minHarvesters) {
      return requests;
    }

    // Calculate ideal upgraders based on RCL and energy capacity
    const rcl = room.controller?.level || 1;
    let idealCount = 0;

    if (rcl === 1) {
      // RCL 1: Just enough to keep upgrading (2 upgraders)
      idealCount = 2;
    } else if (rcl === 2) {
      // RCL 2: More upgraders to push to RCL 3 (3 upgraders)
      idealCount = 3;
    } else if (rcl >= 3) {
      // RCL 3+: Scale based on available extensions
      idealCount = Math.min(5, Math.floor(room.energyCapacityAvailable / 200));
    }

    if (upgraderCount < idealCount) {
      const upgraderConfig = config.roles.upgrader;

      requests.push({
        role: "upgrader",
        priority: upgraderConfig.priority,
        reason: `Controller upgrading: ${upgraderCount}/${idealCount} upgraders`,
        body: upgraderConfig.body, // Use body from config
        minEnergy: this.calculateBodyCost(upgraderConfig.body),
        maxCount: idealCount
      });
    }

    return requests;
  }

  /**
   * Request builders only when construction sites exist
   * Uses RCL config for body composition
   */
  private static requestBuilders(room: Room, config: RCLConfig): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const builderCount = this.getCreepCount(room, "builder");
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);

    // No construction sites = no builders needed
    if (constructionSites.length === 0) {
      return requests;
    }

    // Calculate builders needed based on construction volume
    const progressNeeded = constructionSites.reduce((sum, site) => {
      return sum + (site.progressTotal - site.progress);
    }, 0);

    // 1 builder per 10,000 progress needed, min 1, max 3
    const idealCount = Math.min(3, Math.max(1, Math.ceil(progressNeeded / 10000)));

    if (builderCount < idealCount) {
      const builderConfig = config.roles.builder;

      requests.push({
        role: "builder",
        priority: builderConfig.priority,
        reason: `Construction: ${constructionSites.length} sites, ${progressNeeded} progress needed`,
        body: builderConfig.body, // Use body from config
        minEnergy: this.calculateBodyCost(builderConfig.body),
        maxCount: idealCount
      });
    }

    return requests;
  }

  /**
   * Calculate the energy cost of a body
   */
  private static calculateBodyCost(body: BodyPartConstant[]): number {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  }

  /**
   * Get minimum harvesters needed for room stability
   */
  private static getMinimumHarvesters(room: Room): number {
    const sources = room.find(FIND_SOURCES);
    // Minimum: 1 harvester per source
    return sources.length;
  }

  /**
   * Count creeps by role in a room
   */
  private static getCreepCount(room: Room, role: string): number {
    return room.find(FIND_MY_CREEPS, {
      filter: (c) => c.memory.role === role
    }).length;
  }
}
