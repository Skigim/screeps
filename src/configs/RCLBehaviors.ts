/**
 * RCL Configuration - Behavior Only (No Hard-Coded Targets)
 * Defines HOW roles behave, not HOW MANY to spawn
 */

export interface RoleBehavior {
  assignToSource?: boolean; // Whether this role needs source assignment
  energySource?: "harvest" | "withdraw"; // How the role gets energy
  workTarget?: string; // What the role works on
}

export interface RCLBehaviorConfig {
  roles: {
    [roleName: string]: RoleBehavior;
  };
  sourceAssignment: {
    maxWorkPartsPerSource: number; // Maximum work parts allowed per source
  };
  spawning: {
    enableBuilders: boolean; // Whether builders can spawn at this RCL
  };
}

export const RCL1Behavior: RCLBehaviorConfig = {
  roles: {
    harvester: {
      assignToSource: true,
      energySource: "harvest",
      workTarget: "spawn/extensions"
    },
    upgrader: {
      energySource: "withdraw",
      workTarget: "controller"
    }
    // No builder behavior - builders won't spawn at RCL 1
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5 // Perfect efficiency
  },
  spawning: {
    enableBuilders: false // No builders at RCL 1
  }
};

export const RCL2Behavior: RCLBehaviorConfig = {
  roles: {
    harvester: {
      assignToSource: true,
      energySource: "harvest",
      workTarget: "spawn/extensions"
    },
    upgrader: {
      energySource: "withdraw",
      workTarget: "controller"
    },
    builder: {
      energySource: "withdraw",
      workTarget: "construction"
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5
  },
  spawning: {
    enableBuilders: true // Builders enabled at RCL 2
  }
};
