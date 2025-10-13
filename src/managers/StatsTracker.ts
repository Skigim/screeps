/**
 * Stats Tracker - Records progression metrics for analysis
 *
 * Tracks:
 * - Phase transitions and durations
 * - Milestone achievements (first extension, first hauler, etc.)
 * - Periodic snapshots of room state
 * - Performance metrics
 */

import { RCL2Phase, ProgressionState } from "./ProgressionManager";

export class StatsTracker {
  /**
   * Initialize stats tracking for a room
   */
  public static initializeRoom(roomName: string): void {
    if (!Memory.progressionStats) {
      Memory.progressionStats = {};
    }

    if (!Memory.progressionStats[roomName]) {
      Memory.progressionStats[roomName] = {
        startTime: Game.time,
        currentPhase: RCL2Phase.PHASE_1_EXTENSIONS,
        phaseStartTime: Game.time,
        phaseHistory: [],
        milestones: {},
        snapshots: []
      };

      console.log(`📊 Stats tracking initialized for ${roomName} at tick ${Game.time}`);
    }
  }

  /**
   * Record phase transition
   */
  public static recordPhaseTransition(roomName: string, newPhase: RCL2Phase): void {
    this.initializeRoom(roomName);
    const stats = Memory.progressionStats![roomName];

    // Close out previous phase
    if (stats.currentPhase !== newPhase) {
      const previousPhase = stats.currentPhase;
      const duration = Game.time - stats.phaseStartTime;

      stats.phaseHistory.push({
        phase: previousPhase,
        startTick: stats.phaseStartTime,
        endTick: Game.time,
        duration: duration
      });

      // Start new phase
      stats.currentPhase = newPhase;
      stats.phaseStartTime = Game.time;

      console.log(`📈 Phase Transition: ${previousPhase} → ${newPhase} (${duration} ticks)`);
    }
  }

  /**
   * Record milestones
   */
  public static recordMilestones(room: Room, progressionState: ProgressionState): void {
    this.initializeRoom(room.name);
    const stats = Memory.progressionStats![room.name];

    // First extension
    if (!stats.milestones.firstExtension) {
      const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION
      });
      if (extensions.length > 0) {
        stats.milestones.firstExtension = Game.time;
        console.log(`🎯 MILESTONE: First extension complete at tick ${Game.time}`);
      }
    }

    // All extensions complete
    if (!stats.milestones.allExtensionsComplete && progressionState.extensionsComplete) {
      stats.milestones.allExtensionsComplete = Game.time;
      const duration = Game.time - stats.startTime;
      console.log(`🎯 MILESTONE: All extensions complete at tick ${Game.time} (${duration} ticks from start)`);
    }

    // First container
    if (!stats.milestones.firstContainer) {
      const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      });
      if (containers.length > 0) {
        stats.milestones.firstContainer = Game.time;
        console.log(`🎯 MILESTONE: First container complete at tick ${Game.time}`);
      }
    }

    // All containers complete
    if (!stats.milestones.allContainersComplete) {
      const sources = room.find(FIND_SOURCES);
      if (progressionState.sourceContainersBuilt === sources.length && progressionState.controllerContainerBuilt) {
        stats.milestones.allContainersComplete = Game.time;
        console.log(`🎯 MILESTONE: All containers complete at tick ${Game.time}`);
      }
    }

    // First stationary harvester
    if (!stats.milestones.firstStationaryHarvester && progressionState.useStationaryHarvesters) {
      const creeps = room.find(FIND_MY_CREEPS, {
        filter: c => c.memory.role === "harvester" && c.body.filter(p => p.type === WORK).length >= 5
      });
      if (creeps.length > 0) {
        stats.milestones.firstStationaryHarvester = Game.time;
        console.log(`🎯 MILESTONE: First stationary harvester spawned at tick ${Game.time}`);
      }
    }

    // First hauler
    if (!stats.milestones.firstHauler) {
      const haulers = room.find(FIND_MY_CREEPS, {
        filter: c => c.memory.role === "hauler"
      });
      if (haulers.length > 0) {
        stats.milestones.firstHauler = Game.time;
        console.log(`🎯 MILESTONE: First hauler spawned at tick ${Game.time}`);
      }
    }

    // RCL 2 Complete
    if (!stats.milestones.rcl2Complete && progressionState.phase === RCL2Phase.PHASE_3_HAULER_LOGISTICS) {
      stats.milestones.rcl2Complete = Game.time;
      const duration = Game.time - stats.startTime;
      console.log(`🎯 MILESTONE: RCL 2 progression complete at tick ${Game.time} (${duration} ticks total)`);
    }
  }

  /**
   * Take periodic snapshots of room state
   */
  public static takeSnapshot(room: Room, progressionState: ProgressionState): void {
    this.initializeRoom(room.name);
    const stats = Memory.progressionStats![room.name];

    // Take snapshots every 50 ticks
    if (Game.time % 50 === 0) {
      const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION
      }).length;

      const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      }).length;

      const creeps = room.find(FIND_MY_CREEPS).length;

      stats.snapshots.push({
        tick: Game.time,
        phase: progressionState.phase,
        creepCount: creeps,
        energy: room.energyAvailable,
        energyCapacity: room.energyCapacityAvailable,
        controllerProgress: room.controller?.progress || 0,
        extensions: extensions,
        containers: containers
      });

      // Limit snapshot history to last 100 entries (5000 ticks)
      if (stats.snapshots.length > 100) {
        stats.snapshots.shift();
      }
    }
  }

  /**
   * Display comprehensive stats report
   */
  public static displayReport(roomName: string): void {
    const stats = Memory.progressionStats?.[roomName];
    if (!stats) {
      console.log(`No stats available for ${roomName}`);
      return;
    }

    const totalDuration = Game.time - stats.startTime;

    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║         PROGRESSION STATS - ${roomName.padEnd(20)}       ║`);
    console.log(`╚════════════════════════════════════════════════════════╝`);
    console.log(`\n📊 Overview:`);
    console.log(`  Start Time: ${stats.startTime}`);
    console.log(`  Current Tick: ${Game.time}`);
    console.log(`  Total Duration: ${totalDuration} ticks`);
    console.log(`  Current Phase: ${stats.currentPhase}`);

    console.log(`\n🎯 Milestones:`);
    if (stats.milestones.firstExtension) {
      console.log(`  First Extension: Tick ${stats.milestones.firstExtension} (+${stats.milestones.firstExtension - stats.startTime})`);
    }
    if (stats.milestones.allExtensionsComplete) {
      console.log(`  All Extensions: Tick ${stats.milestones.allExtensionsComplete} (+${stats.milestones.allExtensionsComplete - stats.startTime})`);
    }
    if (stats.milestones.firstContainer) {
      console.log(`  First Container: Tick ${stats.milestones.firstContainer} (+${stats.milestones.firstContainer - stats.startTime})`);
    }
    if (stats.milestones.allContainersComplete) {
      console.log(`  All Containers: Tick ${stats.milestones.allContainersComplete} (+${stats.milestones.allContainersComplete - stats.startTime})`);
    }
    if (stats.milestones.firstStationaryHarvester) {
      console.log(`  First Stationary Harvester: Tick ${stats.milestones.firstStationaryHarvester} (+${stats.milestones.firstStationaryHarvester - stats.startTime})`);
    }
    if (stats.milestones.firstHauler) {
      console.log(`  First Hauler: Tick ${stats.milestones.firstHauler} (+${stats.milestones.firstHauler - stats.startTime})`);
    }
    if (stats.milestones.rcl2Complete) {
      console.log(`  RCL 2 Complete: Tick ${stats.milestones.rcl2Complete} (+${stats.milestones.rcl2Complete - stats.startTime})`);
    }

    console.log(`\n📈 Phase History:`);
    for (const phase of stats.phaseHistory) {
      console.log(`  ${phase.phase}: ${phase.duration} ticks (${phase.startTick} → ${phase.endTick})`);
    }

    console.log(`\n📸 Recent Snapshots (last 5):`);
    const recentSnapshots = stats.snapshots.slice(-5);
    for (const snap of recentSnapshots) {
      console.log(`  Tick ${snap.tick}: ${snap.phase} | Creeps: ${snap.creepCount} | Energy: ${snap.energy}/${snap.energyCapacity} | Ext: ${snap.extensions} | Con: ${snap.containers}`);
    }

    console.log(`\n`);
  }
}
