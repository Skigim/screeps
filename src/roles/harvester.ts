import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

export class RoleHarvester {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.harvester;
    if (!roleConfig) {
      console.log(`⚠️ No harvester config found for ${creep.name}`);
      return;
    }

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
      // Check if source containers exist (for drop mining strategy)
      const sourceContainers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      });
      const hasSourceContainers = sourceContainers.some(container => {
        const sources = creep.room.find(FIND_SOURCES);
        return sources.some(source => container.pos.inRangeTo(source, 1));
      });

      // Phase 1 (no source containers): DROP MINING STRATEGY
      // Drop energy near container sites for builders to pick up
      if (!hasSourceContainers) {
        // Find container construction sites near sources
        const containerSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
          filter: site => {
            if (site.structureType !== STRUCTURE_CONTAINER) return false;
            const sources = creep.room.find(FIND_SOURCES);
            return sources.some(source => site.pos.inRangeTo(source, 1));
          }
        });

        if (containerSite) {
          // Move to container site and drop energy
          if (creep.pos.inRangeTo(containerSite, 0)) {
            // At container site - drop energy for builders
            creep.drop(RESOURCE_ENERGY);
          } else {
            Traveler.travelTo(creep, containerSite, { range: 0 });
          }
          return;
        }
      }

      // Phase 2+: Normal delivery to spawn/extensions
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
