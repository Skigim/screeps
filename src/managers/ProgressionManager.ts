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
 */

export enum RCL2Phase {
  PHASE_1_EXTENSIONS = "phase1_extensions",      // Building extensions with RCL1 bodies
  PHASE_2_CONTAINERS = "phase2_containers",      // Building containers with stationary harvesters
  PHASE_3_HAULER_LOGISTICS = "phase3_logistics", // Full hauler-based logistics active
  COMPLETE = "complete"                          // RCL 2 progression complete
}

export interface ProgressionState {
  phase: RCL2Phase;
  containersOperational: boolean;
  extensionsComplete: boolean;
  sourceContainersBuilt: number;
  controllerContainerBuilt: boolean;
  useStationaryHarvesters: boolean;
  useHaulers: boolean;
}

export class ProgressionManager {
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
      useStationaryHarvesters: false,
      useHaulers: false
    };

    // Count infrastructure
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_EXTENSION
    });

    const containers = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
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

    // Determine if containers are operational (at least 1 source container built)
    state.containersOperational = state.sourceContainersBuilt > 0;

    // Phase detection logic
    if (!state.extensionsComplete) {
      // Phase 1: Building extensions
      state.phase = RCL2Phase.PHASE_1_EXTENSIONS;
      state.useStationaryHarvesters = false;
      state.useHaulers = false;
    } else if (state.sourceContainersBuilt < sources.length) {
      // Phase 2: Building containers with first stationary harvester
      state.phase = RCL2Phase.PHASE_2_CONTAINERS;
      state.useStationaryHarvesters = true; // Enable stationary harvesters
      state.useHaulers = state.sourceContainersBuilt > 0; // Enable haulers once first container done
    } else if (!state.controllerContainerBuilt) {
      // Phase 2 (continued): Still building controller container
      state.phase = RCL2Phase.PHASE_2_CONTAINERS;
      state.useStationaryHarvesters = true;
      state.useHaulers = true;
    } else {
      // Phase 3: Full logistics operational
      state.phase = RCL2Phase.PHASE_3_HAULER_LOGISTICS;
      state.useStationaryHarvesters = true;
      state.useHaulers = true;
      state.containersOperational = true;
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
    console.log(`║ Extensions: ${state.extensionsComplete ? '✅ Complete' : '⏳ Building'.padEnd(27)} ║`);
    console.log(`║ Source Containers: ${state.sourceContainersBuilt}          ║`);
    console.log(`║ Controller Container: ${state.controllerContainerBuilt ? '✅' : '❌'}          ║`);
    console.log(`║ Stationary Harvesters: ${state.useStationaryHarvesters ? 'Enabled ' : 'Disabled'}        ║`);
    console.log(`║ Hauler Logistics: ${state.useHaulers ? 'Enabled ' : 'Disabled'}            ║`);
    console.log(`╚═════════════════════════════════════════╝`);
  }
}
