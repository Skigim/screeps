/**
 * RCL 2 Configuration
 * Defines behaviors, body compositions, and strategic guidelines for RCL 2
 *
 * Strategy (from documentation):
 * Phase 1 (Immediate): Build 5 extensions (300→550 energy capacity)
 * Phase 2 (Infrastructure): Build containers at sources, roads to core
 * Phase 3 (Economic Overhaul): Transition to specialist economy
 *   - Stationary Harvesters: [WORK×5, MOVE] mine to containers
 *   - Haulers: [CARRY×3, MOVE×3] transport from containers
 *   - Upgraders: Pull from containers, not spawn
 * Phase 4 (Stabilize): Scale upgraders, prepare for RCL 3 towers
 *
 * Key Principles:
 * - Build infrastructure first (extensions, containers, roads)
 * - Transition to specialist logistics (stationary miners + haulers)
 * - Minimize walking, maximize working
 */

import type { RCLConfig } from "./RCLConfigTypes";

/**
 * Generate a stationary harvester body dynamically based on available energy
 * Stationary harvesters sit on containers and mine continuously
 * Target: Up to 5 WORK parts (max source efficiency) + 1 MOVE
 */
function generateHarvesterBody(energyCapacity: number): BodyPartConstant[] {
  // Ideal: [WORK×5, MOVE] = 550 energy (5 work parts = 10 energy/tick, source max)
  if (energyCapacity >= 550) {
    return [WORK, WORK, WORK, WORK, WORK, MOVE];
  }

  // Scale down based on available energy: try to get as many WORK parts as possible
  // Reserve 50 energy for MOVE
  const workParts = Math.min(5, Math.max(1, Math.floor((energyCapacity - 50) / 100)));
  const body: BodyPartConstant[] = [];

  for (let i = 0; i < workParts; i++) {
    body.push(WORK);
  }
  body.push(MOVE);

  return body;
}

/**
 * Generate a hauler body dynamically based on available energy
 * Haulers transport energy from containers to spawn/extensions
 * Pattern: Balanced CARRY/MOVE pairs
 *
 * Always spawns max-size haulers (up to 6 CARRY/MOVE pairs = 600 energy)
 * Demand-based spawning system handles hauler count based on overflow
 */
function generateHaulerBody(energyCapacity: number, room?: Room): BodyPartConstant[] {
  // Build balanced CARRY/MOVE pairs
  const maxPairs = Math.min(Math.floor(energyCapacity / 100), 6); // Cap at 6 pairs (600 energy)
  const body: BodyPartConstant[] = [];

  for (let i = 0; i < maxPairs; i++) {
    body.push(CARRY, MOVE);
  }

  // Minimum viable: at least 1 pair
  return body.length > 0 ? body : [CARRY, MOVE];
}

/**
 * Generate a general-purpose body for upgraders and builders
 * Pattern: Balanced WORK/CARRY/MOVE sets
 *
 * PRIORITY-AWARE: Workers should not exceed hauler capacity
 * Each CARRY part holds 50 energy, each WORK part uses 1 energy/tick
 * A worker with N WORK parts will drain N×50 energy every 50 ticks
 * Safe ratio: WORK parts <= total hauler CARRY capacity / 2
 */
function generateGeneralPurposeBody(energyCapacity: number, room?: Room): BodyPartConstant[] {
  // Calculate max safe WORK parts based on hauler capacity
  let maxWorkParts = Math.floor(energyCapacity / 200); // Default: based on energy

  if (room) {
    // Priority check: Don't create workers that exceed hauler supply capacity
    const haulers = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "hauler"
    });

    if (haulers.length > 0) {
      // Calculate total CARRY parts across all haulers
      const totalCarryParts = haulers.reduce((sum, creep) => {
        return sum + creep.body.filter(part => part.type === CARRY).length;
      }, 0);

      // Limit WORK parts to half of hauler CARRY capacity
      // This ensures workers don't drain faster than haulers can supply
      maxWorkParts = Math.min(maxWorkParts, Math.floor(totalCarryParts / 2));
    }
  }

  // Build balanced WORK/CARRY/MOVE sets
  const sets = Math.min(maxWorkParts, 10); // Cap at reasonable size
  const body: BodyPartConstant[] = [];

  for (let i = 0; i < sets; i++) {
    body.push(WORK, CARRY, MOVE);
  }

  // Minimum viable: at least 1 set
  return body.length > 0 ? body : [WORK, CARRY, MOVE];
}

export const RCL2Config: RCLConfig = {
  roles: {
    harvester: {
      body: generateHarvesterBody, // Dynamic body based on energy capacity
      // Scales from [WORK, MOVE] at 150 energy to [WORK×5, MOVE] at 550 energy
      // Phase 1: Drop energy near container sites for builders
      // Phase 2: Keep until extensions complete (can't afford stationary yet)
      // Phase 3: Replaced by [WORK×5, MOVE] stationary harvesters
      priority: 1, // Highest priority - energy income
      assignToSource: true, // Harvesters get assigned to sources
      behavior: {
        energySource: "harvest", // Mine from sources
        workTarget: "spawn/extensions" // Deliver to spawn/extensions (or drop if Phase 1)
      }
    },
    upgrader: {
      body: generateGeneralPurposeBody, // Dynamic body based on energy capacity
      // Scales from [WORK, CARRY, MOVE] at 200 to multiple sets as energy increases
      priority: 2, // Second priority - controller progress
      behavior: {
        energySource: "container", // Withdraw from containers ONLY (never spawn/extensions)
        workTarget: "controller" // Upgrade controller
      }
    },
    builder: {
      body: generateGeneralPurposeBody, // Dynamic body based on energy capacity
      // Scales from [WORK, CARRY, MOVE] at 200 to multiple sets as energy increases
      priority: 3, // Third priority - construction
      behavior: {
        energySource: "container", // Withdraw from containers ONLY (never spawn/extensions)
        workTarget: "construction" // Build extensions/containers/roads
        // Builder Intelligence (in builder role):
        // - Prioritizes finishing partially-built structures first
        // - Construction order: Extensions > Containers > Roads
        // - Focuses on one structure at a time until complete
      }
    },
    hauler: {
      body: generateHaulerBody, // Dynamic body based on energy capacity
      // Scales from [CARRY, MOVE] at 100 to [CARRY×6, MOVE×6] at 600 energy
      priority: 1, // High priority - critical for logistics
      assignToSource: true, // Each hauler is assigned to a specific source container
      behavior: {
        energySource: "withdraw", // Withdraw from containers
        workTarget: "logistics" // Transport to spawn/extensions
      }
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5 // Maximum efficiency: 5 work parts = 10 energy/tick (source max)
  },
  spawning: {
    enableBuilders: true, // YES builders at RCL 2 (extensions, containers, roads)
    useContainers: false // Not yet - will enable once containers built
    // TODO: Set to true once containers operational
  }
};
