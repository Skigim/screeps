import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

/**
 * Assignment Manager - Manages creep assignments to prevent overcrowding
 * Uses RCL-specific configs to determine max work parts per source
 */
export class AssignmentManager {
  /**
   * Main run method - handles all assignments for a room
   */
  public static run(room: Room, config: RCLConfig): void {
    // Find all roles that need source assignments
    const rolesNeedingAssignment = Object.entries(config.roles)
      .filter(([_, roleConfig]) => roleConfig.assignToSource)
      .map(([roleName, _]) => roleName);

    // Assign creeps that need it
    for (const roleName of rolesNeedingAssignment) {
      const creeps = room.find(FIND_MY_CREEPS, {
        filter: (creep) => creep.memory.role === roleName
      });

      for (const creep of creeps) {
        if (this.needsReassignment(creep)) {
          this.assignCreepToSource(creep, room, config);
        }
      }
    }
  }

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
   * For non-work roles (haulers), distributes by creep count instead
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

    // For haulers (0 work parts), distribute by creep count per source
    // For harvesters (has work parts), distribute by work parts per source
    const useCreepCount = creepWorkParts === 0;

    // Build assignment map: source -> current metric (work parts or creep count)
    const sourceMetrics = new Map<string, number>();
    for (const source of sources) {
      if (useCreepCount) {
        // Count creeps of the same role at this source
        const assignments = this.getSourceAssignments(source.id);
        const sameRoleCount = assignments.filter(c => c.memory.role === creep.memory.role).length;
        sourceMetrics.set(source.id, sameRoleCount);
      } else {
        // Count work parts at this source
        sourceMetrics.set(source.id, this.getSourceWorkParts(source.id));
      }
    }

    // Find source with lowest metric that can still accept this creep
    let bestSource: Source | null = null;
    let minMetric = Infinity;

    for (const source of sources) {
      const currentMetric = sourceMetrics.get(source.id) || 0;

      if (useCreepCount) {
        // For haulers: Just find source with fewest haulers
        if (currentMetric < minMetric) {
          minMetric = currentMetric;
          bestSource = source;
        }
      } else {
        // For harvesters: Check work part capacity
        const wouldHaveWorkParts = currentMetric + creepWorkParts;
        if (wouldHaveWorkParts <= maxWorkParts && currentMetric < minMetric) {
          minMetric = currentMetric;
          bestSource = source;
        }
      }
    }

    if (bestSource) {
      creep.memory.assignedSource = bestSource.id;
      if (useCreepCount) {
        console.log(
          `✓ Assigned ${creep.name} to source @ ${bestSource.pos.x},${bestSource.pos.y} (${minMetric + 1} ${creep.memory.role}s)`
        );
      } else {
        const newTotal = minMetric + creepWorkParts;
        console.log(
          `✓ Assigned ${creep.name} to source @ ${bestSource.pos.x},${bestSource.pos.y} (${newTotal}/${maxWorkParts} work parts)`
        );
      }
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
   * STICKY ASSIGNMENTS: Once assigned, creeps stay assigned to prevent thrashing
   * Only reassign if:
   * 1. No assignment exists
   * 2. Assigned source no longer exists
   * 3. Creep explicitly requests reassignment (memory flag)
   */
  public static needsReassignment(creep: Creep): boolean {
    // No assignment - needs one
    if (!creep.memory.assignedSource) return true;

    // Check if creep is explicitly requesting reassignment
    if (creep.memory.requestReassignment) {
      delete creep.memory.requestReassignment;
      return true;
    }

    // Check if assigned source still exists
    const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
    if (!source) {
      return true; // Source gone, need new assignment
    }

    // Assignment is valid and sticky - keep it
    return false;
  }

  /**
   * Check if each source has at least one harvester assigned
   * Returns sources that lack harvester coverage
   */
  public static getUncoveredSources(room: Room, role: string = "harvester"): Source[] {
    const sources = this.getRoomSources(room);
    const uncovered: Source[] = [];

    for (const source of sources) {
      const assignments = this.getSourceAssignments(source.id);
      const hasRole = assignments.some(creep => creep.memory.role === role);

      if (!hasRole) {
        uncovered.push(source);
      }
    }

    return uncovered;
  }

  /**
   * Get source coverage statistics for spawn request prioritization
   * Returns info about which sources need harvesters/haulers
   */
  public static getSourceCoverage(room: Room): {
    totalSources: number;
    sourcesWithHarvesters: number;
    sourcesWithHaulers: number;
    uncoveredByHarvesters: Source[];
    uncoveredByHaulers: Source[];
  } {
    const sources = this.getRoomSources(room);
    const uncoveredByHarvesters: Source[] = [];
    const uncoveredByHaulers: Source[] = [];
    let sourcesWithHarvesters = 0;
    let sourcesWithHaulers = 0;

    for (const source of sources) {
      const assignments = this.getSourceAssignments(source.id);

      const hasHarvester = assignments.some(creep => creep.memory.role === "harvester");
      const hasHauler = assignments.some(creep => creep.memory.role === "hauler");

      if (hasHarvester) {
        sourcesWithHarvesters++;
      } else {
        uncoveredByHarvesters.push(source);
      }

      if (hasHauler) {
        sourcesWithHaulers++;
      } else {
        uncoveredByHaulers.push(source);
      }
    }

    return {
      totalSources: sources.length,
      sourcesWithHarvesters,
      sourcesWithHaulers,
      uncoveredByHarvesters,
      uncoveredByHaulers
    };
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
