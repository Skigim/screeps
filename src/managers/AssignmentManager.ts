import { Traveler } from "../Traveler";

/**
 * Assignment Manager - Manages creep assignments to prevent overcrowding
 * Limits: 5 work parts per source
 */
export class AssignmentManager {
  /**
   * Get assigned creeps for a source
   */
  public static getSourceAssignments(sourceId: string): Creep[] {
    return Object.values(Game.creeps).filter(
      creep => creep.memory.assignedSource === sourceId
    );
  }

  /**
   * Calculate total work parts assigned to a source
   */
  public static getSourceWorkParts(sourceId: string): number {
    const assignedCreeps = this.getSourceAssignments(sourceId);
    return assignedCreeps.reduce((total, creep) => {
      return total + creep.body.filter(part => part.type === WORK).length;
    }, 0);
  }

  /**
   * Assign a creep to the best available source
   * Returns true if assignment successful
   */
  public static assignCreepToSource(creep: Creep, room: Room): boolean {
    const sources = room.find(FIND_SOURCES);

    // Find source with fewest work parts
    let bestSource: Source | null = null;
    let minWorkParts = Infinity;

    for (const source of sources) {
      const workParts = this.getSourceWorkParts(source.id);
      if (workParts < 5 && workParts < minWorkParts) {
        minWorkParts = workParts;
        bestSource = source;
      }
    }

    if (bestSource) {
      creep.memory.assignedSource = bestSource.id;
      console.log(`✓ Assigned ${creep.name} to source ${bestSource.id} (${minWorkParts + 1}/5 work parts)`);
      return true;
    }

    return false;
  }

  /**
   * Unassign a creep from its source
   */
  public static unassignCreep(creep: Creep): void {
    delete creep.memory.assignedSource;
  }

  /**
   * Check if a creep needs reassignment (e.g., if it lost work parts)
   */
  public static needsReassignment(creep: Creep): boolean {
    if (!creep.memory.assignedSource) return true;

    const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
    return !source; // Reassign if source no longer exists
  }  /**
   * Display assignment info for debugging
   */
  public static displayAssignments(room: Room): void {
    const sources = room.find(FIND_SOURCES);
    console.log(`\n=== Source Assignments for ${room.name} ===`);

    for (const source of sources) {
      const workParts = this.getSourceWorkParts(source.id);
      const creeps = this.getSourceAssignments(source.id);
      console.log(`Source ${source.id}: ${workParts}/5 work parts (${creeps.length} creeps)`);
      creeps.forEach(c => console.log(`  - ${c.name} (${c.memory.role})`));
    }
  }
}
