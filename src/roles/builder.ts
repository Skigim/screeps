import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

export class RoleBuilder {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.builder;
    if (!roleConfig) {
      console.log(`⚠️ No builder config found for ${creep.name}`);
      return;
    }

    // Toggle working state
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      // Intelligent construction prioritization
      const target = this.findBestConstructionTarget(creep);

      if (target) {
        if (creep.build(target) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, target);
        }
      } else {
        // If no construction sites, upgrade controller
        if (creep.room.controller) {
          if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, creep.room.controller);
          }
        }
      }
    } else {
      // CRITICAL GUARDRAIL: Don't withdraw if room needs energy for spawning
      // Reserve energy for spawn if we're below minimum viable energy (200)
      const shouldReserveEnergy = creep.room.energyAvailable < 200;

      if (!shouldReserveEnergy) {
        // Safe to withdraw - room has enough energy for spawning
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure: any) => {
            return (
              (structure.structureType === STRUCTURE_EXTENSION ||
                structure.structureType === STRUCTURE_SPAWN) &&
              structure.store &&
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          }
        });

        if (target) {
          if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, target);
          }
          return;
        }
      }

      // Energy reserved for spawning OR no energy in spawn/extensions
      // Help bootstrap economy: harvest from sources or pickup dropped energy
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY
      });

      if (droppedEnergy) {
        if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, droppedEnergy);
        }
      } else {
        // CRISIS MODE: Harvest directly from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
    }
  }

  /**
   * Find the best construction target using intelligent prioritization
   *
   * Priority order:
   * 1. Continue building partially-built structures (finish what you started)
   * 2. Extensions (increase energy capacity)
   * 3. Containers (enable logistics)
   * 4. Roads (speed boost)
   * 5. Everything else
   */
  private static findBestConstructionTarget(creep: Creep): ConstructionSite | null {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);

    if (sites.length === 0) return null;

    // Define priority order
    const priorityOrder: BuildableStructureConstant[] = [
      STRUCTURE_EXTENSION,
      STRUCTURE_CONTAINER,
      STRUCTURE_ROAD
    ];

    // 1. HIGHEST PRIORITY: Continue building partially-built structures
    // Find any site that has progress > 0 (already started)
    const partiallyBuilt = sites.filter(site => site.progress > 0);

    if (partiallyBuilt.length > 0) {
      // Sort by most progress (closest to completion)
      partiallyBuilt.sort((a, b) => {
        const aProgress = a.progress / a.progressTotal;
        const bProgress = b.progress / b.progressTotal;
        return bProgress - aProgress; // Most complete first
      });

      // Build the most complete structure
      return partiallyBuilt[0];
    }

    // 2. No partially-built structures, use priority order
    for (const structureType of priorityOrder) {
      const sitesOfType = sites.filter(site => site.structureType === structureType);

      if (sitesOfType.length > 0) {
        // Find closest site of this type
        return creep.pos.findClosestByPath(sitesOfType) || sitesOfType[0];
      }
    }

    // 3. Fallback: Any remaining construction site
    return creep.pos.findClosestByPath(sites);
  }
}
