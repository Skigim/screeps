/**
 * PROJECT IMPERIUM - RCL1 FOUNDATION
 *
 * Philosophy: Simple, tested, expandable
 * Strategy: Build RCL1 → Prove it works → Add RCL2
 *
 * "Festina lente" - Make haste slowly
 */
import './utils/traveler';
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
export declare const loop: () => void;
//# sourceMappingURL=main.d.ts.map