/**
 * RCL 1 Configuration - Ultra-Minimal Rush Strategy
 *
 * Goal: Get to RCL2 as fast as possible with minimal complexity
 *
 * Strategy:
 * 1. Spawn [WORK, WORK, MOVE] stationary harvester (250 cost) - parks on source nearest controller
 * 2. Spawn [WORK, CARRY, MOVE] hauler (200 cost) - upgrades controller at RCL1
 * 3. Hauler makes trips: Pickup from harvester → Upgrade controller
 * 4. At 200 controller energy → RCL2 achieved
 * 5. RCL2 transition: Hauler automatically switches to spawn/extensions delivery
 *
 * Key Advantages:
 * - No role transitions needed (both spawn into final roles)
 * - Stationary harvester from start (more efficient)
 * - Container system ready from tick 1
 * - RCL2 transition is automatic (just change hauler's workTarget)
 * - Higher harvest rate (4 energy/tick vs 2)
 * - Balanced hauler can both transport and upgrade
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
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - can upgrade controller
      priority: 2, // Second priority - spawn after harvester
      behavior: {
        energySource: "container", // Pickup from harvester's container
        workTarget: "controller" // Upgrade controller at RCL1 (needs WORK part)
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
