/**
 * Progression Manager - Intelligent Phase Detection
 *
 * Detects room progression state and triggers appropriate transitions
 * Enables fully autonomous progression from RCL 1 → RCL 6+
 *
 * Phase detection is data-driven based on actual room state:
 * - Structure completion
 * - Container operational status
 * - Creep composition readiness
 *
 * RCL 2 Progression Plan:
 * Phase 1: Build 5 extensions (RCL1 mobile harvesters, no upgraders)
 * Phase 2: Build source containers (transition to stationary harvesters, RCL1 bodies die off)
 * Phase 3: Build road network (haulers active, finish roads)
 * Phase 4: Build controller container (convert builders back to upgraders)
 */

export enum RCL2Phase {
  PHASE_1_EXTENSIONS = "phase1_extensions",      // Building extensions, no upgraders
  PHASE_2_CONTAINERS = "phase2_containers",      // Building source containers, stationary harvesters
  PHASE_3_ROADS = "phase3_roads",                // Building road network, full logistics
  PHASE_4_CONTROLLER = "phase4_controller",      // Building controller container
  COMPLETE = "complete"                          // RCL 2 progression complete
}

export interface ProgressionState {
  phase: RCL2Phase;
  containersOperational: boolean;
  extensionsComplete: boolean;
  sourceContainersBuilt: number;
  controllerContainerBuilt: boolean;
  roadsComplete: boolean;
  useStationaryHarvesters: boolean;
  useHaulers: boolean;
  allowRCL1Bodies: boolean; // Allow RCL1 bodies to exist (Phase 1 only)
}

export class ProgressionManager {
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

    // Convert all upgraders to builders
    let converted = 0;
    for (const creep of upgraders) {
      creep.memory.role = "builder";
      converted++;
    }

    if (converted > 0) {
      console.log(`🔄 Converted ${converted} upgrader(s) to builders (preventing source congestion)`);
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
      phase: RCL2Phase.PHASE_1_EXTENSIONS,
      containersOperational: false,
      extensionsComplete: false,
      sourceContainersBuilt: 0,
      controllerContainerBuilt: false,
      roadsComplete: false,
      useStationaryHarvesters: false,
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

    // Check if roads are complete (no road construction sites remaining)
    state.roadsComplete = roadSites.length === 0 && roads.length > 0;

    // Determine if containers are operational (at least 1 source container built)
    state.containersOperational = state.sourceContainersBuilt > 0;

    // Phase detection logic
    if (!state.extensionsComplete) {
      // Phase 1: Building extensions
      // - Mobile harvesters (RCL1 bodies)
      // - NO upgraders (prevent source congestion)
      state.phase = RCL2Phase.PHASE_1_EXTENSIONS;
      state.useStationaryHarvesters = false;
      state.useHaulers = false;
      state.allowRCL1Bodies = true;
    } else if (state.sourceContainersBuilt < sources.length) {
      // Phase 2: Building source containers
      // - First container triggers stationary harvesters
      // - RCL1 bodies die off naturally, replaced with RCL2 bodies
      // - Haulers spawn when first container is done
      state.phase = RCL2Phase.PHASE_2_CONTAINERS;
      state.useStationaryHarvesters = state.sourceContainersBuilt > 0;
      state.useHaulers = state.sourceContainersBuilt > 0;
      state.allowRCL1Bodies = false; // Stop spawning RCL1 bodies
    } else if (!state.roadsComplete) {
      // Phase 3: Building road network
      // - All source containers operational
      // - Full hauler logistics
      // - Finish road network
      state.phase = RCL2Phase.PHASE_3_ROADS;
      state.useStationaryHarvesters = true;
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
