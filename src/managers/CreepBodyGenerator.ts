/**
 * CreepBodyGenerator
 *
 * Single Responsibility: Generate creep body parts based on role and available energy
 *
 * Input: RCLConfig, role name, energy capacity, room (optional for context)
 * Output: Array of body parts
 *
 * This module is pure logic - it doesn't read from Game objects directly,
 * only from the data passed to it.
 */

import type { RCLConfig } from "configs/RCL1Config";

export class CreepBodyGenerator {
  /**
   * Generate body parts for a specific role
   * @param config - The RCL configuration containing role definitions
   * @param role - The role name (harvester, hauler, upgrader, builder)
   * @param energyCapacity - The energy capacity to use for body generation
   * @param room - Optional room reference for context-aware generation
   * @returns Array of body parts
   */
  public static generate(
    config: RCLConfig,
    role: string,
    energyCapacity: number,
    room?: Room
  ): BodyPartConstant[] {
    const roleConfig = config.roles[role];

    if (!roleConfig) {
      console.log(`⚠️ No role config found for ${role}`);
      return [WORK, CARRY, MOVE]; // Fallback to basic body
    }

    // Check if body is dynamic (function) or static (array)
    if (typeof roleConfig.body === 'function') {
      // Dynamic body generation - pass energy capacity and optional room
      return roleConfig.body(energyCapacity, room);
    } else if (Array.isArray(roleConfig.body)) {
      // Static body array
      return roleConfig.body;
    }

    // Fallback
    console.log(`⚠️ Invalid body config for ${role}`);
    return [WORK, CARRY, MOVE];
  }

  /**
   * Calculate the cost of a body
   * @param body - Array of body parts
   * @returns Total energy cost
   */
  public static calculateCost(body: BodyPartConstant[]): number {
    return body.reduce((sum, part) => {
      return sum + BODYPART_COST[part];
    }, 0);
  }

  /**
   * Validate that a body is legal (max 50 parts, valid composition)
   * @param body - Array of body parts
   * @returns true if valid, false otherwise
   */
  public static isValid(body: BodyPartConstant[]): boolean {
    if (body.length === 0 || body.length > MAX_CREEP_SIZE) {
      return false;
    }

    // Must have at least one MOVE part
    if (!body.includes(MOVE)) {
      return false;
    }

    return true;
  }
}
