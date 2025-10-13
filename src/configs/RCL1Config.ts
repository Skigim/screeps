/**
 * RCL 1 Configuration
 * Defines behaviors, body compositions, and strategic guidelines for RCL 1
 *
 * Strategy (from documentation):
 * Phase 1 (Bootstrap): Spawn first generalist [WORK, CARRY, MOVE]
 * Phase 2 (Stabilization): Build assembly line with 2-3 harvesters, 1-2 upgraders
 * Phase 3 (The Push): Maintain economy and upgrade to RCL 2
 *
 * Key Principles:
 * - DO NOT BUILD (no structures available at RCL 1)
 * - Specialists only (harvesters harvest, upgraders upgrade)
 * - Simple assembly line: Harvesters -> Spawn -> Upgraders -> Controller
 */

export interface RoleConfig {
  body: BodyPartConstant[] | ((energyCapacity: number) => BodyPartConstant[]);
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

export const RCL1Config: RCLConfig = {
  roles: {
    harvester: {
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - basic generalist
      priority: 1, // Highest priority - energy income
      assignToSource: true, // Harvesters get assigned to sources
      behavior: {
        energySource: "harvest", // Mine directly from sources
        workTarget: "spawn/extensions" // Deliver to spawn
      }
    },
    upgrader: {
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - basic generalist
      priority: 2, // Second priority - controller progress
      behavior: {
        energySource: "withdraw", // Withdraw from spawn (assembly line)
        workTarget: "controller" // Upgrade controller
      }
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5 // RCL1: 5 work parts = 10 energy/tick (source max)
  },
  spawning: {
    enableBuilders: false, // NO BUILDERS at RCL 1 (nothing to build)
    useContainers: false // No containers available yet
  }
};
