/**
 * Spawn Request System
 * Generates spawn requests based on actual room conditions
 * Uses RCL configs for body parts and behaviors
 * Calculates counts dynamically based on room state
 */

import { RCLConfig } from "../configs/RCL1Config";
import { RoomStateManager } from "./RoomStateManager";
import { ProgressionManager } from "./ProgressionManager";

export interface SpawnRequest {
  role: string;
  priority: number; // Lower = higher priority
  reason: string; // Why this spawn is needed (includes current/target counts)
  body: BodyPartConstant[];
  minEnergy?: number; // Minimum energy needed to spawn
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

    // Get progression state for RCL 2+
    const progressionState = RoomStateManager.getProgressionState(room.name);

    // Always generate harvester requests first
    requests.push(...this.requestHarvesters(room, config, progressionState));

    // CRITICAL: Always maintain 1 fallback upgrader to prevent downgrade
    // Minimal body with WORK to actually upgrade controller
    const upgraderCount = this.getCreepCount(room, "upgrader");
    if (upgraderCount === 0) {
      requests.push({
        role: "upgrader",
        priority: 0, // HIGHEST PRIORITY - prevent downgrade!
        reason: `FALLBACK: No upgraders! Controller downgrade imminent`,
        body: [WORK, CARRY, MOVE], // Minimal upgrader: can harvest, carry, and upgrade
        minEnergy: 200 // Cheap to spawn
      });
    }

    // Only request other roles if we have minimum harvesters
    const harvesterCount = this.getCreepCount(room, "harvester");
    const minHarvesters = this.getMinimumHarvesters(room);

    if (harvesterCount >= minHarvesters) {
      // NO UPGRADERS during Phase 1-3 (prevent source traffic congestion)
      // Only spawn upgraders when infrastructure is complete
      const allowUpgraders = !progressionState ||
                            progressionState.phase === "complete" ||
                            room.controller?.level === 1; // RCL1 always gets upgraders

      if (allowUpgraders) {
        requests.push(...this.requestUpgraders(room, config));
      }

      // Only request builders if enabled in config
      if (config.spawning.enableBuilders) {
        requests.push(...this.requestBuilders(room, config));
      }

      // Request haulers if progression state indicates they're needed
      if (progressionState?.useHaulers) {
        requests.push(...this.requestHaulers(room, config));
      }
    }

    return requests;
  }

  /**
   * Request harvesters based on source capacity
   * Uses RCL config for body composition
   * Adapts to progression state (stationary vs mobile harvesters)
   */
  private static requestHarvesters(room: Room, config: RCLConfig, progressionState: any): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const sources = room.find(FIND_SOURCES);
    const harvesterCount = this.getCreepCount(room, "harvester");

    // CRITICAL: If only 1 harvester left, request emergency backup immediately
    if (harvesterCount === 1) {
      const body = this.buildScaledBody(room, "harvester");
      requests.push({
        role: "harvester",
        priority: 0, // HIGHEST PRIORITY - single point of failure!
        reason: `EMERGENCY: Only 1 harvester remaining! (${room.energyCapacityAvailable} energy)`,
        body: body,
        minEnergy: this.calculateBodyCost(body)
      });
    }

    // Determine if we need stationary harvesters
    const useStationaryHarvesters = progressionState?.useStationaryHarvesters || false;

    if (useStationaryHarvesters) {
      // Phase 2+: One stationary harvester per source
      const idealCount = sources.length;

      if (harvesterCount < idealCount) {
        // Stationary harvester: [WORK×5, MOVE] = 550 energy
        // Note: buildStationaryHarvesterBody() has scaling logic for future RCL3+,
        // but during RCL2 phased progression we use fixed bodies from config
        const stationaryBody = [WORK, WORK, WORK, WORK, WORK, MOVE];

        requests.push({
          role: "harvester",
          priority: 1,
          reason: `Stationary harvesters: ${harvesterCount}/${idealCount}`,
          body: stationaryBody,
          minEnergy: 550
        });
      }
    } else {
      // Phase 1: Mobile harvesters (1 per source + 1 spare)
      // Scale body based on available energy capacity
      const idealCount = sources.length + 1;

      if (harvesterCount < idealCount) {
        const body = this.buildScaledBody(room, "harvester");

        requests.push({
          role: "harvester",
          priority: config.roles.harvester.priority,
          reason: `Mobile harvesters: ${harvesterCount}/${idealCount} (${room.energyCapacityAvailable} energy)`,
          body: body,
          minEnergy: this.calculateBodyCost(body)
        });
      }
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
      const body = this.buildScaledBody(room, "upgrader");

      requests.push({
        role: "upgrader",
        priority: config.roles.upgrader.priority,
        reason: `Controller upgrading: ${upgraderCount}/${idealCount} upgraders (${room.energyCapacityAvailable} energy)`,
        body: body,
        minEnergy: this.calculateBodyCost(body)
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
      const body = this.buildScaledBody(room, "builder");

      requests.push({
        role: "builder",
        priority: config.roles.builder.priority,
        reason: `Construction: ${constructionSites.length} sites, ${progressNeeded} progress needed (${room.energyCapacityAvailable} energy)`,
        body: body,
        minEnergy: this.calculateBodyCost(body)
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
   * Build a dynamically scaled body based on available energy
   * Scales up as extensions are completed during Phase 1
   */
  private static buildScaledBody(room: Room, role: string): BodyPartConstant[] {
    const energy = room.energyCapacityAvailable;
    const body: BodyPartConstant[] = [];

    if (role === "harvester") {
      // Harvester: Prioritize WORK parts, then balance CARRY and MOVE
      // Pattern: [WORK×N, CARRY, MOVE×N]
      // 300 energy: [WORK, CARRY, MOVE] = 200
      // 350 energy: [WORK, WORK, CARRY, MOVE] = 300
      // 400 energy: [WORK, WORK, CARRY, MOVE, MOVE] = 350
      // 550 energy: [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE] = 500

      const pattern = [WORK, CARRY, MOVE]; // 200 energy base
      const sets = Math.floor(energy / 200);

      for (let i = 0; i < sets && body.length < 50; i++) {
        body.push(...pattern);
      }

      // Use remaining energy for extra WORK parts (most important)
      let remaining = energy - this.calculateBodyCost(body);
      while (remaining >= 100 && body.length < 50) {
        body.push(WORK);
        remaining -= 100;
      }

      // Add MOVE parts to match WORK parts for mobility
      const workParts = body.filter(p => p === WORK).length;
      const moveParts = body.filter(p => p === MOVE).length;
      while (moveParts < workParts && remaining >= 50 && body.length < 50) {
        body.push(MOVE);
        remaining -= 50;
      }

    } else if (role === "upgrader" || role === "builder") {
      // Upgrader/Builder: Balanced WORK, CARRY, MOVE
      // Pattern: [WORK, CARRY, MOVE] = 200 energy per set
      const pattern = [WORK, CARRY, MOVE];
      const sets = Math.floor(energy / 200);

      for (let i = 0; i < sets && body.length < 50; i++) {
        body.push(...pattern);
      }
    }

    // Fallback: Minimum viable body
    return body.length > 0 ? body : [WORK, CARRY, MOVE];
  }

  /**
   * Build stationary harvester body: [WORK×5, MOVE]
   * Designed to sit on container and mine continuously
   */
  private static buildStationaryHarvesterBody(room: Room): BodyPartConstant[] {
    const energy = room.energyCapacityAvailable;

    // Ideal: [WORK×5, MOVE] = 550 energy (5 work parts mine full source capacity)
    if (energy >= 550) {
      return [WORK, WORK, WORK, WORK, WORK, MOVE];
    }

    // Fallback: Scale down based on available energy
    const workParts = Math.min(5, Math.floor((energy - 50) / 100)); // Reserve 50 for MOVE
    const body: BodyPartConstant[] = [];

    for (let i = 0; i < workParts; i++) {
      body.push(WORK);
    }
    body.push(MOVE);

    return body.length > 0 ? body : [WORK, MOVE]; // Minimum viable
  }

  /**
   * Build hauler body: [CARRY×N, MOVE×N]
   * Designed to transport energy quickly
   */
  private static buildHaulerBody(room: Room): BodyPartConstant[] {
    const energy = room.energyCapacityAvailable;

    // Build balanced CARRY/MOVE pairs (50 + 50 = 100 per pair)
    const pairs = Math.floor(energy / 100);
    const maxPairs = Math.min(pairs, 6); // Cap at 6 pairs (600 energy)

    const body: BodyPartConstant[] = [];
    for (let i = 0; i < maxPairs; i++) {
      body.push(CARRY, MOVE);
    }

    return body.length > 0 ? body : [CARRY, MOVE]; // Minimum viable
  }

  /**
   * Request haulers based on progression state
   * Haulers transport energy from containers to spawn/extensions
   */
  private static requestHaulers(room: Room, config: RCLConfig): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const haulerCount = this.getCreepCount(room, "hauler");
    const sources = room.find(FIND_SOURCES);

    // Ideal: 1 hauler per source container
    const idealCount = sources.length;

    if (haulerCount < idealCount) {
      const body = this.buildHaulerBody(room);

      requests.push({
        role: "hauler",
        priority: 1, // High priority - critical for logistics
        reason: `Hauler logistics: ${haulerCount}/${idealCount} haulers`,
        body: body,
        minEnergy: this.calculateBodyCost(body)
      });
    }

    return requests;
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
