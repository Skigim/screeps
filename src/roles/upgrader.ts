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
        // RCL2+ behavior: NEVER withdraw from spawn/extensions - use containers only
        // Priority:
        // 1. Source containers (primary energy storage)
        // 2. Destination container (spawn-adjacent, filled by haulers)
        // 3. Controller container (self-service)
        // 4. Dropped energy (harvester overflow)
        // 5. Harvest directly (crisis mode)

        const progressionState = RoomStateManager.getProgressionState(creep.room.name);

        // 1. FIRST PRIORITY: Withdraw from source containers
        const sourceContainers = creep.room.find(FIND_STRUCTURES, {
          filter: s => {
            if (s.structureType !== STRUCTURE_CONTAINER) return false;
            const container = s as StructureContainer;

            // Check if this is a source container (near a source)
            const nearbySources = s.pos.findInRange(FIND_SOURCES, 1);
            if (nearbySources.length === 0) return false;

            const energy = container.store?.getUsedCapacity(RESOURCE_ENERGY);
            return energy !== null && energy !== undefined && energy > 0;
          }
        }) as StructureContainer[];

        if (sourceContainers.length > 0) {
          const closest = creep.pos.findClosestByPath(sourceContainers);
          if (closest) {
            if (creep.withdraw(closest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, closest);
            }
            return;
          }
        }

        // 2. SECOND PRIORITY: Withdraw from destination container (spawn-adjacent)
        if (progressionState?.destContainerId) {
          const destContainer = Game.getObjectById(progressionState.destContainerId);

          if (destContainer?.store) {
            const energy = destContainer.store.getUsedCapacity(RESOURCE_ENERGY);
            if (energy && energy > 0) {
              if (creep.withdraw(destContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                Traveler.travelTo(creep, destContainer);
              }
              return;
            }
          }
        }

        // 3. THIRD PRIORITY: Withdraw from controller container (if exists)
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

        // 4. FOURTH PRIORITY: Pickup dropped energy
        const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
          filter: resource => resource.resourceType === RESOURCE_ENERGY
        });

        if (droppedEnergy) {
          if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, droppedEnergy);
          }
          return;
        }

        // 5. FIFTH PRIORITY (CRISIS MODE): Harvest directly from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
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
