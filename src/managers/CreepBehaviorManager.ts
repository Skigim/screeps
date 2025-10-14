/**
 * CreepBehaviorManager
 *
 * Single Responsibility: Define initial creep memory based on role and room state
 *
 * Input: Role name, progression state, room name
 * Output: Initial memory object for creep
 *
 * This module determines what memory flags a new creep should start with,
 * but doesn't perform any Game object reads - only uses passed data.
 */

import type { ProgressionState } from "./ProgressionManager";

export class CreepBehaviorManager {
  /**
   * Get initial memory for a newly spawned creep
   * @param role - The role name (harvester, hauler, upgrader, builder)
   * @param roomName - The room the creep is spawning in
   * @param progressionState - Current progression state (may be null for RCL1)
   * @returns Initial memory object
   */
  public static getInitialMemory(
    role: string,
    roomName: string,
    progressionState: ProgressionState | null
  ): CreepMemory {
    const baseMemory: CreepMemory = {
      role: role as any,
      room: roomName,
      working: false,
      task: null // Required by creep-tasks library
    };

    // Role-specific memory initialization
    switch (role) {
      case "harvester":
        // Harvesters need source assignment (handled by AssignmentManager after spawn)
        // No additional initial flags needed
        break;

      case "hauler":
        // Haulers start not working (will pick up energy first)
        // Source assignment handled by AssignmentManager after spawn
        baseMemory.canTransport = true; // Default to true, TrafficManager may set false
        break;

      case "upgrader":
        // Upgraders start not working (will pick up energy first)
        break;

      case "builder":
        // Builders start not working (will pick up energy first)
        break;

      default:
        console.log(`⚠️ Unknown role for initial memory: ${role}`);
    }

    return baseMemory;
  }

  /**
   * Determine if a role should start in "working" state
   * @param role - The role name
   * @returns true if creep should start working, false if it should gather energy first
   */
  public static shouldStartWorking(role: string): boolean {
    // Most roles start by gathering energy
    // Only harvesters might start working immediately if they spawn next to a source
    return role === "harvester";
  }
}
