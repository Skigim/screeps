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
      // 1. PHASE 1 ONLY: Dropped energy AT the locked container site (0 range - exact position)
      // 2. Ruins (free energy from dead structures)
      // 3. Spawn/Extensions (if surplus)
      // 4. Dropped energy anywhere
      // 5. Harvest source (crisis mode)

      // Get progression state for Phase 1 detection
      const progressionState = RoomStateManager.getProgressionState(creep.room.name);

      // PHASE 1 SPECIAL LOGIC: Only pick up energy AT the locked container site
      if (progressionState?.phase === RCL2Phase.PHASE_1_CONTAINERS) {
        const lockedSite = this.findBestConstructionTarget(creep);

        if (lockedSite && lockedSite.structureType === STRUCTURE_CONTAINER) {
          // Look for dropped energy EXACTLY at the container construction site (0 range)
          const droppedAtSite = lockedSite.pos.lookFor(LOOK_RESOURCES)
            .filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 0);

          if (droppedAtSite.length > 0) {
            const dropped = droppedAtSite[0];
            creep.memory.energySourceId = dropped.id; // LOCK IT
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, dropped);
            }
            return;
          }

          // No energy at the container site yet - harvest from the source
          // Find which source this container is for (should be adjacent)
          const adjacentSources = lockedSite.pos.findInRange(FIND_SOURCES, 1);

          if (adjacentSources.length > 0) {
            const source = adjacentSources[0];
            creep.memory.energySourceId = source.id; // LOCK IT
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, source);
            }
            return;
          }
        }
      }

      // NON-PHASE-1 LOGIC: Check for dropped energy near construction target
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

      // THIRD PRIORITY: Withdraw from containers
      // Priority: Source containers → Destination container (spawn-adjacent)

      // 3A. Source containers (primary energy storage)
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
          creep.memory.energySourceId = closest.id; // LOCK IT
          if (creep.withdraw(closest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, closest);
          }
          return;
        }
      }

      // 3B. Destination container (spawn-adjacent container filled by haulers)
      if (progressionState?.destContainerId) {
        const destContainer = Game.getObjectById(progressionState.destContainerId);

        if (destContainer?.store) {
          const energy = destContainer.store.getUsedCapacity(RESOURCE_ENERGY);
          if (energy && energy > 0) {
            creep.memory.energySourceId = destContainer.id; // LOCK IT
            if (creep.withdraw(destContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, destContainer);
            }
            return;
          }
        }
      }

      // FOURTH PRIORITY: Pickup dropped energy
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY
      });

      if (droppedEnergy) {
        creep.memory.energySourceId = droppedEnergy.id; // LOCK IT
        if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, droppedEnergy);
        }
        return;
      }

      // FIFTH PRIORITY (CRISIS MODE): Harvest directly from source
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

      if (source) {
        creep.memory.energySourceId = source.id; // LOCK IT
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, source);
        }
      }
    }
  }

  /**
   * Find the best construction target using progression-aware intelligent prioritization
   *
   * PHASE 1 SPECIAL LOGIC (Source Containers):
   * - Lock onto ONE source container and finish it completely
   * - Store the locked target in creep memory
   * - Only switch to next container when current one is complete
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
        case RCL2Phase.PHASE_1_CONTAINERS:
          phasePriorityType = STRUCTURE_CONTAINER;
          break;
        case RCL2Phase.PHASE_2_EXTENSIONS:
          phasePriorityType = STRUCTURE_EXTENSION;
          break;
        case RCL2Phase.PHASE_3_ROADS:
          phasePriorityType = STRUCTURE_ROAD;
          break;
        case RCL2Phase.PHASE_4_CONTROLLER:
          phasePriorityType = STRUCTURE_CONTAINER;
          break;
      }
    }

    // PHASE 1 SPECIAL LOGIC: Lock onto ONE source container at a time
    if (progressionState?.phase === RCL2Phase.PHASE_1_CONTAINERS) {
      const containerSites = sites.filter(site => site.structureType === STRUCTURE_CONTAINER);

      if (containerSites.length > 0) {
        // Check if we have a locked container target
        if (creep.memory.lockedConstructionSiteId) {
          const lockedSite = Game.getObjectById(creep.memory.lockedConstructionSiteId) as ConstructionSite | null;

          // If locked site still exists, keep using it
          if (lockedSite && lockedSite.structureType === STRUCTURE_CONTAINER) {
            return lockedSite;
          } else {
            // Locked site completed or removed - clear the lock
            delete creep.memory.lockedConstructionSiteId;
          }
        }

        // No lock or lock expired - choose ONE container and LOCK onto it
        // Prefer containers with progress (finish what's started)
        const partiallyBuilt = containerSites.filter(site => site.progress > 0);

        let chosenSite: ConstructionSite;
        if (partiallyBuilt.length > 0) {
          // Sort by most progress
          partiallyBuilt.sort((a, b) => {
            const aProgress = a.progress / a.progressTotal;
            const bProgress = b.progress / b.progressTotal;
            return bProgress - aProgress;
          });
          chosenSite = partiallyBuilt[0];
        } else {
          // No partially built - pick closest unstarted container
          chosenSite = creep.pos.findClosestByPath(containerSites) || containerSites[0];
        }

        // LOCK this container site
        creep.memory.lockedConstructionSiteId = chosenSite.id;
        return chosenSite;
      }
    }

    // 1. HIGHEST PRIORITY: Build phase-appropriate structures FIRST (non-Phase-1 logic)
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
