import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

/**
 * Assignment Manager - Manages creep assignments to prevent overcrowding
 * Uses RCL-specific configs to determine max work parts per source
 */
export class AssignmentManager {
  /**
   * Get all sources in a room
   */
  public static getRoomSources(room: Room): Source[] {
    return room.find(FIND_SOURCES);
  }

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
   * Assign a creep to the best available source using RCL config
   * Evenly distributes creeps across sources up to max work parts
   * Returns true if assignment successful
   */
  public static assignCreepToSource(creep: Creep, room: Room, config: RCLConfig): boolean {
    const sources = this.getRoomSources(room);
    const maxWorkParts = config.sourceAssignment.maxWorkPartsPerSource;
    const creepWorkParts = creep.body.filter(part => part.type === WORK).length;

    if (sources.length === 0) {
      console.log(`⚠️ No sources found in room ${room.name}`);
      return false;
    }

    // Build assignment map: source -> current work parts
    const sourceWorkParts = new Map<string, number>();
    for (const source of sources) {
      sourceWorkParts.set(source.id, this.getSourceWorkParts(source.id));
    }

    // Find source with fewest work parts that can still accept this creep
    let bestSource: Source | null = null;
    let minWorkParts = Infinity;

    for (const source of sources) {
      const currentWorkParts = sourceWorkParts.get(source.id) || 0;
      const wouldHaveWorkParts = currentWorkParts + creepWorkParts;

      // Can this source accept this creep without exceeding the limit?
      if (wouldHaveWorkParts <= maxWorkParts && currentWorkParts < minWorkParts) {
        minWorkParts = currentWorkParts;
        bestSource = source;
      }
    }

    if (bestSource) {
      creep.memory.assignedSource = bestSource.id;
      const newTotal = minWorkParts + creepWorkParts;
      console.log(
        `✓ Assigned ${creep.name} to source (${newTotal}/${maxWorkParts} work parts)`
      );
      return true;
    } else {
      console.log(
        `⚠️ Cannot assign ${creep.name}: All sources at capacity (${maxWorkParts} work parts each)`
      );
      return false;
    }
  }

  /**
   * Unassign a creep from its source
   */
  public static unassignCreep(creep: Creep): void {
    delete creep.memory.assignedSource;
  }

  /**
   * Check if a creep needs reassignment (e.g., if source no longer exists)
   */
  public static needsReassignment(creep: Creep): boolean {
    if (!creep.memory.assignedSource) return true;

    const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
    return !source; // Reassign if source no longer exists
  }

  /**
   * Display assignment info for debugging
   */
  public static displayAssignments(room: Room, config: RCLConfig): void {
    const sources = this.getRoomSources(room);
    const maxWorkParts = config.sourceAssignment.maxWorkPartsPerSource;

    console.log(`\n=== Source Assignments for ${room.name} ===`);
    console.log(`Max work parts per source: ${maxWorkParts}`);
    console.log(`Total sources: ${sources.length}`);

    for (const source of sources) {
      const workParts = this.getSourceWorkParts(source.id);
      const creeps = this.getSourceAssignments(source.id);
      const percentage = Math.round((workParts / maxWorkParts) * 100);
      console.log(
        `Source @ ${source.pos.x},${source.pos.y}: ${workParts}/${maxWorkParts} work parts (${percentage}%) - ${creeps.length} creeps`
      );
      creeps.forEach(c => {
        const cWorkParts = c.body.filter(part => part.type === WORK).length;
        console.log(`  - ${c.name} (${c.memory.role}, ${cWorkParts} work)`);
      });
    }
  }
}
