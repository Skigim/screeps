/**
 * CREEP BEHAVIOR CONFIGURATION SYSTEM
 * 
 * This module defines creep behaviors for each RCL level.
 * Each RCL can have different strategies, spawning priorities, and role distributions.
 * 
 * Architecture:
 * - BehaviorConfig: Defines what roles exist at an RCL and their spawn priorities
 * - rclBehaviors: Maps RCL level → BehaviorConfig
 * - getBehaviorConfig: Gets the active config for a room's current RCL
 */

/**
 * Configuration for a creep role
 */
export interface RoleConfig {
  /** Name of the role (harvester, builder, upgrader, etc.) */
  name: string;
  
  /** Priority for spawning (higher = spawn first). Range: 0-100 */
  priority: number;
  
  /** Desired number of this role in the room */
  targetCount: number;
  
  /** Body to spawn this creep with (part array) */
  body: BodyPartConstant[];
  
  /** Optional: Special behavior flags or options */
  options?: Record<string, any>;
}

/**
 * Complete behavior configuration for an RCL level
 */
export interface BehaviorConfig {
  rcl: number;
  name: string;
  description: string;
  roles: RoleConfig[];
}

/**
 * RCL1 Behavior Configuration
 * 
 * At RCL1, we focus on the core economy:
 * - Miners: Gather energy from sources
 * - Upgraders: Keep controller from downgrading
 * - Builders: Build towards extensions for RCL2
 * 
 * Note: No spawning/extensions yet, so minimal infrastructure.
 */
export const rcl1Behavior: BehaviorConfig = {
  rcl: 1,
  name: 'RCL1 Foundation',
  description: 'Core economy: mine, upgrade, build',
  roles: [
    {
      name: 'miner',
      priority: 100,
      targetCount: 2,
      body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
      options: { comment: 'Dual work parts for faster mining' }
    },
    {
      name: 'upgrader',
      priority: 90,
      targetCount: 1,
      body: [WORK, CARRY, MOVE],
      options: { comment: 'Keep controller from downgrading' }
    },
    {
      name: 'builder',
      priority: 80,
      targetCount: 1,
      body: [WORK, CARRY, MOVE],
      options: { comment: 'Build extensions for RCL2' }
    }
  ]
};

/**
 * RCL2 Behavior Configuration
 * 
 * At RCL2, we unlock extensions and expand capacity.
 * Uses flexible miner bodies and dedicated haulers.
 * 
 * Miner body strategy:
 * - With NO CARRY parts (e.g., WORK/WORK/MOVE): Acts as stationary miner
 *   Can be assigned to a specific source via task system
 *   Mines continuously without moving energy
 * - With CARRY parts (e.g., WORK/WORK/CARRY/MOVE): Mobile miner
 *   Can roam between sources or be task-assigned
 *   Delivers energy to spawn/extensions
 */
export const rcl2Behavior: BehaviorConfig = {
  rcl: 2,
  name: 'RCL2 Expansion',
  description: 'With extensions: flexible miners and specialized support roles',
  roles: [
    {
      name: 'miner',
      priority: 100,
      targetCount: 2,
      body: [WORK, WORK, WORK, CARRY, MOVE, MOVE],
      options: { comment: 'Flexible miner - roams or tasks to specific source' }
    },
    {
      name: 'hauler',
      priority: 90,
      targetCount: 2,
      body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
      options: { comment: 'Dedicated energy transport specialist' }
    },
    {
      name: 'builder',
      priority: 85,
      targetCount: 2,
      body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
      options: { comment: 'Construction specialist' }
    },
    {
      name: 'upgrader',
      priority: 80,
      targetCount: 2,
      body: [WORK, WORK, WORK, CARRY, MOVE],
      options: { comment: 'Fast controller upgrade' }
    }
  ]
};

/**
 * Map of RCL level to behavior configuration
 */
const rclBehaviors: Record<number, BehaviorConfig> = {
  1: rcl1Behavior,
  2: rcl2Behavior
};

/**
 * Get the behavior configuration for a room's current RCL
 * 
 * @param rcl - The room's controller level
 * @returns The behavior config for this RCL, or RCL1 as fallback
 * 
 * @example
 * ```typescript
 * const config = getBehaviorConfig(room.controller!.level);
 * const harvesters = config.roles.filter(r => r.name === 'harvester');
 * ```
 */
export function getBehaviorConfig(rcl: number): BehaviorConfig {
  return rclBehaviors[rcl] || rclBehaviors[1];
}

/**
 * Get role configuration from the active RCL behavior
 * 
 * @param rcl - The room's controller level
 * @param roleName - The role to look up
 * @returns The role config, or undefined if not found
 */
export function getRoleConfig(rcl: number, roleName: string): RoleConfig | undefined {
  const config = getBehaviorConfig(rcl);
  return config.roles.find(r => r.name === roleName);
}

/**
 * Get all roles for an RCL, sorted by spawn priority (highest first)
 * 
 * @param rcl - The room's controller level
 * @returns Array of roles sorted by priority (descending)
 */
export function getRolesByPriority(rcl: number): RoleConfig[] {
  const config = getBehaviorConfig(rcl);
  return [...config.roles].sort((a, b) => b.priority - a.priority);
}
