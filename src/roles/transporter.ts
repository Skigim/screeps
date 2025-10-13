import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { RoleHauler } from "./hauler";

/**
 * Transporter Role - Specialized hauler for builder support
 *
 * Purpose: Reduce traffic around source containers by delivering directly to builders
 *
 * Behavior:
 * - Primary: Respond to builder energy requests and deliver directly
 * - Secondary: Stay topped off near construction sites, ready for requests
 * - Fallback: Act as regular hauler if no requests for 10 ticks
 *
 * Energy Sources (priority):
 * 1. Global non-source dropped energy (by proximity)
 * 2. Spawn-adjacent destination containers
 * 3. Source containers
 */
export class RoleTransporter {
  private static readonly FALLBACK_THRESHOLD = 10; // Ticks without request before fallback

  /**
   * Check if there are any active energy requests from builders
   */
  private static getBuilderRequests(room: Room): Creep[] {
    return room.find(FIND_MY_CREEPS, {
      filter: (c) =>
        c.memory.role === "builder" &&
        c.memory.requestingEnergy === true &&
        c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }

  /**
   * Check if transporter should fallback to hauler behavior
   */
  private static shouldFallbackToHauler(creep: Creep): boolean {
    if (!creep.memory.lastRequestTick) {
      creep.memory.lastRequestTick = Game.time;
      return false;
    }

    const ticksSinceRequest = Game.time - creep.memory.lastRequestTick;
    return ticksSinceRequest >= this.FALLBACK_THRESHOLD;
  }

  /**
   * Find dropped energy excluding source areas (within 2 tiles of sources)
   */
  private static findNonSourceDroppedEnergy(creep: Creep): Resource | null {
    const sources = creep.room.find(FIND_SOURCES);

    const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: (resource) => {
        if (resource.resourceType !== RESOURCE_ENERGY) return false;

        // Exclude energy near sources (within 2 tiles)
        const nearSource = sources.some(source =>
          resource.pos.getRangeTo(source) <= 2
        );

        return !nearSource;
      }
    });

    return droppedEnergy;
  }

  /**
   * Withdraw energy from available sources (priority order)
   */
  private static withdrawEnergy(creep: Creep, config: RCLConfig): void {
    const progressionState = RoomStateManager.getProgressionState(creep.room.name);

    // 1. FIRST PRIORITY: Non-source dropped energy (by proximity)
    const droppedEnergy = this.findNonSourceDroppedEnergy(creep);
    if (droppedEnergy) {
      if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
        Traveler.travelTo(creep, droppedEnergy);
      }
      return;
    }

    // 2. SECOND PRIORITY: Destination container (spawn-adjacent)
    if (progressionState?.destContainerId) {
      const destContainer = Game.getObjectById(progressionState.destContainerId);
      if (destContainer?.store && destContainer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.withdraw(destContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, destContainer);
        }
        return;
      }
    }

    // 3. THIRD PRIORITY: Source containers
    const sourceContainers = creep.room.find(FIND_STRUCTURES, {
      filter: (s) => {
        if (s.structureType !== STRUCTURE_CONTAINER) return false;
        const container = s as StructureContainer;

        // Check if near a source
        const nearbySources = s.pos.findInRange(FIND_SOURCES, 1);
        if (nearbySources.length === 0) return false;

        return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
      }
    });

    if (sourceContainers.length > 0) {
      const closest = creep.pos.findClosestByPath(sourceContainers);
      if (closest) {
        if (creep.withdraw(closest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, closest);
        }
        return;
      }
    }

    // 4. FALLBACK: If no energy sources, idle near construction sites
    const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      const closest = creep.pos.findClosestByRange(constructionSites);
      if (closest && creep.pos.getRangeTo(closest) > 3) {
        Traveler.travelTo(creep, closest, { range: 3 });
      }
    }
  }

  /**
   * Main transporter logic
   */
  public static run(creep: Creep, config: RCLConfig): void {
    // Initialize lastRequestTick if not set
    if (!creep.memory.lastRequestTick) {
      creep.memory.lastRequestTick = Game.time;
    }

    // Toggle working state based on energy
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
    }

    // Check if we should fallback to hauler behavior
    if (this.shouldFallbackToHauler(creep)) {
      // No requests for 10 ticks - act as regular hauler
      RoleHauler.run(creep, config);
      return;
    }

    if (creep.memory.working) {
      // WORKING MODE: Deliver to builders or stay ready

      // Check for active builder requests
      const requestingBuilders = this.getBuilderRequests(creep.room);

      // Only respond to requests if we have energy to give (not empty)
      // If we have some energy but not full, we should still deliver what we have
      const hasEnergyToDeliver = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;

      if (requestingBuilders.length > 0 && hasEnergyToDeliver) {
        // Update last request tick - we have active requests
        creep.memory.lastRequestTick = Game.time;

        // Find closest requesting builder
        const target = creep.pos.findClosestByPath(requestingBuilders);

        if (target) {
          if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, target);
          } else {
            // Successfully delivered - check for another request immediately
            const nextBuilder = this.getBuilderRequests(creep.room).find(b => b.id !== target.id);
            if (!nextBuilder && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
              // No more requests but still have energy - move to construction sites
              const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
              if (constructionSites.length > 0) {
                const closest = creep.pos.findClosestByRange(constructionSites);
                if (closest && creep.pos.getRangeTo(closest) > 3) {
                  Traveler.travelTo(creep, closest, { range: 3 });
                }
              }
            }
          }
          return;
        }
      }

      // No active requests (or no energy) - stay near construction sites, ready to respond
      const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (constructionSites.length > 0) {
        const closest = creep.pos.findClosestByRange(constructionSites);
        if (closest && creep.pos.getRangeTo(closest) > 5) {
          Traveler.travelTo(creep, closest, { range: 3 });
        }
      } else {
        // No construction sites - idle near spawn
        const spawn = creep.room.find(FIND_MY_STRUCTURES, {
          filter: s => s.structureType === STRUCTURE_SPAWN
        })[0];
        if (spawn && creep.pos.getRangeTo(spawn) > 5) {
          Traveler.travelTo(creep, spawn, { range: 3 });
        }
      }

    } else {
      // COLLECTING MODE: Top up energy reserves
      this.withdrawEnergy(creep, config);
    }
  }
}
