/**
 * Spawn Request System
 * Generates spawn requests based on actual room conditions
 * Uses RCL configs for body parts and behaviors
 * Calculates counts dynamically based on room state
 */

import type { RCLConfig } from "configs/RCL1Config";
import { AssignmentManager } from "./AssignmentManager";
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
   * Determine if room should use aggressive scaling (spawn max-size creeps)
   * Conditions:
   * 1. Both sources have full harvester + hauler assignment load
   * 2. All extensions are built (no construction sites for extensions)
   *
   * When these conditions are met, economy is stable enough to spawn largest creeps
   */
  private static shouldUseAggressiveScaling(room: Room): boolean {
    const sources = room.find(FIND_SOURCES);
    const coverage = AssignmentManager.getSourceCoverage(room);

    // Condition 1: Both sources fully assigned
    // Each source needs at least 1 harvester + 1 hauler
    const sourcesFullyAssigned = coverage.uncoveredByHarvesters.length === 0 &&
                                 coverage.uncoveredByHaulers.length === 0;

    // Condition 2: All extensions built (no extension construction sites)
    const extensionSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: site => site.structureType === STRUCTURE_EXTENSION
    });
    const allExtensionsBuilt = extensionSites.length === 0;

    return sourcesFullyAssigned && allExtensionsBuilt;
  }

  /**
   * Get energy capacity to use for body generation
   * Uses energyCapacityAvailable when in aggressive mode, energyAvailable otherwise
   */
  private static getEnergyForBodyGeneration(room: Room): number {
    return this.shouldUseAggressiveScaling(room)
      ? room.energyCapacityAvailable
      : room.energyAvailable;
  }

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
        priority: 1, // High priority, but harvesters are more critical (priority 0)
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
        requests.push(...this.requestUpgraders(room, config, progressionState));
      }

      // Only request builders if enabled in config
      if (config.spawning.enableBuilders) {
        requests.push(...this.requestBuilders(room, config, progressionState));
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

    // Get per-source coverage information
    const coverage = AssignmentManager.getSourceCoverage(room);

    // CRITICAL: If only 1 harvester left, request emergency backup immediately
    if (harvesterCount === 1) {
      // Emergency harvester uses basic [WORK, CARRY, MOVE] body to deliver energy
      // Can't use drop mining body - need to actually deliver to spawn!
      requests.push({
        role: "harvester",
        priority: 0, // HIGHEST PRIORITY - single point of failure!
        reason: `EMERGENCY: Only 1 harvester remaining!`,
        body: [WORK, CARRY, MOVE], // Basic body that can harvest AND deliver
        minEnergy: 200
      });
    }

    // CRITICAL: If any source lacks harvester coverage, prioritize that
    if (coverage.uncoveredByHarvesters.length > 0) {
      const roleConfig = config.roles.harvester;
      let body: BodyPartConstant[];

      if (typeof roleConfig.body === 'function') {
        body = roleConfig.body(this.getEnergyForBodyGeneration(room), room);
      } else {
        body = roleConfig.body;
      }

      const bodyCost = this.calculateBodyCost(body);

      if (body.length > 0) {
        requests.push({
          role: "harvester",
          priority: 0, // HIGHEST PRIORITY - uncovered source is critical!
          reason: `PRIORITY: ${coverage.uncoveredByHarvesters.length} source(s) without harvester (${coverage.sourcesWithHarvesters}/${coverage.totalSources} covered)`,
          body: body,
          minEnergy: bodyCost
        });
      }
    }

    // Determine if we need stationary harvesters
    const useStationaryHarvesters = progressionState?.useStationaryHarvesters || false;

    if (useStationaryHarvesters) {
      // Phase 2+: One stationary harvester per source
      const idealCount = sources.length;

      if (harvesterCount < idealCount) {
        // Get body from config - now dynamic!
        const roleConfig = config.roles.harvester;
        let body: BodyPartConstant[];

        if (typeof roleConfig.body === 'function') {
          // Dynamic body generation - uses aggressive scaling when economy stable
          body = roleConfig.body(this.getEnergyForBodyGeneration(room));
        } else {
          // Static body array
          body = roleConfig.body;
        }

        // Calculate actual body cost
        const bodyCost = this.calculateBodyCost(body);

        // Only create request if body is viable
        if (body.length > 0) {
          requests.push({
            role: "harvester",
            priority: 1,
            reason: `Stationary harvesters: ${harvesterCount}/${idealCount} (need ${bodyCost}, have ${room.energyAvailable}/${room.energyCapacityAvailable})`,
            body: body,
            minEnergy: bodyCost
          });
        }
      }
    } else {
      // Phase 1-2: Mobile harvesters (1 per source + 1 spare)
      // Use RCL2 config body [WORK, WORK, MOVE] for drop mining
      const idealCount = sources.length + 1;

      if (harvesterCount < idealCount) {
        const roleConfig = config.roles.harvester;
        let body: BodyPartConstant[];

        if (typeof roleConfig.body === 'function') {
          // Dynamic body generation - uses aggressive scaling when economy stable
          body = roleConfig.body(this.getEnergyForBodyGeneration(room));
        } else {
          // Static body array
          body = roleConfig.body;
        }

        // Calculate actual body cost
        const bodyCost = this.calculateBodyCost(body);

        // Only create request if body is viable
        if (body.length > 0) {
          requests.push({
            role: "harvester",
            priority: roleConfig.priority,
            reason: `Mobile harvesters: ${harvesterCount}/${idealCount} (need ${bodyCost}, have ${room.energyAvailable})`,
            body: body,
            minEnergy: bodyCost
          });
        }
      }
    }

    return requests;
  }

  /**
   * Request upgraders based on available energy and controller needs
   * Uses RCL config for body composition
   */
  private static requestUpgraders(room: Room, config: RCLConfig, progressionState: any): SpawnRequest[] {
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
      // Get body from config - check if dynamic
      const roleConfig = config.roles.upgrader;
      let body: BodyPartConstant[];

      if (typeof roleConfig.body === 'function') {
        // Dynamic body generation - uses aggressive scaling when economy stable
        body = roleConfig.body(this.getEnergyForBodyGeneration(room));
      } else {
        // Static body array
        body = roleConfig.body;
      }

      // Calculate actual body cost
      const bodyCost = this.calculateBodyCost(body);

      // Only create request if body is viable
      if (body.length > 0) {
        requests.push({
          role: "upgrader",
          priority: roleConfig.priority,
          reason: `Controller upgrading: ${upgraderCount}/${idealCount} (need ${bodyCost}, have ${room.energyAvailable})`,
          body: body,
          minEnergy: bodyCost
        });
      }
    }

    return requests;
  }

  /**
   * Request builders only when construction sites exist
   * Uses RCL config for body composition
   */
  private static requestBuilders(room: Room, config: RCLConfig, progressionState: any): SpawnRequest[] {
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
      // Get body from config - check if dynamic
      const roleConfig = config.roles.builder;
      let body: BodyPartConstant[];

      if (typeof roleConfig.body === 'function') {
        // Dynamic body generation - uses aggressive scaling when economy stable
        body = roleConfig.body(this.getEnergyForBodyGeneration(room));
      } else {
        // Static body array
        body = roleConfig.body;
      }

      // Calculate actual body cost
      const bodyCost = this.calculateBodyCost(body);

      // Only create request if body is viable
      if (body.length > 0) {
        requests.push({
          role: "builder",
          priority: roleConfig.priority,
          reason: `Construction: ${constructionSites.length} sites (need ${bodyCost}, ${progressNeeded} progress)`,
          body: body,
          minEnergy: bodyCost
        });
      }
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
   * Scales up as extensions are completed during Phase 1-2
   */
  private static buildScaledBody(room: Room, role: string): BodyPartConstant[] {
    const energy = room.energyCapacityAvailable;
    const body: BodyPartConstant[] = [];

    if (role === "harvester") {
      // Harvester: [WORK, WORK, MOVE] pattern for drop mining efficiency
      // 300 energy: [WORK, WORK, MOVE] = 250
      // 350 energy: [WORK, WORK, MOVE, WORK] = 350
      // 400 energy: [WORK, WORK, MOVE, WORK, MOVE] = 400
      // 550 energy: [WORK, WORK, MOVE, WORK, WORK, MOVE] = 500

      // Start with base pattern
      const basePattern = [WORK, WORK, MOVE]; // 250 energy
      if (energy >= 250) {
        body.push(...basePattern);
      }

      // Add more WORK+MOVE pairs with remaining energy
      let remaining = energy - this.calculateBodyCost(body);
      while (remaining >= 150 && body.length < 50) {
        body.push(WORK, MOVE);
        remaining -= 150;
      }

      // Use any remaining energy for extra WORK parts
      while (remaining >= 100 && body.length < 50) {
        body.push(WORK);
        remaining -= 100;
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
  }  /**
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
   * SEQUENTIAL ACTIVATION: Only spawn haulers for sources that have BOTH container + harvester
   */
  private static requestHaulers(room: Room, config: RCLConfig): SpawnRequest[] {
    const requests: SpawnRequest[] = [];
    const haulerCount = this.getCreepCount(room, "hauler");
    const sources = room.find(FIND_SOURCES);

    // Get per-source coverage information
    const coverage = AssignmentManager.getSourceCoverage(room);

    // Find containers near each source
    const containers = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    // Check which sources are "ready" for a hauler (have container + harvester)
    const readySources: Source[] = [];
    for (const source of sources) {
      // Check if source has a container
      const nearbyContainer = source.pos.findInRange(containers, 1);
      const hasContainer = nearbyContainer.length > 0;

      // Check if source has a harvester assigned
      const assignments = AssignmentManager.getSourceAssignments(source.id);
      const hasHarvester = assignments.some(c => c.memory.role === "harvester");

      // Source is ready if it has BOTH
      if (hasContainer && hasHarvester) {
        readySources.push(source);
      }
    }

    // Count ready sources that still need haulers
    const readySourcesWithoutHaulers = readySources.filter(source => {
      const assignments = AssignmentManager.getSourceAssignments(source.id);
      const hasHauler = assignments.some(c => c.memory.role === "hauler");
      return !hasHauler;
    });

    // CRITICAL: If any ready source lacks a hauler, prioritize that
    if (readySourcesWithoutHaulers.length > 0) {
      const roleConfig = config.roles.hauler;
      let body: BodyPartConstant[];

      if (roleConfig && typeof roleConfig.body === 'function') {
        body = roleConfig.body(this.getEnergyForBodyGeneration(room));
      } else if (roleConfig && Array.isArray(roleConfig.body)) {
        body = roleConfig.body;
      } else {
        body = this.buildHaulerBody(room);
      }

      const bodyCost = this.calculateBodyCost(body);

      if (body.length > 0) {
        requests.push({
          role: "hauler",
          priority: 0, // HIGHEST PRIORITY - ready source without hauler means energy won't flow!
          reason: `PRIORITY: ${readySourcesWithoutHaulers.length} ready source(s) need haulers (container + harvester ready)`,
          body: body,
          minEnergy: bodyCost
        });
      }
    }

    // Secondary: Request haulers up to the number of ready sources
    const idealCount = readySources.length;

    if (haulerCount < idealCount) {
      // Get body from config - check if dynamic
      const roleConfig = config.roles.hauler;
      let body: BodyPartConstant[];

      if (roleConfig && typeof roleConfig.body === 'function') {
        // Dynamic body generation - uses aggressive scaling when economy stable
        body = roleConfig.body(this.getEnergyForBodyGeneration(room));
      } else if (roleConfig && Array.isArray(roleConfig.body)) {
        // Static body array
        body = roleConfig.body;
      } else {
        // Fallback to building hauler body manually
        body = this.buildHaulerBody(room);
      }

      // Calculate actual body cost
      const bodyCost = this.calculateBodyCost(body);

      // Only create request if body is viable
      if (body.length > 0) {
        requests.push({
          role: "hauler",
          priority: roleConfig?.priority || 1, // High priority - critical for logistics
          reason: `Hauler logistics: ${haulerCount}/${idealCount} haulers (${readySources.length} sources ready)`,
          body: body,
          minEnergy: bodyCost
        });
      }
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
