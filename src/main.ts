import { Empire } from './principate/Empire';

// Initialize the Empire once (persists across ticks via global scope)
const empire = new Empire();

// This is the main game loop - called every tick by Screeps
export const loop = (): void => {
  try {
    // Clear dead creep memory
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }

    // Execute the Empire's master plan
    empire.run();
  } catch (error) {
    console.log(`❌ CRITICAL ERROR in main loop: ${error}`);
    if (error instanceof Error) {
      console.log(`Stack: ${error.stack}`);
    }
  }
};
