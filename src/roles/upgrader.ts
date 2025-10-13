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
      // PHASE 1 & 2 LOCKDOWN: NEVER withdraw during container + extension construction
      // During Phase 1-2, all energy must be reserved for spawning emergency harvesters
      // Upgraders must harvest directly or pick up drops only
      const progressionState = RoomStateManager.getProgressionState(creep.room.name);
      const isConstructionPhase = progressionState?.phase === RCL2Phase.PHASE_1_CONTAINERS ||
                                   progressionState?.phase === RCL2Phase.PHASE_2_EXTENSIONS;

      if (!isConstructionPhase) {
        // CRITICAL GUARDRAIL: Don't withdraw if room needs energy for spawning
        // Reserve energy for spawn if we're below minimum viable energy (200)
        const shouldReserveEnergy = creep.room.energyAvailable < 200;

        if (!shouldReserveEnergy) {
          // Safe to withdraw - room has enough energy for spawning
          // ONLY from extensions, NEVER from spawn (spawn energy reserved for spawning)
          const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure: any) => {
              return (
                structure.structureType === STRUCTURE_EXTENSION && // ONLY extensions, NOT spawn
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
      }

      // Energy reserved for spawning OR Phase 1-2 OR no energy in spawn/extensions
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
}
