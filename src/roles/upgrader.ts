import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { RCL2Phase } from "managers/ProgressionManager";

export class RoleUpgrader {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.upgrader;
    if (!roleConfig) {
      console.log(`⚠️ No upgrader config found for ${creep.name}`);
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
      // Upgrade controller
      if (creep.room.controller) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, creep.room.controller);
        }
      }
    } else {
      // Energy gathering priority based on RCL config
      const energySourceMode = roleConfig.behavior?.energySource || "withdraw";

      if (energySourceMode === "withdraw") {
        // RCL1 behavior: Withdraw from spawn (only structure available)
        const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
          filter: (structure: any) => {
            return (
              structure.structureType === STRUCTURE_SPAWN &&
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

        // If spawn is empty, harvest directly
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      } else if (energySourceMode === "container") {
        // RCL2+ behavior: EXCLUSIVE controller container usage + vacuum duty
        // Priority:
        // 1. Controller container (primary energy source)
        // 2. Vacuum dropped energy (non-source areas) and return to base
        // 
        // This creates a clean separation of duties:
        // - Haulers: Source containers → Spawn/Extensions
        // - Upgraders: Controller container → Controller (+ vacuum cleanup)

        const progressionState = RoomStateManager.getProgressionState(creep.room.name);

        // Check if we're in "return to base" mode (have energy but not at capacity)
        const isVacuuming = creep.memory.vacuuming === true;

        if (isVacuuming && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          // Return dropped energy to spawn or destination container
          const spawn = creep.room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_SPAWN &&
                        s.store &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          })[0];

          if (spawn) {
            if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, spawn);
            } else {
              // Successfully delivered, clear vacuum flag
              creep.memory.vacuuming = false;
            }
            return;
          }

          // If spawn is full, try destination container
          if (progressionState?.destContainerId) {
            const destContainer = Game.getObjectById(progressionState.destContainerId);
            if (destContainer?.store && destContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
              if (creep.transfer(destContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                Traveler.travelTo(creep, destContainer);
              } else {
                creep.memory.vacuuming = false;
              }
              return;
            }
          }

          // If nowhere to deliver, just proceed to work mode
          creep.memory.vacuuming = false;
        }

        // 1. PRIMARY: Withdraw from controller container ONLY
        if (creep.room.controller) {
          const controllerContainer = creep.room.controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: s => {
              if (s.structureType !== STRUCTURE_CONTAINER) return false;
              const container = s as StructureContainer;
              const energy = container.store?.getUsedCapacity(RESOURCE_ENERGY);
              return energy !== null && energy !== undefined && energy > 0;
            }
          })[0] as StructureContainer | undefined;

          if (controllerContainer) {
            if (creep.withdraw(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, controllerContainer);
            }
            return;
          }
        }

        // 2. VACUUM DUTY: If controller container is empty, clean up dropped energy
        // EXCLUDE energy near sources (that's harvester overflow, intentional)
        const sources = creep.room.find(FIND_SOURCES);
        const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
          filter: resource => {
            if (resource.resourceType !== RESOURCE_ENERGY) return false;

            // Exclude energy near sources (within 2 tiles)
            const nearSource = sources.some(source => 
              resource.pos.getRangeTo(source) <= 2
            );

            return !nearSource;
          }
        });

        if (droppedEnergy) {
          if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, droppedEnergy);
          } else {
            // Set vacuum flag to return energy to base
            creep.memory.vacuuming = true;
          }
          return;
        }

        // 3. If no work available, idle near controller (ready for energy)
        if (creep.room.controller && creep.pos.getRangeTo(creep.room.controller) > 3) {
          Traveler.travelTo(creep, creep.room.controller, { range: 3 });
        }
      } else {
        // Fallback: harvest mode
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
    }
  }
}
