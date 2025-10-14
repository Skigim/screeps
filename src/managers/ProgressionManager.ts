/**
 * Progression Manager - Strategic Orchestrator
 *
 * PRIMARY ENTRY POINT for each room's tick
 *
 * Responsibilities:
 * 1. Analyze room state and determine progression phase
 * 2. Pass analysis down to RoomStateManager for execution
 *
 * This manager is the "brain" that decides what phase the room is in,
 * then delegates the execution to RoomStateManager.
 *
 * Phase detection is data-driven based on actual room state:
 * - Structure completion
 * - Container operational status
 * - Creep composition readiness
 *
 * RCL 2 Progression Plan (OPTIMIZED):
 * Phase 1: Build source containers (mobile harvesters with drop mining, fast build)
 * Phase 2: Build extensions (haulers bring energy from containers, no walk time)
 * Phase 3: Build road network (stationary harvesters + full logistics)
 * Phase 4: Build controller container (convert builders to upgraders)
 */

import { RoomStateManager } from "./RoomStateManager";
import { StatsTracker } from "./StatsTracker";

export enum RCL2Phase {
  PHASE_1_CONTAINERS = "phase1_containers",      // Building source containers, drop mining
  PHASE_2_EXTENSIONS = "phase2_extensions",      // Building extensions, haulers active
  PHASE_3_ROADS = "phase3_roads",                // Building road network, stationary harvesters
  PHASE_4_CONTROLLER = "phase4_controller",      // Building controller container
  COMPLETE = "complete"                          // RCL 2 progression complete
}

export interface ProgressionState {
  phase: RCL2Phase;
  containersOperational: boolean;
  extensionsComplete: boolean;
  sourceContainersBuilt: number;
  controllerContainerBuilt: boolean;
  destContainerId: Id<StructureContainer> | null; // Spawn-adjacent destination container for builders/upgraders
  roadsComplete: boolean;
  useStationaryHarvesters: boolean;
  useHaulers: boolean;
  allowRCL1Bodies: boolean; // Allow RCL1 bodies to exist (Phase 1 only)
}

export class ProgressionManager {
  /**
   * MAIN ORCHESTRATOR - Entry point for each room's tick
   *
   * Analyzes room state, determines progression phase,
   * then delegates execution to RoomStateManager
   */
  public static run(room: Room): void {
    if (!room.controller || !room.controller.my) return;

    const rcl = room.controller.level;

    // RCL1: No progression state, just pass null to RoomStateManager
    if (rcl === 1) {
      RoomStateManager.run(room, null);
      return;
    }

    // RCL2+: Analyze progression state
    const progressionState = this.detectRCL2State(room);

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

    // Convert upgraders to builders during Phase 1-3 (prevent source congestion)
    if (progressionState.phase === RCL2Phase.PHASE_1_CONTAINERS ||
        progressionState.phase === RCL2Phase.PHASE_2_EXTENSIONS ||
        progressionState.phase === RCL2Phase.PHASE_3_ROADS) {
      this.convertUpgradersToBuilders(room);
    }

    // Convert builders back to upgraders in Phase 4+ (infrastructure complete)
    if (progressionState.phase === RCL2Phase.COMPLETE) {
      this.convertBuildersToUpgraders(room);
    }

    // Display progression status periodically
    if (Game.time % 50 === 0) {
      this.displayStatus(room, progressionState);
    }

    // Delegate execution to RoomStateManager
    RoomStateManager.run(room, progressionState);
  }

  /**
   * Convert upgraders to builders when construction is needed
   * NO UPGRADERS during Phase 1-3 to prevent source traffic congestion
   * Returns number of creeps converted
   */
  public static convertUpgradersToBuilders(room: Room): number {
    // Find all upgraders in the room
    const upgraders = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "upgrader"
    });

    if (upgraders.length === 0) {
      return 0; // No upgraders to convert
    }

    // CRITICAL: Always keep at least 1 upgrader to prevent controller downgrade!
    if (upgraders.length === 1) {
      return 0; // Don't convert the last upgrader
    }

    // Convert all upgraders EXCEPT ONE to builders
    let converted = 0;
    for (let i = 0; i < upgraders.length - 1; i++) {
      const creep = upgraders[i];
      creep.memory.role = "builder";
      converted++;
    }

    if (converted > 0) {
      console.log(`🔄 Converted ${converted} upgrader(s) to builders (kept 1 to prevent downgrade)`);
    }

    return converted;
  }

  /**
   * Convert builders back to upgraders when infrastructure is complete (Phase 4)
   * Returns number of creeps converted
   */
  public static convertBuildersToUpgraders(room: Room): number {
    // Only convert if there are no construction sites
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      return 0; // Still building
    }

    // Find all builders in the room
    const builders = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "builder"
    });

    if (builders.length === 0) {
      return 0; // No builders to convert
    }

    // Convert all builders to upgraders
    let converted = 0;
    for (const creep of builders) {
      creep.memory.role = "upgrader";
      converted++;
    }

    if (converted > 0) {
      console.log(`🔄 Converted ${converted} builder(s) to upgraders (infrastructure complete)`);
    }

    return converted;
  }

  /**
   * Detect current progression state for RCL 2
   */
  public static detectRCL2State(room: Room): ProgressionState {
    const state: ProgressionState = {
      phase: RCL2Phase.PHASE_1_CONTAINERS,
      containersOperational: false,
      extensionsComplete: false,
      sourceContainersBuilt: 0,
      controllerContainerBuilt: false,
      destContainerId: null, // Will be set below if found
      roadsComplete: false,
      useStationaryHarvesters: true, // Default to true (drop mining from Phase 1)
      useHaulers: false,
      allowRCL1Bodies: true
    };

    // Count infrastructure
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_EXTENSION
    });

    const containers = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    const roads = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_ROAD
    });

    const roadSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: s => s.structureType === STRUCTURE_ROAD
    });

    const sources = room.find(FIND_SOURCES);
    const controller = room.controller;

    // Check extension completion (RCL 2 = 5 extensions)
    state.extensionsComplete = extensions.length >= 5;

    // Check source containers
    for (const source of sources) {
      const nearbyContainers = source.pos.findInRange(containers, 1);
      if (nearbyContainers.length > 0) {
        state.sourceContainersBuilt++;
      }
    }

    // Check controller container
    if (controller) {
      const nearbyContainers = controller.pos.findInRange(containers, 3);
      state.controllerContainerBuilt = nearbyContainers.length > 0;
    }

    // Check for destination container (spawn-adjacent container for builders/upgraders)
    const spawns = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_SPAWN
    });

    if (spawns.length > 0) {
      const spawn = spawns[0];
      const nearbyContainers = spawn.pos.findInRange(containers, 2) as StructureContainer[];

      if (nearbyContainers.length > 0) {
        // Prefer container closest to spawn
        const destContainer = spawn.pos.findClosestByRange(nearbyContainers);
        state.destContainerId = destContainer ? destContainer.id : null;
      } else {
        state.destContainerId = null;
      }
    } else {
      state.destContainerId = null;
    }

    // Check if roads are complete (no road construction sites remaining)
    state.roadsComplete = roadSites.length === 0 && roads.length > 0;

    // Determine if containers are operational (at least 1 source container built)
    state.containersOperational = state.sourceContainersBuilt > 0;

    // Phase detection logic (NEW ORDER: Containers → Extensions → Roads → Controller)
    if (state.sourceContainersBuilt < sources.length) {
      // Phase 1: Building source containers
      // - Harvesters: [WORK, WORK, MOVE] = 250 energy (stationary drop mining)
      // - Upgraders/Builders: Keep RCL1 bodies [WORK, CARRY, MOVE] (cheap 200 energy)
      // - Drop energy near container sites for builders
      // - NO regular upgraders (prevent source congestion, only fallback)
      // - NO haulers yet (nothing to haul from)
      state.phase = RCL2Phase.PHASE_1_CONTAINERS;
      state.useStationaryHarvesters = true; // Stationary drop mining from start
      state.useHaulers = false;
      state.allowRCL1Bodies = true; // Upgraders/builders use cheap RCL1 bodies
    } else if (!state.extensionsComplete) {
      // Phase 2: Building extensions
      // - Source containers complete → Enable hauler spawning
      // - Haulers spawn per-source as each source gets a harvester (sequential activation)
      // - SpawnRequestGenerator handles per-source readiness checks
      state.phase = RCL2Phase.PHASE_2_EXTENSIONS;
      state.useStationaryHarvesters = true; // All harvesters become stationary drop miners
      state.useHaulers = true; // Enable hauler spawning (per-source activation handled by spawn logic)
      state.allowRCL1Bodies = true; // Keep cheap bodies during extension construction
    } else if (!state.roadsComplete) {
      // Phase 3: Building road network
      // - All 5 extensions complete → 550 energy available
      // - NOW spawn stationary harvesters [WORK×5, MOVE]
      // - Full hauler logistics operational
      // - Build road network
      state.phase = RCL2Phase.PHASE_3_ROADS;
      state.useStationaryHarvesters = true; // Extensions complete = 550 energy available
      state.useHaulers = true;
      state.allowRCL1Bodies = false;
    } else if (!state.controllerContainerBuilt) {
      // Phase 4: Building controller container
      // - Road network complete
      // - Building controller container
      state.phase = RCL2Phase.PHASE_4_CONTROLLER;
      state.useStationaryHarvesters = true;
      state.useHaulers = true;
      state.allowRCL1Bodies = false;
    } else {
      // Complete: All infrastructure built
      state.phase = RCL2Phase.COMPLETE;
      state.useStationaryHarvesters = true;
      state.useHaulers = true;
      state.containersOperational = true;
      state.allowRCL1Bodies = false;
    }

    return state;
  }

  /**
   * Check if at least one extension is built (triggers harvester filling)
   */
  public static hasAnyExtensions(room: Room): boolean {
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_EXTENSION
    });
    return extensions.length > 0;
  }

  /**
   * Get container under construction sites for stationary harvester targeting
   */
  public static getContainerConstructionSites(room: Room): ConstructionSite[] {
    return room.find(FIND_CONSTRUCTION_SITES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });
  }

  /**
   * Find the next source container construction site to work on
   * Prioritizes sources closest to spawn
   */
  public static getNextSourceContainerSite(room: Room): ConstructionSite | null {
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return null;

    const containerSites = this.getContainerConstructionSites(room);
    const sources = room.find(FIND_SOURCES);

    // Find container sites near sources
    const sourceContainerSites: Array<{ site: ConstructionSite; distance: number }> = [];

    for (const site of containerSites) {
      for (const source of sources) {
        if (site.pos.inRangeTo(source.pos, 1)) {
          const distance = spawn.pos.getRangeTo(site.pos);
          sourceContainerSites.push({ site, distance });
          break;
        }
      }
    }

    // Sort by distance from spawn (closest first)
    sourceContainerSites.sort((a, b) => a.distance - b.distance);

    return sourceContainerSites[0]?.site || null;
  }

  /**
   * Display progression status
   */
  public static displayStatus(room: Room, state: ProgressionState): void {
    console.log(`\n╔═════════════════════════════════════════╗`);
    console.log(`║ RCL 2 Progression Status                ║`);
    console.log(`╠═════════════════════════════════════════╣`);
    console.log(`║ Phase: ${state.phase.padEnd(32)} ║`);
    console.log(`║ Extensions: ${state.extensionsComplete ? '✅ Complete (5/5)' : '⏳ Building'.padEnd(21)} ║`);
    console.log(`║ Source Containers: ${state.sourceContainersBuilt}/2 ${state.sourceContainersBuilt === 2 ? '✅' : '⏳'}           ║`);
    console.log(`║ Roads: ${state.roadsComplete ? '✅ Complete' : '⏳ Building'.padEnd(29)} ║`);
    console.log(`║ Controller Container: ${state.controllerContainerBuilt ? '✅' : '❌'}          ║`);
    console.log(`║ Stationary Harvesters: ${state.useStationaryHarvesters ? '✅ Enabled ' : '❌ Disabled'}       ║`);
    console.log(`║ Hauler Logistics: ${state.useHaulers ? '✅ Enabled ' : '❌ Disabled'}           ║`);
    console.log(`║ RCL1 Bodies: ${state.allowRCL1Bodies ? '✅ Allowed ' : '🛑 Die Off'.padEnd(14)}           ║`);
    console.log(`╚═════════════════════════════════════════╝`);
  }
}
