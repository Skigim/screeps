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
 * Strategy: Maintain core production team with spawn lock protection
 * - 2 Miners (largest possible bodies per source)
 * - 3 Haulers (2 per source + 1 roaming)
 * - 1 Builder (extensions → roads → controller if TTL < 5000)
 * 
 * Spawn Lock: If any critical creep (miner/hauler) drops below 250 TTL, lock spawning
 * Body Scaling: Bodies scale based on energyCapacityAvailable
 */
export const rcl2Behavior: BehaviorConfig = {
  rcl: 2,
  name: 'RCL2 Expansion',
  description: 'Core production: 2 miners + 3 haulers with spawn lock. 1 builder for extensions/roads.',
  roles: [
    {
      name: 'miner',
      priority: 100,
      targetCount: 2,
      body: [WORK, WORK, CARRY, MOVE, MOVE],
      options: { 
        scaleByCapacity: true,
        comment: 'Largest possible body per source - scales with energy capacity'
      }
    },
    {
      name: 'hauler',
      priority: 95,
      targetCount: 3,
      body: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
      options: { 
        scaleByCapacity: true,
        comment: '2 per source + 1 roaming - scales with energy capacity'
      }
    },
    {
      name: 'builder',
      priority: 80,
      targetCount: 1,
      body: [WORK, CARRY, MOVE],
      options: { 
        comment: 'Priority: extensions → roads → controller (if TTL < 5000)',
        spawnLocked: true
      }
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
