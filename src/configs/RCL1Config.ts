/**
 * RCL 1 Configuration - Ultra-Minimal Rush Strategy
 *
 * Goal: Get to RCL2 as fast as possible with minimal complexity
 *
 * Strategy:
 * 1. Spawn [WORK, WORK, MOVE] stationary harvester (250 cost) - parks on source nearest controller
 * 2. Spawn [CARRY, CARRY, MOVE] hauler (150 cost) - delivers to controller at RCL1
 * 3. Hauler makes trips: Pickup from harvester → Deliver to controller
 * 4. At 200 controller energy → RCL2 achieved
 * 5. RCL2 transition: Hauler automatically switches to spawn/extensions delivery
 *
 * Key Advantages:
 * - No role transitions needed (both spawn into final roles)
 * - Stationary harvester from start (more efficient)
 * - Container system ready from tick 1
 * - RCL2 transition is automatic (just change hauler's workTarget)
 * - Higher harvest rate (4 energy/tick vs 2)
 * - Double capacity hauler (100 vs 50)
 */

import type { RCLConfig, RoleConfig } from "./RCLConfigTypes";

export type { RCLConfig, RoleConfig };

export const RCL1Config: RCLConfig = {
  roles: {
    harvester: {
      body: [WORK, WORK, MOVE], // Cost: 250 energy - stationary harvester
      priority: 1, // Highest priority - spawn first
      assignToSource: true, // Assign to source nearest controller
      behavior: {
        energySource: "harvest", // Harvest and drop into container
        workTarget: "container" // Stationary - stays on container
      }
    },
    hauler: {
      body: [CARRY, CARRY, MOVE], // Cost: 150 energy - double capacity
      priority: 2, // Second priority - spawn after harvester
      behavior: {
        energySource: "container", // Pickup from harvester's container
        workTarget: "controller" // Deliver directly to controller at RCL1
      }
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 2 // RCL1: 1 harvester with 2 WORK = 4 energy/tick
  },
  spawning: {
    enableBuilders: false, // NO BUILDERS at RCL 1 (nothing to build except container)
    useContainers: true // Enable containers from start (harvester needs parking spot)
  }
};
