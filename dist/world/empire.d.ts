/**
 * EMPIRE MANAGEMENT MODULE
 *
 * Manages empire-wide settings and policies that affect behavior across all rooms.
 * Two operational modes:
 * - COMMAND: Direct manual control - you make all decisions
 * - DELEGATE: Automatic AI control - empire handles spawning, construction, etc.
 */
export type EmpireMode = 'command' | 'delegate';
/**
 * Get current empire mode
 *
 * @returns Current mode: 'command' or 'delegate'
 */
export declare function getMode(): EmpireMode;
/**
 * Set empire mode
 *
 * @param mode - 'command' or 'delegate'
 * @returns true if mode changed, false if already in that mode
 */
export declare function setMode(mode: EmpireMode): boolean;
/**
 * Get ticks since last mode change
 */
export declare function getTicksSinceModeChange(): number;
/**
 * Check if in command mode
 */
export declare function isCommandMode(): boolean;
/**
 * Check if in delegate mode
 */
export declare function isDelegateMode(): boolean;
/**
 * Display mode information
 */
export declare function displayModeInfo(): void;
//# sourceMappingURL=empire.d.ts.map