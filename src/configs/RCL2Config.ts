/**
 * RCL 2 Configuration
 * Defines spawn targets and body configurations for RCL 2
 *
 * Strategy:
 * - Increased harvester capacity with larger bodies
 * - More upgraders to push to RCL 3
 * - Builders now active for construction sites
 */

export interface RoleConfig {
  target: number;
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
}

export const RCL2Config: RCLConfig = {
  roles: {
    harvester: {
      target: 4,
      body: [WORK, CARRY, MOVE], // Cost: 200 energy - will tune later
      priority: 1, // Highest priority - energy income
      assignToSource: true, // Harvesters get assigned to sources
      behavior: {
        energySource: "harvest",
        workTarget: "spawn/extensions"
      }
    },
    upgrader: {
      target: 3,
      body: [WORK, CARRY, MOVE], // Cost: 200 energy
      priority: 2, // Second priority - controller progress
      behavior: {
        energySource: "withdraw", // Upgraders withdraw from spawn/extensions
        workTarget: "controller"
      }
    },
    builder: {
      target: 2,
      body: [WORK, CARRY, MOVE], // Cost: 200 energy
      priority: 3, // Third priority - construction
      behavior: {
        energySource: "withdraw", // Builders withdraw from spawn/extensions
        workTarget: "construction"
      }
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5 // Maximum efficiency: 5 work parts = 10 energy/tick (source regen rate)
  }
};
