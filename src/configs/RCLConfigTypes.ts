/**
 * Shared types for all RCL configurations
 * Import these types in RCL1Config.ts, RCL2Config.ts, etc.
 */

/**
 * Role configuration for a specific creep role
 */
export interface RoleConfig {
  body: BodyPartConstant[] | ((energyCapacity: number, room?: Room) => BodyPartConstant[]);
  priority: number;
  assignToSource?: boolean; // Whether this role should be assigned to sources
  behavior?: {
    energySource?: "harvest" | "withdraw" | "container"; // How the role gets energy
    workTarget?: string; // What the role works on
  };
}

/**
 * Configuration for a specific RCL level
 */
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
