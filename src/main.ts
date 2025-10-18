/**
 * PROJECT IMPERIUM - RCL1 FOUNDATION
 * 
 * Philosophy: Simple, tested, expandable
 * Strategy: Build RCL1 → Prove it works → Add RCL2
 * 
 * "Festina lente" - Make haste slowly
 */

/**
 * MAIN GAME LOOP
 * 
 * This is the entry point for your Screeps AI.
 * Called once per game tick (every ~3 seconds in real-time).
 * 
 * Architecture:
 * - src/main.ts - High-level game loop (this file)
 * - src/world/* - All game logic (rooms, creeps, spawns)
 * - src/types/* - Type definitions
 * 
 * The world module handles:
 * - Room orchestration (spawning, creep management, statistics)
 * - Creep behaviors (harvester, upgrader, builder roles)
 * - Spawn management (priority system, body design)
 */

import { runRoom } from './world';
// Import Traveler for its side effects: extends Creep.prototype with travelTo()
// This enables all creeps to use: creep.travelTo(destination)
import './utils/traveler';
// Import console commands and register them globally
import { registerConsoleCommands } from './utils/console';
// Import empire mode system
import { displayModeInfo } from './world';
// Import body config registration
import { registerDefaultBodies } from './world/spawns/bodies';
// Import build information (injected at build time with commit hash)
import { INIT_VERSION, BUILD_INFO } from 'virtual-build-info';
// Import silent statistics tracking
import { updateStats } from './world/stats';

/**
 * Main game loop function.
 * Executed automatically by the Screeps game engine every tick.
 * 
 * Responsibilities:
 * 1. Clean up memory for dead creeps (prevent memory leak)
 * 2. Process each owned room
 * 
 * @remarks
 * Keep this function lightweight. Heavy logic should be in world module.
 * This makes testing easier and keeps the architecture clean.
 */
export const loop = (): void => {
  // Initialize once using commit hash injected at build time
  // INIT_VERSION is automatically updated on every rebuild (even if code doesn't change)
  // because the commit hash changes when you push/commit
  if (!Memory.initialized || (Memory.initVersion as string) !== INIT_VERSION) {
    // Set flags FIRST to prevent double-init if loop runs again
    Memory.initialized = true;
    (Memory.initVersion as any) = INIT_VERSION;
    
    // Log build information on initialization
    console.log('📦 Initializing with build: ' + BUILD_INFO.commitHash);
    if (BUILD_INFO.isDirty) {
      console.log('⚠️  Built from uncommitted changes');
    }
    
    // Then run initialization functions
    registerConsoleCommands();
    displayModeInfo();
    registerDefaultBodies();
    console.log('📦 Default body configurations registered');
  }

  // Log main tick info (every 100 ticks to reduce console spam)
  if (Game.time % 100 === 0) {
    console.log(`⚔️ Tick ${Game.time} - PROJECT IMPERIUM - RCL1 FOUNDATION`);
  }

  // Clean up dead creep memory
  // Without this, Memory.creeps grows forever and causes performance issues
  cleanupDeadCreeps();

  // Process each room we own
  processOwnedRooms();
};

/**
 * Removes memory entries for creeps that no longer exist.
 * 
 * When a creep dies, it's removed from Game.creeps but stays in Memory.creeps.
 * This cleanup prevents memory bloat over time.
 * 
 * @remarks
 * This is called once per tick at the start of the main loop.
 * Memory is limited in Screeps, so cleanup is essential.
 */
function cleanupDeadCreeps(): void {
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log(`💀 Creep ${name} has fallen in battle`);
    }
  }
}

/**
 * Processes all rooms under your control.
 * 
 * Iterates through Game.rooms and runs logic for each room
 * that has a controller you own.
 * 
 * @remarks
 * Game.rooms only contains visible rooms (ones you have creeps or structures in).
 * Rooms you don't control are skipped.
 */
function processOwnedRooms(): void {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    
    // Skip rooms we don't own (neutral or enemy rooms)
    if (!room.controller || !room.controller.my) {
      continue;
    }

    // Run all room logic via world module
    runRoom(room);
    
    // Silently track statistics for data collection (no console logging ever)
    updateStats(room);
  }
}
