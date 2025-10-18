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
export declare const rcl1Behavior: BehaviorConfig;
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
export declare const rcl2Behavior: BehaviorConfig;
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
export declare function getBehaviorConfig(rcl: number): BehaviorConfig;
/**
 * Get role configuration from the active RCL behavior
 *
 * @param rcl - The room's controller level
 * @param roleName - The role to look up
 * @returns The role config, or undefined if not found
 */
export declare function getRoleConfig(rcl: number, roleName: string): RoleConfig | undefined;
/**
 * Get all roles for an RCL, sorted by spawn priority (highest first)
 *
 * @param rcl - The room's controller level
 * @returns Array of roles sorted by priority (descending)
 */
export declare function getRolesByPriority(rcl: number): RoleConfig[];
//# sourceMappingURL=behaviors.d.ts.map