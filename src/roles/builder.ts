/**
 * Task-based Builder Role
 *
 * Uses creep-tasks while preserving all custom logic:
 * - Phase-aware construction prioritization
 * - Energy source locking (no wandering)
 * - Hauler energy delivery system
 * - Road avoidance behavior
 * - Container site locking for Phase 1
 */

import Tasks from "creep-tasks";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { RCL2Phase } from "managers/ProgressionManager";
import { TrafficManager } from "managers/TrafficManager";

export class RoleBuilder {
  public static run(creep: Creep, config: RCLConfig): void {
    // Execute current task if exists
    if (creep.task) {
      // While working, move off road if needed
      if (creep.memory.working) {
        this.moveOffRoadIfNeeded(creep);
      }
      return;
    }

    // State transitions when COMPLETELY full or empty
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
      delete creep.memory.energySourceId;
      delete creep.memory.energyRequested;
      delete creep.memory.requestTime;
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
      delete creep.memory.energySourceId;
      delete creep.memory.energyRequested;
      delete creep.memory.requestTime;
    }

    if (creep.memory.working) {
      this.assignWorkTask(creep);
    } else {
      this.assignGatherTask(creep);
    }
  }

  /**
   * Assign construction or upgrade task
   */
  private static assignWorkTask(creep: Creep): void {
    const target = this.findBestConstructionTarget(creep);

    if (target) {
      creep.task = Tasks.build(target);
    } else if (creep.room.controller) {
      creep.task = Tasks.upgrade(creep.room.controller);
    }
  }

  /**
   * Assign energy gathering task with locking and hauler requests
   */
  private static assignGatherTask(creep: Creep): void {
    // Check for hauler delivery system
    const hasTransportHaulers = TrafficManager.hasTransportCapableHaulers(creep.room);

    if (hasTransportHaulers && !creep.memory.energyRequested) {
      const availableHaulers = creep.room.find(FIND_MY_CREEPS, {
        filter: c =>
          c.memory.role === "hauler" &&
          c.store[RESOURCE_ENERGY] > 0 &&
          c.memory.canTransport !== false
      });

      if (availableHaulers.length > 0) {
        TrafficManager.requestEnergy(creep);
      }
    }

    // If waiting for delivery
    if (creep.memory.energyRequested) {
      // Check timeout
      if (creep.memory.requestTime && Game.time - creep.memory.requestTime > 20) {
        console.log(`${creep.name}: Energy request timeout, self-serving`);
        delete creep.memory.energyRequested;
        delete creep.memory.requestTime;
      } else {
        // Wait for hauler (move off road)
        const assignedHauler = creep.room.find(FIND_MY_CREEPS, {
          filter: c => c.memory.role === "hauler" && c.memory.assignedBuilder === creep.name
        })[0];

        if (assignedHauler && creep.pos.getRangeTo(assignedHauler) > 5) {
          creep.task = Tasks.goTo(assignedHauler, { range: 3 } as any);
        } else {
          this.moveOffRoadIfNeeded(creep, 2);
        }
        return;
      }
    }

    // Use locked target if valid
    if (creep.memory.energySourceId) {
      const lockedTarget = Game.getObjectById(creep.memory.energySourceId) as any;
      if (this.isValidEnergySource(lockedTarget)) {
        this.assignEnergySourceTask(creep, lockedTarget);
        return;
      } else {
        delete creep.memory.energySourceId;
      }
    }

    // Find and lock new energy source
    const energySource = this.findAndLockEnergySource(creep);
    if (energySource) {
      this.assignEnergySourceTask(creep, energySource);
    }
  }

  /**
   * Assign task to gather from specific energy source
   */
  private static assignEnergySourceTask(creep: Creep, target: any): void {
    if (target instanceof Resource) {
      creep.task = Tasks.pickup(target);
    } else if (target instanceof Source) {
      creep.task = Tasks.harvest(target);
    } else {
      creep.task = Tasks.withdraw(target, RESOURCE_ENERGY);
    }
  }

  /**
   * Check if energy source is still valid
   */
  private static isValidEnergySource(target: any): boolean {
    if (!target) return false;
    if (target instanceof Resource) return target.amount > 0;
    if (target instanceof Source) return target.energy > 0;
    if (target.store) return target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    return false;
  }

  /**
   * Find and lock onto new energy source
   * Preserves all original priority logic
   */
  private static findAndLockEnergySource(creep: Creep): any {
    const progressionState = RoomStateManager.getProgressionState(creep.room.name);

    // PHASE 1 SPECIAL: Energy at container construction site
    if (progressionState?.phase === RCL2Phase.PHASE_1_CONTAINERS) {
      const lockedSite = this.findBestConstructionTarget(creep);
      if (lockedSite && lockedSite.structureType === STRUCTURE_CONTAINER) {
        const droppedAtSite = lockedSite.pos
          .lookFor(LOOK_RESOURCES)
          .filter(r => r.resourceType === RESOURCE_ENERGY && r.amount > 0);

        if (droppedAtSite.length > 0) {
          creep.memory.energySourceId = droppedAtSite[0].id;
          return droppedAtSite[0];
        }

        // Harvest from adjacent source
        const adjacentSources = lockedSite.pos.findInRange(FIND_SOURCES, 1);
        if (adjacentSources.length > 0) {
          creep.memory.energySourceId = adjacentSources[0].id;
          return adjacentSources[0];
        }
      }
    }

    // Dropped energy near construction target
    const constructionTarget = this.findBestConstructionTarget(creep);
    if (constructionTarget) {
      const nearbyDropped = constructionTarget.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
      });

      if (nearbyDropped.length > 0) {
        nearbyDropped.sort((a, b) => b.amount - a.amount);
        creep.memory.energySourceId = nearbyDropped[0].id;
        return nearbyDropped[0];
      }
    }

    // Priority 2: Ruins
    const ruins = creep.room.find(FIND_RUINS);
    const ruinWithEnergy = ruins.find(r => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
    if (ruinWithEnergy) {
      creep.memory.energySourceId = ruinWithEnergy.id;
      return ruinWithEnergy;
    }

    // Priority 3: Source containers
    const sourceContainers = creep.room.find(FIND_STRUCTURES, {
      filter: s => {
        if (s.structureType !== STRUCTURE_CONTAINER) return false;
        const container = s as StructureContainer;
        const nearbySources = s.pos.findInRange(FIND_SOURCES, 1);
        if (nearbySources.length === 0) return false;
        return container.store?.getUsedCapacity(RESOURCE_ENERGY)! > 0;
      }
    }) as StructureContainer[];

    if (sourceContainers.length > 0) {
      const closest = creep.pos.findClosestByPath(sourceContainers);
      if (closest) {
        creep.memory.energySourceId = closest.id;
        return closest;
      }
    }

    // Priority 4: Destination container
    if (progressionState?.destContainerId) {
      const destContainer = Game.getObjectById(progressionState.destContainerId) as StructureContainer | null;
      if (destContainer && destContainer.store?.getUsedCapacity(RESOURCE_ENERGY)! > 0) {
        creep.memory.energySourceId = destContainer.id;
        return destContainer;
      }
    }

    // Priority 5: Dropped energy
    const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY
    });
    if (droppedEnergy) {
      creep.memory.energySourceId = droppedEnergy.id;
      return droppedEnergy;
    }

    // Priority 6: Harvest source
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
      creep.memory.energySourceId = source.id;
      return source;
    }

    return null;
  }

  /**
   * Move creep off road if currently standing on one
   */
  private static moveOffRoadIfNeeded(creep: Creep, minDistance: number = 1): void {
    const nearbyRoads = creep.pos.findInRange(FIND_STRUCTURES, minDistance, {
      filter: s => s.structureType === STRUCTURE_ROAD
    });

    if (nearbyRoads.length === 0) return;

    const candidates: RoomPosition[] = [];
    const searchRange = minDistance + 2;

    for (let dx = -searchRange; dx <= searchRange; dx++) {
      for (let dy = -searchRange; dy <= searchRange; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = creep.pos.x + dx;
        const y = creep.pos.y + dy;
        const terrain = creep.room.getTerrain().get(x, y);
        if (terrain === TERRAIN_MASK_WALL) continue;
        const pos = new RoomPosition(x, y, creep.room.name);
        const roadsNearPos = pos.findInRange(FIND_STRUCTURES, minDistance - 1, {
          filter: s => s.structureType === STRUCTURE_ROAD
        });
        if (roadsNearPos.length === 0) {
          candidates.push(pos);
        }
      }
    }

    if (candidates.length > 0) {
      const target = creep.pos.findClosestByPath(candidates);
      if (target) {
        creep.task = Tasks.goTo(target);
      }
    }
  }

  /**
   * Find best construction target with phase-aware prioritization
   * Preserves all original logic including Phase 1 container locking
   */
  private static findBestConstructionTarget(creep: Creep): ConstructionSite | null {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length === 0) return null;

    const progressionState = RoomStateManager.getProgressionState(creep.room.name);
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

    // PHASE 1 SPECIAL: Lock onto ONE container
    if (progressionState?.phase === RCL2Phase.PHASE_1_CONTAINERS) {
      const containerSites = sites.filter(site => site.structureType === STRUCTURE_CONTAINER);
      if (containerSites.length > 0) {
        if (creep.memory.lockedConstructionSiteId) {
          const lockedSite = Game.getObjectById(
            creep.memory.lockedConstructionSiteId
          ) as ConstructionSite | null;
          if (lockedSite && lockedSite.structureType === STRUCTURE_CONTAINER) {
            return lockedSite;
          } else {
            delete creep.memory.lockedConstructionSiteId;
          }
        }

        const partiallyBuilt = containerSites.filter(site => site.progress > 0);
        let chosenSite: ConstructionSite;

        if (partiallyBuilt.length > 0) {
          partiallyBuilt.sort((a, b) => {
            const aProgress = a.progress / a.progressTotal;
            const bProgress = b.progress / b.progressTotal;
            return bProgress - aProgress;
          });
          chosenSite = partiallyBuilt[0];
        } else {
          chosenSite = creep.pos.findClosestByPath(containerSites) || containerSites[0];
        }

        creep.memory.lockedConstructionSiteId = chosenSite.id;
        return chosenSite;
      }
    }

    // Priority 1: Phase-specific structures
    if (phasePriorityType) {
      const phaseSites = sites.filter(site => site.structureType === phasePriorityType);
      if (phaseSites.length > 0) {
        const partiallyBuilt = phaseSites.filter(site => site.progress > 0);
        if (partiallyBuilt.length > 0) {
          partiallyBuilt.sort((a, b) => {
            const aProgress = a.progress / a.progressTotal;
            const bProgress = b.progress / b.progressTotal;
            return bProgress - aProgress;
          });
          return partiallyBuilt[0];
        }
        return creep.pos.findClosestByPath(phaseSites) || phaseSites[0];
      }
    }

    // Priority 2: Finish partially-built structures
    const partiallyBuilt = sites.filter(site => site.progress > 0);
    if (partiallyBuilt.length > 0) {
      partiallyBuilt.sort((a, b) => {
        const aProgress = a.progress / a.progressTotal;
        const bProgress = b.progress / b.progressTotal;
        return bProgress - aProgress;
      });
      return partiallyBuilt[0];
    }

    // Priority 3: Fallback priority order
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

    return creep.pos.findClosestByPath(sites);
  }
}
