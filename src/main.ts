import { Traveler } from "./vendor/traveler";
import Tasks from "./vendor/creep-tasks";
import { runTick } from "./tick";

const bootstrapVendors = (): void => {
  global.Traveler = Traveler;
  global.Tasks = Tasks;
};

bootstrapVendors();

const cleanupCreepMemory = (): void => {
  if (typeof Memory === "undefined" || typeof Game === "undefined") {
    return;
  }

  for (const name of Object.keys(Memory.creeps)) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  }
};

// @GIT_HASH@

export const loop = (): void => {
  cleanupCreepMemory();
  runTick();

  if (typeof Game !== "undefined" && Game.time % 150 === 0) {
    console.log(`Loop tick=${Game.time} hash=${global.__GIT_HASH__ ?? "development"}`);
  }
};
