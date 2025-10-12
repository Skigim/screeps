/// <reference types="typed-screeps" />
/// <reference path="types/screeps-extensions.d.ts" />

import { ErrorMapper } from "utils/ErrorMapper";
import { RoleHarvester } from "roles/harvester";
import { RoleUpgrader } from "roles/upgrader";
import { RoleBuilder } from "roles/builder";
import { RoomStateManager } from "managers/RoomStateManager";
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
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    assignedSource?: string;
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
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Clean up memory of dead creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      const creep = Memory.creeps[name];
      console.log(`💀 Cleaning up memory for ${name} (${creep.role})`);
      delete Memory.creeps[name];
    }
  }

  // Run RCL-specific logic for each owned room
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];

    // Only manage rooms we own
    if (!room.controller || !room.controller.my) continue;

    // Run room state manager (handles all room-level logic)
    RoomStateManager.run(room);
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
      RoleUpgrader.run(creep, config);
    } else if (creep.memory.role === "builder") {
      RoleBuilder.run(creep, config);
    }
  }
});
