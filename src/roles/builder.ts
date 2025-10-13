import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { RCL2Phase } from "managers/ProgressionManager";
import { SpawnRequestGenerator } from "managers/SpawnRequestGenerator";

export class RoleBuilder {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.builder;
    if (!roleConfig) {
      console.log(`⚠️ No builder config found for ${creep.name}`);
      return;
    }

    // CRITICAL: State transitions only happen when COMPLETELY full or COMPLETELY empty
    // This prevents builders from wandering around half-full
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
      delete creep.memory.energySourceId; // Clear locked source when empty
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
      delete creep.memory.energySourceId; // Clear locked source when full
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
      // Energy collection priority with TARGET LOCKING
      // Lock onto ONE energy source and stick with it until COMPLETELY FULL
      // This prevents wandering between ruins, spawns, drops, sources mid-gathering

      // If we have a locked target, try to use it first
      if (creep.memory.energySourceId) {
        const lockedTarget = Game.getObjectById(creep.memory.energySourceId) as any;

        // Validate locked target still has energy
        let targetValid = false;
        if (lockedTarget) {
          if (lockedTarget instanceof Resource) {
            targetValid = lockedTarget.amount > 0;
          } else if (lockedTarget instanceof Source) {
            targetValid = lockedTarget.energy > 0;
          } else if (lockedTarget.store) {
            targetValid = lockedTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
          }
        }

        // If locked target is still valid, use it
        if (targetValid) {
          if (lockedTarget instanceof Resource) {
            if (creep.pickup(lockedTarget) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, lockedTarget);
            }
          } else if (lockedTarget instanceof Source) {
            if (creep.harvest(lockedTarget) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, lockedTarget);
            }
          } else {
            if (creep.withdraw(lockedTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, lockedTarget);
            }
          }
          return; // Stick with locked target
        } else {
          // Locked target exhausted - clear lock and find new target
          delete creep.memory.energySourceId;
        }
      }

      // No locked target - find and LOCK onto new energy source
      // Priority:
      // 1. Dropped energy near construction site (free energy at the worksite!)
      // 2. Ruins (free energy from dead structures)
      // 3. Spawn/Extensions (if surplus)
      // 4. Dropped energy anywhere
      // 5. Harvest source (crisis mode)

      // FIRST: Check for dropped energy near our construction target (super efficient!)
      const constructionTarget = this.findBestConstructionTarget(creep);
      if (constructionTarget) {
        const nearbyDropped = constructionTarget.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
          filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
        });

        if (nearbyDropped.length > 0) {
          // Sort by amount (grab biggest pile first)
          nearbyDropped.sort((a, b) => b.amount - a.amount);
          const dropped = nearbyDropped[0];

          creep.memory.energySourceId = dropped.id; // LOCK IT
          if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, dropped);
          }
          return;
        }
      }

      // SECOND PRIORITY: Loot ruins (common with captured rooms)
      const ruins = creep.room.find(FIND_RUINS);
      const ruinWithEnergy = ruins.find(r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0);

      if (ruinWithEnergy) {
        creep.memory.energySourceId = ruinWithEnergy.id; // LOCK IT
        if (creep.withdraw(ruinWithEnergy, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, ruinWithEnergy);
        }
        return;
      }

      // THIRD PRIORITY: Withdraw from spawn/extensions
      // SMART LOGIC: Check if there are pending spawn requests
      // If no pending requests, spawn energy is "free" for builders!
      const pendingRequests = SpawnRequestGenerator.generateRequests(creep.room);
      const hasPendingSpawns = pendingRequests && pendingRequests.length > 0;

      // Allow withdrawal if:
      // 1. No pending spawn requests (energy is free!), OR
      // 2. Room has surplus energy (>200 minimum)
      const canWithdrawFromSpawn = !hasPendingSpawns || creep.room.energyAvailable >= 200;

      if (canWithdrawFromSpawn) {
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
          creep.memory.energySourceId = target.id; // LOCK IT
          if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, target);
          }
          return;
        }
      }

      // Energy reserved for spawning OR no energy in spawn/extensions
      // Help bootstrap economy: pickup dropped energy or harvest from sources
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY
      });

      if (droppedEnergy) {
        creep.memory.energySourceId = droppedEnergy.id; // LOCK IT
        if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, droppedEnergy);
        }
      } else {
        // CRISIS MODE: Harvest directly from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

        if (source) {
          creep.memory.energySourceId = source.id; // LOCK IT
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
    }
  }

  /**
   * Find the best construction target using progression-aware intelligent prioritization
   *
   * Priority order:
   * 1. CURRENT PHASE PRIORITY: Build structures needed for current phase progression
   * 2. FINISH STARTED: Continue building partially-built structures
   * 3. FALLBACK PRIORITY: Extensions > Containers > Roads
   */
  private static findBestConstructionTarget(creep: Creep): ConstructionSite | null {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);

    if (sites.length === 0) return null;

    // Get current progression state
    const progressionState = RoomStateManager.getProgressionState(creep.room.name);

    // Determine phase-priority structure type
    let phasePriorityType: BuildableStructureConstant | null = null;

    if (progressionState) {
      switch (progressionState.phase) {
        case RCL2Phase.PHASE_1_EXTENSIONS:
          phasePriorityType = STRUCTURE_EXTENSION;
          break;
        case RCL2Phase.PHASE_2_CONTAINERS:
          phasePriorityType = STRUCTURE_CONTAINER;
          break;
        case RCL2Phase.PHASE_3_ROADS:
          phasePriorityType = STRUCTURE_ROAD;
          break;
        case RCL2Phase.PHASE_4_CONTROLLER:
          phasePriorityType = STRUCTURE_CONTAINER;
          break;
      }
    }

    // 1. HIGHEST PRIORITY: Build phase-appropriate structures FIRST
    if (phasePriorityType) {
      const phaseSites = sites.filter(site => site.structureType === phasePriorityType);

      if (phaseSites.length > 0) {
        // If any are partially built, finish those first
        const partiallyBuilt = phaseSites.filter(site => site.progress > 0);

        if (partiallyBuilt.length > 0) {
          // Sort by most progress (closest to completion)
          partiallyBuilt.sort((a, b) => {
            const aProgress = a.progress / a.progressTotal;
            const bProgress = b.progress / b.progressTotal;
            return bProgress - aProgress;
          });
          return partiallyBuilt[0];
        }

        // Otherwise, start building any phase-priority structure
        return creep.pos.findClosestByPath(phaseSites) || phaseSites[0];
      }
    }

    // 2. SECONDARY PRIORITY: Finish any partially-built structures (even if not phase priority)
    const partiallyBuilt = sites.filter(site => site.progress > 0);

    if (partiallyBuilt.length > 0) {
      // Sort by most progress (closest to completion)
      partiallyBuilt.sort((a, b) => {
        const aProgress = a.progress / a.progressTotal;
        const bProgress = b.progress / b.progressTotal;
        return bProgress - aProgress;
      });
      return partiallyBuilt[0];
    }

    // 3. FALLBACK: Use standard priority order for new construction
    const priorityOrder: BuildableStructureConstant[] = [
      STRUCTURE_EXTENSION,
      STRUCTURE_CONTAINER,
      STRUCTURE_ROAD
    ];

    for (const structureType of priorityOrder) {
      const sitesOfType = sites.filter(site => site.structureType === structureType);

      if (sitesOfType.length > 0) {
        return creep.pos.findClosestByPath(sitesOfType) || sitesOfType[0];
      }
    }

    // 4. LAST RESORT: Any remaining construction site
    return creep.pos.findClosestByPath(sites);
  }
}
