/// <reference types="typed-screeps" />
/// <reference path="types/screeps-extensions.d.ts" />

import { ErrorMapper } from "utils/ErrorMapper";
import { RoleHarvester } from "roles/harvester";
import { RoleUpgrader } from "roles/upgrader";
import { RoleBuilder } from "roles/builder";
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
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // Spawn new creeps as needed
  const harvesters = _.filter(Game.creeps, creep => creep.memory.role === "harvester");
  const upgraders = _.filter(Game.creeps, creep => creep.memory.role === "upgrader");
  const builders = _.filter(Game.creeps, creep => creep.memory.role === "builder");

  // Maintain minimum creep counts
  if (harvesters.length < 2) {
    const newName = "Harvester" + Game.time;
    Game.spawns["Spawn1"]?.spawnCreep([WORK, CARRY, MOVE], newName, {
      memory: { role: "harvester", room: "", working: false }
    });
  } else if (upgraders.length < 2) {
    const newName = "Upgrader" + Game.time;
    Game.spawns["Spawn1"]?.spawnCreep([WORK, CARRY, MOVE], newName, {
      memory: { role: "upgrader", room: "", working: false }
    });
  } else if (builders.length < 2) {
    const newName = "Builder" + Game.time;
    Game.spawns["Spawn1"]?.spawnCreep([WORK, CARRY, MOVE], newName, {
      memory: { role: "builder", room: "", working: false }
    });
  }

  // Run creep roles using Traveler pathfinding
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === "harvester") {
      RoleHarvester.run(creep);
    } else if (creep.memory.role === "upgrader") {
      RoleUpgrader.run(creep);
    } else if (creep.memory.role === "builder") {
      RoleBuilder.run(creep);
    }
  }

  // Display spawning status
  if (Game.spawns["Spawn1"]?.spawning) {
    const spawningCreep = Game.creeps[Game.spawns["Spawn1"].spawning.name];
    Game.spawns["Spawn1"].room.visual.text(
      "🛠️" + spawningCreep.memory.role,
      Game.spawns["Spawn1"].pos.x + 1,
      Game.spawns["Spawn1"].pos.y,
      { align: "left", opacity: 0.8 }
    );
  }
});
