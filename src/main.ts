/// <reference types="screeps" />
/// <reference path="types/screeps-extensions.d.ts" />

// Import creep-tasks - this automatically loads prototypes
import "creep-tasks";

import { ErrorMapper } from "utils/ErrorMapper";
import { RoleHarvester } from "roles/harvester";
import { RoleUpgrader } from "roles/upgrader";
import { RoleBuilder } from "roles/builder";
import { RoleHauler } from "roles/hauler";
import { RoomStateManager } from "managers/RoomStateManager";
import { ProgressionManager } from "managers/ProgressionManager";
import { TrafficManager } from "managers/TrafficManager";
import { PromotionManager } from "managers/PromotionManager";
import { StatsCollector } from "utils/StatsCollector";
import { StatsTracker } from "managers/StatsTracker";
import { Architect } from "managers/Architect";
import { SpawnManager } from "managers/SpawnManager";
import { AssignmentManager } from "managers/AssignmentManager";
import { MethodsIndex } from "core/MethodsIndex";
import "utils/ConsoleCommands"; // Import to register global console commands
import * as _ from "lodash";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */

  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    stats?: any; // Reserved for stats collection system
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    assignedSource?: string;
    // task property is declared by creep-tasks library
    _trav?: any;
    _travel?: any;
  }

  interface RoomMemory {
    avoid?: number;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      StatsTracker: typeof StatsTracker; // Export stats tracker to console
      Architect: typeof Architect; // Export Architect for manual commands
      __GIT_HASH__: string; // Injected git commit hash
    }
  }
}

// @GIT_HASH@
// This comment is replaced by rollup with: global.__GIT_HASH__ = "abc123";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Export to global for console access
  global.StatsTracker = StatsTracker;
  global.Architect = Architect;

  // ========================================
  // INITIALIZE SERVICE LOCATOR (METHODS INDEX)
  // ========================================
  // Create a fresh instance each tick and register all managers
  // This eliminates circular dependencies and enables the Event Queue
  const methodsIndex = new MethodsIndex();

  // Register all manager modules with the service locator
  methodsIndex.register("RoomStateManager", RoomStateManager);
  methodsIndex.register("ProgressionManager", ProgressionManager);
  methodsIndex.register("SpawnManager", SpawnManager);
  methodsIndex.register("AssignmentManager", AssignmentManager);
  methodsIndex.register("TrafficManager", TrafficManager);
  methodsIndex.register("PromotionManager", PromotionManager);
  methodsIndex.register("StatsTracker", StatsTracker);
  methodsIndex.register("Architect", Architect);

  // Prune stale events from previous ticks (events older than 10 ticks)
  methodsIndex.pruneOldEvents(10);

  // Clean up memory of dead creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      const creep = Memory.creeps[name];
      console.log(`💀 Cleaning up memory for ${name} (${creep.role})`);
      delete Memory.creeps[name];
    }
  }

  // Clean up invalid Memory keys (run once every 1000 ticks)
  if (Game.time % 1000 === 0) {
    const validKeys = ['creeps', 'rooms', 'uuid', 'log', 'stats', 'progressionStats', 'architectPlans'];
    let cleaned = 0;
    for (const key in Memory) {
      if (!validKeys.includes(key)) {
        delete (Memory as any)[key];
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} invalid Memory keys`);
    }
  }

  // Run RCL-specific logic for each owned room
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];

    // Only manage rooms we own
    if (!room.controller || !room.controller.my) continue;

    // Run traffic manager cleanup (handle stale builder assignments)
    TrafficManager.cleanupAssignments(room);

    // Run promotion manager (upgrade creeps when economy allows)
    PromotionManager.run(room, methodsIndex);

    // Run progression manager - PRIMARY ENTRY POINT
    // This analyzes the room and delegates to RoomStateManager
    ProgressionManager.run(room, methodsIndex);
  }

  // Clean up stale promotions globally (every 100 ticks)
  if (Game.time % 100 === 0) {
    PromotionManager.cleanupStalePromotions();
  }

  // Run creep roles
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];

    // Get config for this creep's room
    const config = RoomStateManager.getConfigForCreep(creep);
    if (!config) {
      console.log(`⚠️ No config available for ${creep.name} in room ${creep.room.name}`);
      continue;
    }

    // Execute role behavior with config
    if (creep.memory.role === "harvester") {
      RoleHarvester.run(creep, config);
    } else if (creep.memory.role === "upgrader") {
      RoleUpgrader.run(creep, config); // Now uses task-based system
    } else if (creep.memory.role === "builder") {
      RoleBuilder.run(creep, config);
    } else if (creep.memory.role === "hauler") {
      RoleHauler.run(creep, config);
    }
  }

  // Collect stats at the end of each tick
  StatsCollector.collect();

  // Process any critical events emitted during the tick
  const criticalEvents = methodsIndex.getEvents(undefined, "CRITICAL");
  if (criticalEvents.length > 0) {
    console.log(`⚠️ ${criticalEvents.length} CRITICAL events detected:`);
    for (const event of criticalEvents) {
      console.log(`  [${event.roomName}] ${event.type}:`, JSON.stringify(event.data));
    }
  }

  // Clear event queue for next tick
  methodsIndex.clearEvents();

  // Clear room data cache for next tick
  methodsIndex.clearRoomData();
});
