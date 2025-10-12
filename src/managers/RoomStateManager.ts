import { RCL1Config } from "configs/RCL1Config";
import type { RCLConfig } from "configs/RCL1Config";
import { SpawnManager } from "./SpawnManager";
import { AssignmentManager } from "./AssignmentManager";

/**
 * Room State Manager - RCL-based state machine
 * Orchestrates all room-level managers based on RCL configuration
 */
export class RoomStateManager {
  // Map of RCL configs (centralized here instead of SpawnManager)
  private static readonly RCL_CONFIGS: { [rcl: number]: RCLConfig } = {
    1: RCL1Config
    // TODO: Add RCL 2-8 configs as we progress
  };

  // Cache configs by room name for creep access
  private static roomConfigs: Map<string, RCLConfig> = new Map();

  /**
   * Main state machine - runs all managers for a room
   */
  public static run(room: Room): void {
    if (!room.controller || !room.controller.my) return;

    const config = this.getConfigForRoom(room);
    if (!config) {
      console.log(`⚠️ No config available for room ${room.name}`);
      return;
    }

    // Cache config for creeps to access
    this.roomConfigs.set(room.name, config);

    // Get primary spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;
    const spawn = spawns[0];

    // Run spawn manager
    SpawnManager.run(spawn, config);

    // Run assignment manager
    AssignmentManager.run(room, config);

    // Display status periodically
    if (Game.time % 50 === 0) {
      this.displayRoomStatus(room, config);
    }
  }

  /**
   * Get config for a room based on its RCL
   */
  public static getConfigForRoom(room: Room): RCLConfig | null {
    if (!room.controller) return null;
    return this.getConfigForRCL(room.controller.level);
  }

  /**
   * Get cached config for a creep's room
   */
  public static getConfigForCreep(creep: Creep): RCLConfig | null {
    return this.roomConfigs.get(creep.room.name) || null;
  }

  /**
   * Get config for a specific RCL, with fallback to highest available RCL config
   */
  private static getConfigForRCL(rcl: number): RCLConfig | null {
    // Try exact RCL match first
    if (this.RCL_CONFIGS[rcl]) {
      return this.RCL_CONFIGS[rcl];
    }

    // Fallback: Find highest available config that's less than or equal to current RCL
    const availableRCLs = Object.keys(this.RCL_CONFIGS)
      .map(Number)
      .filter(configRcl => configRcl <= rcl)
      .sort((a, b) => b - a); // Sort descending

    if (availableRCLs.length > 0) {
      const fallbackRCL = availableRCLs[0];
      if (Game.time % 100 === 0) {
        console.log(`ℹ️ Room ${Game.rooms[Object.keys(Game.rooms)[0]].name}: Using RCL ${fallbackRCL} config for RCL ${rcl} (fallback)`);
      }
      return this.RCL_CONFIGS[fallbackRCL];
    }

    return null;
  }

  /**
   * Display consolidated room status
   */
  private static displayRoomStatus(room: Room, config: RCLConfig): void {
    console.log(`\n╔═══════════════════════════════════════════╗`);
    console.log(`║ Room Status: ${room.name.padEnd(28)} ║`);
    console.log(`╠═══════════════════════════════════════════╣`);
    console.log(`║ RCL: ${room.controller?.level || 0} | Progress: ${room.controller?.progress}/${room.controller?.progressTotal}`.padEnd(44) + '║');
    console.log(`║ Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`.padEnd(44) + '║');
    console.log(`╚═══════════════════════════════════════════╝`);

    AssignmentManager.displayAssignments(room, config);
  }
}
