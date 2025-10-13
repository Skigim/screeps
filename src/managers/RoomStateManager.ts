import { RCL1Config } from "configs/RCL1Config";
import { RCL2Config } from "configs/RCL2Config";
import type { RCLConfig } from "configs/RCL1Config";
import { SpawnManager } from "./SpawnManager";
import { AssignmentManager } from "./AssignmentManager";
import { Architect } from "./Architect";
import { ProgressionManager, type ProgressionState } from "./ProgressionManager";
import { StatsTracker } from "./StatsTracker";

/**
 * Room State Manager - RCL-based state machine
 * Orchestrates all room-level managers based on RCL configuration
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

  // Track if room plan has been executed (one-time planning per RCL)
  private static roomPlansExecuted: Map<string, number> = new Map(); // roomName -> RCL when last planned

  // Cache progression states for each room
  private static progressionStates: Map<string, ProgressionState> = new Map();

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

    // Detect and cache progression state (RCL 2+)
    const rcl = room.controller.level;
    let progressionState: ProgressionState | undefined;
    if (rcl >= 2) {
      progressionState = ProgressionManager.detectRCL2State(room);
      this.progressionStates.set(room.name, progressionState);

      // Initialize stats tracking on first run
      StatsTracker.initializeRoom(room.name);

      // Track phase transitions
      const stats = Memory.progressionStats?.[room.name];
      if (stats && stats.currentPhase !== progressionState.phase) {
        StatsTracker.recordPhaseTransition(room.name, progressionState.phase);
      }

      // Record milestones and take snapshots
      StatsTracker.recordMilestones(room, progressionState);
      StatsTracker.takeSnapshot(room, progressionState);
    }

    // Get primary spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;
    const spawn = spawns[0];

    // Run spawn manager (demand-based, no config needed)
    SpawnManager.run(spawn);

    // Run assignment manager
    AssignmentManager.run(room, config);

    // Run architect (automatic infrastructure planning)
    this.runArchitect(room);

    // Display status periodically
    if (Game.time % 50 === 0) {
      this.displayRoomStatus(room, config);

      // Display progression status for RCL 2+
      if (progressionState) {
        ProgressionManager.displayStatus(room, progressionState);
      }
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
   * Run architect to plan and build infrastructure
   */
  private static runArchitect(room: Room): void {
    if (!room.controller) return;

    const rcl = room.controller.level;
    const roomKey = room.name;
    const lastPlannedRCL = this.roomPlansExecuted.get(roomKey);

    // Only plan once per RCL (when RCL changes or first time)
    if (lastPlannedRCL !== rcl && rcl >= 2) {
      console.log(`📐 Architect: Planning infrastructure for ${room.name} (RCL ${rcl})`);

      const plan = Architect.planRoom(room);
      Architect.executePlan(room, plan);

      // Mark this RCL as planned
      this.roomPlansExecuted.set(roomKey, rcl);

      // Visualize plan (optional - can disable in production)
      if (Game.time % 10 === 0) {
        Architect.visualizePlan(room, plan);
      }
    }
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
