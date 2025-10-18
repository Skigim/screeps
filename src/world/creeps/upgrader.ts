/**
 * UPGRADER BEHAVIOR MODULE
 * 
 * Upgraders maintain and improve your Room Controller Level (RCL).
 * They withdraw energy from spawn/extensions and upgrade the controller.
 * 
 * Why upgraders matter:
 * - Prevent controller downgrade (critical at low RCL)
 * - Unlock new structures and capabilities at each RCL
 * - RCL1→2 unlocks extensions (300 energy capacity each)
 * - RCL2→3 unlocks towers, walls, ramparts
 * 
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should upgrade
 */

/**
 * Main behavior function for upgrader role.
 * Called once per game tick for each upgrader creep.
 * 
 * @param creep - The creep to run upgrader behavior on
 * 
 * @example
 * ```typescript
 * const upgrader = Game.creeps['upgrader_12345'];
 * runUpgrader(upgrader);
 * ```
 */
export function runUpgrader(creep: Creep): void {
  // State machine: Switch between withdrawing and upgrading
  // When empty, switch to withdrawing mode
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }
  // When full, switch to upgrading mode
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }

  if (!creep.memory.working) {
    // WITHDRAWING MODE: Get energy from spawn/extensions
    withdrawEnergy(creep);
  } else {
    // UPGRADING MODE: Upgrade the controller
    upgradeController(creep);
  }
}

/**
 * Withdraws energy from spawn or extensions.
 * 
 * Strategy:
 * 1. Find spawn and extensions with available energy
 * 2. Prefer spawn first (leave extensions for spawning if possible)
 * 3. If spawn is empty, use closest extension
 * 4. Move and withdraw
 * 
 * @param creep - The creep that should withdraw energy
 * 
 * @remarks
 * This creates a "reserve" strategy where extensions are primarily
 * used for spawning, and upgraders take from spawn when possible.
 */
function withdrawEnergy(creep: Creep): void {
  // Find spawn and extensions with energy available
  const sources = creep.room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType === STRUCTURE_SPAWN ||
         structure.structureType === STRUCTURE_EXTENSION) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (sources.length > 0) {
    // Prefer spawn first (reserve extensions for spawning), then closest
    const spawn = sources.find(s => s.structureType === STRUCTURE_SPAWN);
    const target = spawn || sources[0];
    
    const result = creep.withdraw(target, RESOURCE_ENERGY);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    }
  }
  // If no sources found, creep will wait until energy is available
}

/**
 * Upgrades the room controller with carried energy.
 * 
 * The controller is the heart of your room:
 * - Upgrading increases progress towards next RCL
 * - Each upgrade action consumes 1 energy per WORK part
 * - Controller downgrades if not upgraded regularly
 * 
 * @param creep - The creep that should upgrade the controller
 * 
 * @remarks
 * At RCL1, controller downgrade timer is 20,000 ticks (~6.7 hours).
 * At RCL2+, this increases significantly.
 */
function upgradeController(creep: Creep): void {
  const controller = creep.room.controller;
  
  if (controller) {
    const result = creep.upgradeController(controller);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(controller);
    }
    // Possible errors: ERR_NOT_ENOUGH_RESOURCES (out of energy),
    // ERR_INVALID_TARGET (controller doesn't exist), etc.
  }
}
