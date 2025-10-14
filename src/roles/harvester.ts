import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";

export class RoleHarvester {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.harvester;
    if (!roleConfig) {
      console.log(`⚠️ No harvester config found for ${creep.name}`);
      return;
    }

    // Get progression state to determine behavior
    const progressionState = RoomStateManager.getProgressionState(creep.room.name);

    // Enable drop mining if:
    // 1. RCL1 with useContainers enabled (stationary harvester + hauler system)
    // 2. RCL2+ with haulers enabled
    const isRCL1WithContainers = creep.room.controller?.level === 1 && config.spawning.useContainers;
    const useDropMining = isRCL1WithContainers || progressionState?.useHaulers || false;

    // Check if this is a stationary harvester (no CARRY parts)
    const hasCarryParts = creep.getActiveBodyparts(CARRY) > 0;
    const isStationaryHarvester = !hasCarryParts;

    // STATIONARY HARVESTER: Park on container and continuously harvest
    if (isStationaryHarvester && useDropMining) {
      // Find the container for our assigned source
      let targetContainer: StructureContainer | null = null;

      if (creep.memory.assignedSource) {
        const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
        if (source) {
          const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
          }) as StructureContainer[];

          if (containers.length > 0) {
            targetContainer = containers[0];
          }
        }

        // If container exists, park on it and harvest continuously
        if (targetContainer) {
          if (!creep.pos.isEqualTo(targetContainer.pos)) {
            // Not on container - move to it
            Traveler.travelTo(creep, targetContainer, { range: 0 });
          } else {
            // On container - harvest continuously (energy auto-drops into container)
            if (source) {
              creep.harvest(source);
            }
          }
          return;
        }

        // No container yet - check for construction site
        if (source) {
          const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
          });

          if (containerSites.length > 0) {
            const site = containerSites[0];
            if (!creep.pos.isEqualTo(site.pos)) {
              Traveler.travelTo(creep, site, { range: 0 });
            } else {
              // On construction site - harvest (energy drops on ground for builders/haulers)
              creep.harvest(source);
            }
            return;
          }

          // No container or site - just harvest next to source
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
      return;
    }

    // MOBILE HARVESTER: Original behavior with CARRY parts
    // Toggle working state
    if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
    }
    if (creep.store.getUsedCapacity() === 0) {
      creep.memory.working = false;
    }

    if (!creep.memory.working) {
      // Harvest energy from assigned source
      if (creep.memory.assignedSource) {
        const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      } else {
        // Fallback: find any source if no assignment
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
    } else {
      // ECONOMIC HANDOVER: If haulers are active, switch to drop mining
      if (useDropMining) {
        // Find the container for our assigned source
        let targetContainer: StructureContainer | null = null;

        if (creep.memory.assignedSource) {
          const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
          if (source) {
            const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
              filter: s => s.structureType === STRUCTURE_CONTAINER
            }) as StructureContainer[];

            if (containers.length > 0) {
              targetContainer = containers[0];
            }
          }
        }

        // If container exists, park on top of it and drop energy
        if (targetContainer) {
          if (creep.pos.isEqualTo(targetContainer.pos)) {
            // On container - drop energy for haulers to pick up
            creep.drop(RESOURCE_ENERGY);
          } else {
            // Move to container
            Traveler.travelTo(creep, targetContainer, { range: 0 });
          }
          return;
        }

        // No container yet - find construction site and drop there
        if (creep.memory.assignedSource) {
          const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
          if (source) {
            const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
              filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            if (containerSites.length > 0) {
              const site = containerSites[0];
              if (creep.pos.isEqualTo(site.pos)) {
                creep.drop(RESOURCE_ENERGY);
              } else {
                Traveler.travelTo(creep, site, { range: 0 });
              }
              return;
            }
          }
        }
      }

      // LEGACY BEHAVIOR: No haulers yet - deliver energy to spawn/extensions
      // Transfer energy to spawn or extensions
      const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: any) => {
          return (
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        }
      });

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, target);
        }
      }
    }
  }
}
