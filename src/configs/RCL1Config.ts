/**
 * RCL 1 Configuration
 * Defines spawn targets and body configurations for RCL 1
 *
 * Strategy:
 * Phase 1 (Bootstrap): Spawn first generalist
 * Phase 2 (Stabilization): Spawn 2-3 harvesters, then 1-2 upgraders
 * Phase 3 (The Push): Maintain economy and upgrade to RCL 2
 */

export interface RoleConfig {
  target: number;
  body: BodyPartConstant[];
  priority: number;
}

export interface RCLConfig {
  roles: {
    [roleName: string]: RoleConfig;
  };
}

export const RCL1Config: RCLConfig = {
  roles: {
    harvester: {
      target: 3,
      body: [WORK, CARRY, MOVE], // Cost: 200 energy
      priority: 1 // Highest priority - energy income
    },
    upgrader: {
      target: 2,
      body: [WORK, CARRY, MOVE], // Cost: 200 energy
      priority: 2 // Second priority - controller progress
    }
  }
};
