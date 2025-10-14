import { RCL1Config } from "configs/RCL1Config";
import { RCL2Config } from "configs/RCL2Config";
import type { RCLConfig } from "configs/RCL1Config";
import { SpawnManager } from "./SpawnManager";
import { AssignmentManager } from "./AssignmentManager";
import { Architect } from "./Architect";
import { ProgressionManager, RCL2Phase, type ProgressionState } from "./ProgressionManager";
import { StatsTracker } from "./StatsTracker";

/**
 * Room State Manager - Tactical Executor
 *
 * Receives analyzed state from ProgressionManager and executes room operations
 *
 * Responsibilities:
 * 1. Get RCL config
 * 2. Execute managers (Spawn, Assignment, Architect)
 * 3. Display status
 *
 * This manager is the "executor" that carries out tasks based on the
 * progression state determined by ProgressionManager.
 */
export class RoomStateManager {
  // Map of RCL configs (centralized here instead of SpawnManager)
  private static readonly RCL_CONFIGS: { [rcl: number]: RCLConfig } = {
    1: RCL1Config,
    2: RCL2Config
    // TODO: Add RCL 3-8 configs as we progress
  };

  // Cache configs by room name for creep access
  private static roomConfigs: Map<string, RCLConfig> = new Map();

  // Cache progression states for each room (for creep access)
  private static progressionStates: Map<string, ProgressionState | null> = new Map();

  /**
   * Main executor - runs all managers for a room
   * @param room - The room to manage
   * @param progressionState - The progression state (passed from ProgressionManager, may be null for RCL1)
   */
  public static run(room: Room, progressionState: ProgressionState | null): void {
    if (!room.controller || !room.controller.my) return;

    const config = this.getConfigForRoom(room);
    if (!config) {
      console.log(`⚠️ No config available for room ${room.name}`);
      return;
    }

    // Cache config and state for creeps to access
    this.roomConfigs.set(room.name, config);
    this.progressionStates.set(room.name, progressionState);

    // Get primary spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;
    const spawn = spawns[0];

    // Run spawn manager - PASS DATA DOWN (config + progressionState)
    SpawnManager.run(spawn, config, progressionState);

    // Run assignment manager
    AssignmentManager.run(room, config);

    // Run architect (automatic infrastructure planning)
    Architect.run(room);

    // Display status periodically
    if (Game.time % 50 === 0) {
      this.displayRoomStatus(room, config);
    }
  }

  /**
   * Get cached progression state for a room
   */
  public static getProgressionState(roomName: string): ProgressionState | null {
    return this.progressionStates.get(roomName) || null;
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
