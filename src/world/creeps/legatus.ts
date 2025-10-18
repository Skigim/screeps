/**
 * LEGATUS OF OFICIO - THE TASKMASTER
 * 
 * Central command processor for creep management.
 * Stores room context and task queues, relaying commands to creeps.
 * Reduces per-creep memory overhead by centralizing command dispatch.
 * 
 * The Legatus receives orders and distributes them to the appropriate creeps,
 * tracking execution state without burdening individual creep memory.
 */

export interface LegaCommand {
  type: 'harvest' | 'deliver' | 'build' | 'upgrade' | 'move' | 'repair' | 'idle';
  target?: string; // Structure/resource name or position
  priority?: 'low' | 'normal' | 'high';
  issuedAt: number;
}

interface CreepAssignment {
  creepName: string;
  command: LegaCommand;
  assignedAt: number;
}

interface RoomLegatus {
  room: string;
  assignments: CreepAssignment[];
  lastUpdated: number;
}

/**
 * Get the Legatus registry for a room
 */
function getLegatus(roomName: string): RoomLegatus {
  if (!Memory.empire) {
    Memory.empire = {};
  }
  if (!Memory.empire.legatus) {
    Memory.empire.legatus = {};
  }

  const legatus = Memory.empire.legatus as Record<string, RoomLegatus>;

  if (!legatus[roomName]) {
    legatus[roomName] = {
      room: roomName,
      assignments: [],
      lastUpdated: Game.time
    };
  }

  return legatus[roomName];
}

/**
 * Issue a command to all creeps of a specific role
 * 
 * @param room - Room where the command applies
 * @param role - Role to target (e.g., 'harvester', 'builder')
 * @param command - The command to issue
 */
export function issueCommandToRole(room: Room, role: string, command: LegaCommand): number {
  const legatus = getLegatus(room.name);
  const creeps = room.find(FIND_MY_CREEPS).filter(c => c.memory.role === role);

  let assignedCount = 0;
  for (const creep of creeps) {
    legatus.assignments.push({
      creepName: creep.name,
      command,
      assignedAt: Game.time
    });
    assignedCount++;
  }

  legatus.lastUpdated = Game.time;
  return assignedCount;
}

/**
 * Issue a command to a specific creep
 * 
 * @param creepName - Name of the creep
 * @param roomName - Room name for registry lookup
 * @param command - The command to issue
 */
export function issueCommandToCreep(creepName: string, roomName: string, command: LegaCommand): boolean {
  const legatus = getLegatus(roomName);

  // Remove any existing assignment for this creep
  legatus.assignments = legatus.assignments.filter(a => a.creepName !== creepName);

  // Add new assignment
  legatus.assignments.push({
    creepName,
    command,
    assignedAt: Game.time
  });

  legatus.lastUpdated = Game.time;
  return true;
}

/**
 * Get current command for a creep from Legatus
 * 
 * @param creep - The creep to get command for
 * @returns The command, or undefined if none
 */
export function getCreepCommand(creep: Creep): LegaCommand | undefined {
  const legatus = getLegatus(creep.room.name);

  // Find assignment for this creep
  for (const assignment of legatus.assignments) {
    if (assignment.creepName === creep.name) {
      return assignment.command;
    }
  }

  return undefined;
}

/**
 * Clear command for a creep
 * 
 * @param creepName - Name of creep
 * @param roomName - Room name
 */
export function clearCreepCommand(creepName: string, roomName: string): void {
  const legatus = getLegatus(roomName);
  legatus.assignments = legatus.assignments.filter(a => a.creepName !== creepName);
  legatus.lastUpdated = Game.time;
}

/**
 * Get all current assignments in a room
 * 
 * @param roomName - Room to query
 * @returns Array of assignments
 */
export function getRoomAssignments(roomName: string): CreepAssignment[] {
  const legatus = getLegatus(roomName);
  return legatus.assignments;
}

/**
 * Get assignments for a specific creep
 * 
 * @param creepName - Name of creep
 * @param roomName - Room name
 * @returns Assignment if found, undefined otherwise
 */
export function getCreepAssignment(creepName: string, roomName: string): CreepAssignment | undefined {
  const legatus = getLegatus(roomName);
  return legatus.assignments.find(a => a.creepName === creepName);
}

/**
 * Clear all assignments in a room
 * 
 * @param roomName - Room to clear
 */
export function clearRoomAssignments(roomName: string): void {
  const legatus = getLegatus(roomName);
  legatus.assignments = [];
  legatus.lastUpdated = Game.time;
}

/**
 * Get status of Legatus in a room
 */
export function getLegaStatus(roomName: string): string {
  const legatus = getLegatus(roomName);
  return `🎯 Legatus ${roomName}: ${legatus.assignments.length} active assignments`;
}

/**
 * List all assignments in a room (for debugging)
 */
export function listLegaAssignments(roomName: string): void {
  const legatus = getLegatus(roomName);

  if (legatus.assignments.length === 0) {
    console.log(`📋 Legatus ${roomName}: No assignments`);
    return;
  }

  console.log(`\n📋 Legatus ${roomName}: ${legatus.assignments.length} assignments`);
  console.log('─'.repeat(80));

  for (const assignment of legatus.assignments) {
    const ageInTicks = Game.time - assignment.assignedAt;
    console.log(
      `${assignment.creepName.padEnd(25)} | ${assignment.command.type.padEnd(10)} | Age: ${ageInTicks} ticks`
    );
  }

  console.log('');
}
