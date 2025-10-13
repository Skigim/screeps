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

export interface RoleConfig {
  body: BodyPartConstant[];
  priority: number;
  assignToSource?: boolean; // Whether this role should be assigned to sources
  behavior?: {
    energySource?: "harvest" | "withdraw"; // How the role gets energy
    workTarget?: string; // What the role works on
  };
}

export interface RCLConfig {
  roles: {
    [roleName: string]: RoleConfig;
  };
  sourceAssignment: {
    maxWorkPartsPerSource: number; // Maximum work parts allowed per source
  };
  spawning: {
    enableBuilders: boolean; // Whether builders should spawn at this RCL
    useContainers: boolean; // Whether to use container-based logistics
  };
}

export const RCL2Config: RCLConfig = {
  roles: {
    harvester: {
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - basic for transition
      // TODO: Upgrade to [WORK×5, MOVE] once containers are built
      priority: 1, // Highest priority - energy income
      assignToSource: true, // Harvesters get assigned to sources
      behavior: {
        energySource: "harvest", // Mine from sources
        workTarget: "spawn/extensions" // Deliver to spawn/extensions
        // TODO: Change to "container" once containers built
      }
    },
    upgrader: {
      body: [WORK, CARRY, MOVE], // Cost: 200 energy
      // TODO: Scale up with more WORK parts once energy available
      priority: 2, // Second priority - controller progress
      behavior: {
        energySource: "withdraw", // Withdraw from spawn/extensions
        workTarget: "controller" // Upgrade controller
      }
    },
    builder: {
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - dedicated builder
      priority: 3, // Third priority - construction
      behavior: {
        energySource: "withdraw", // Withdraw from spawn/extensions
        workTarget: "construction" // Build extensions/containers/roads
        // Builder Intelligence (in builder role):
        // - Prioritizes finishing partially-built structures first
        // - Construction order: Extensions > Containers > Roads
        // - Focuses on one structure at a time until complete
      }
    }
    // TODO: Add "hauler" role once containers are operational
    // hauler: { body: [CARRY×3, MOVE×3], priority: 1, behavior: { energySource: "container", workTarget: "logistics" } }
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
