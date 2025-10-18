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
 * Initialize empire memory if not present
 */
function initializeEmpireMemory(): void {
  if (!Memory.empire) {
    Memory.empire = {};
  }
  
  if (!(Memory.empire as any).mode) {
    (Memory.empire as any).mode = 'delegate';
    (Memory.empire as any).modeChangedAt = Game.time;
  }
}

/**
 * Get current empire mode
 * 
 * @returns Current mode: 'command' or 'delegate'
 */
export function getMode(): EmpireMode {
  initializeEmpireMemory();
  return (Memory.empire as any).mode || 'delegate';
}

/**
 * Set empire mode
 * 
 * @param mode - 'command' or 'delegate'
 * @returns true if mode changed, false if already in that mode
 */
export function setMode(mode: EmpireMode): boolean {
  initializeEmpireMemory();
  const currentMode = (Memory.empire as any).mode;

  if (currentMode === mode) {
    return false;
  }

  (Memory.empire as any).mode = mode;
  (Memory.empire as any).modeChangedAt = Game.time;
  return true;
}

/**
 * Get ticks since last mode change
 */
export function getTicksSinceModeChange(): number {
  initializeEmpireMemory();
  const changedAt = (Memory.empire as any).modeChangedAt || 0;
  return Game.time - changedAt;
}

/**
 * Check if in command mode
 */
export function isCommandMode(): boolean {
  return getMode() === 'command';
}

/**
 * Check if in delegate mode
 */
export function isDelegateMode(): boolean {
  return getMode() === 'delegate';
}

/**
 * Display mode information
 */
export function displayModeInfo(): void {
  const mode = getMode();
  const ticksSince = getTicksSinceModeChange();
  
  const modeEmoji = mode === 'command' ? '⚔️' : '📋';
  const modeDescription = mode === 'command' 
    ? 'Direct Control - You are in command of all operations'
    : 'Delegation Mode - AI handles spawn priorities and construction';

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${modeEmoji} EMPIRE MODE: ${mode.toUpperCase()}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`${modeDescription}`);
  console.log(`Mode active for: ${ticksSince} ticks`);
  console.log(`${'═'.repeat(60)}\n`);
}
