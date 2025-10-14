import { Traveler } from "./vendor/traveler";
import "./vendor/creep-tasks/runtime";
import Tasks from "./vendor/creep-tasks";
import { runTick } from "./tick";
import { registerEngineConsole } from "./console/engine";

const bootstrapVendors = (): void => {
  global.Traveler = Traveler;
  global.Tasks = Tasks;
};

bootstrapVendors();
registerEngineConsole();

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

const getGitHash = (): string => {
  try {
    return (Reflect.get(global, "__GIT_HASH__") as string | undefined) ?? "development";
  } catch (_error) {
    return "development";
  }
};

// @GIT_HASH@

export const loop = (): void => {
  cleanupCreepMemory();
  runTick();

  if (typeof Game !== "undefined" && Game.time % 150 === 0) {
    const gitHash = getGitHash();
    console.log(`Loop tick=${Game.time} hash=${gitHash}`);
  }
};
