import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { RCL2Phase } from "managers/ProgressionManager";

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
      // Energy collection priority:
      // 1. Ruins (dead structures from previous players) - FREE ENERGY!
      // 2. Withdraw from spawn/extensions (if room has surplus)
      // 3. Pickup dropped energy
      // 4. Harvest directly from source (crisis mode)

      // HIGHEST PRIORITY: Loot ruins (common with captured rooms)
      // Note: FIND_RUINS = 123, but typed-screeps doesn't have it yet, so we cast
      const ruins = creep.room.find(123 as FindConstant) as unknown as Ruin[];
      const ruinWithEnergy = ruins.find(r => (r.store?.getUsedCapacity(RESOURCE_ENERGY) || 0) > 0);

      if (ruinWithEnergy) {
        if (creep.withdraw(ruinWithEnergy as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, ruinWithEnergy);
        }
        return;
      }

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
        // CRITICAL: Lock onto ONE source and don't switch until COMPLETELY FULL
        // This prevents builders from wandering around half-empty

        let source: Source | null = null;

        // If we have a locked source, use it (prevents random wandering)
        if (creep.memory.energySourceId) {
          source = Game.getObjectById(creep.memory.energySourceId) as Source | null;

          // If locked source is gone or depleted, clear the lock
          if (!source || source.energy === 0) {
            delete creep.memory.energySourceId;
            source = null;
          }
        }

        // If no locked source, find closest active source and LOCK IT
        if (!source) {
          source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

          if (source) {
            // LOCK onto this source - we won't switch until completely full
            creep.memory.energySourceId = source.id;
          }
        }

        // Harvest from locked source
        if (source) {
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
