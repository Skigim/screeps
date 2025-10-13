/**
 * Architect - Intelligent Room Planning System
 *
 * Analyzes room topology and uses pathfinding data to optimally place:
 * - Extensions (efficient energy distribution)
 * - Containers (source containers, destination containers)
 * - Roads (connecting infrastructure)
 * - Future: Towers, labs, storage, terminals, etc.
 *
 * Design Philosophy:
 * - Use actual pathfinding data (Traveler) to inform decisions
 * - Minimize creep travel time (fewer CPU cycles, faster economy)
 * - Adaptive to room terrain and source positions
 * - Extensible for all RCL levels
 */

import { Traveler } from "../Traveler";

export interface ArchitectPlan {
  extensions: RoomPosition[];
  sourceContainers: Map<string, RoomPosition>; // sourceId -> position
  destContainers: {
    controller?: RoomPosition;
    // Future: storage, terminal, etc.
  };
  roads: RoomPosition[];
}

export class Architect {
  /**
   * Generate a complete construction plan for a room
   * Includes cleanup of faulty/misplaced construction sites
   */
  public static planRoom(room: Room): ArchitectPlan {
    const plan: ArchitectPlan = {
      extensions: [],
      sourceContainers: new Map(),
      destContainers: {},
      roads: []
    };

    // Get key anchor points
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) {
      console.log(`⚠️ Architect: No spawn found in ${room.name}`);
      return plan;
    }

    const controller = room.controller;
    const sources = room.find(FIND_SOURCES);

    // Plan infrastructure based on RCL
    const rcl = controller?.level || 1;

    if (rcl >= 2) {
      // RCL 2: Extensions, source containers, controller container, roads
      plan.extensions = this.planExtensions(room, spawn, 5); // RCL 2 unlocks 5 extensions

      for (const source of sources) {
        const containerPos = this.planSourceContainer(room, source);
        if (containerPos) {
          plan.sourceContainers.set(source.id, containerPos);
        }
      }

      if (controller) {
        const controllerContainer = this.planControllerContainer(room, controller, spawn);
        if (controllerContainer) {
          plan.destContainers.controller = controllerContainer;
        }
      }

      // Plan road network connecting everything
      plan.roads = this.planRoadNetwork(room, spawn, sources, controller, plan);

      // Clean up faulty construction sites that don't match the plan
      this.cleanupFaultySites(room, plan);
    }

    return plan;
  }

  /**
   * Execute a construction plan (place construction sites)
   */
  public static executePlan(room: Room, plan: ArchitectPlan): void {
    const existingSites = room.find(FIND_CONSTRUCTION_SITES);
    const maxSites = 100; // Game limit

    // Prioritize construction: Extensions > Containers > Roads
    const placementQueue: Array<{ pos: RoomPosition; type: BuildableStructureConstant }> = [];

    // 1. Extensions (highest priority - increase energy capacity)
    for (const pos of plan.extensions) {
      if (!this.hasStructureAt(room, pos, STRUCTURE_EXTENSION)) {
        placementQueue.push({ pos, type: STRUCTURE_EXTENSION });
      }
    }

    // 2. Source containers (enable efficient harvesting)
    for (const pos of plan.sourceContainers.values()) {
      if (!this.hasStructureAt(room, pos, STRUCTURE_CONTAINER)) {
        placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
      }
    }

    // 3. Controller container (enable efficient upgrading)
    if (plan.destContainers.controller) {
      const pos = plan.destContainers.controller;
      if (!this.hasStructureAt(room, pos, STRUCTURE_CONTAINER)) {
        placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
      }
    }

    // 4. Roads (lowest priority - nice to have)
    for (const pos of plan.roads) {
      if (!this.hasStructureAt(room, pos, STRUCTURE_ROAD) && !this.hasStructureAt(room, pos, STRUCTURE_SPAWN)) {
        placementQueue.push({ pos, type: STRUCTURE_ROAD });
      }
    }

    // Place construction sites (respecting game limit)
    let placed = 0;
    for (const { pos, type } of placementQueue) {
      if (existingSites.length + placed >= maxSites) {
        console.log(`⚠️ Architect: Hit construction site limit (${maxSites})`);
        break;
      }

      const result = room.createConstructionSite(pos, type);
      if (result === OK) {
        placed++;
        console.log(`✅ Architect: Placed ${type} at ${pos}`);
      }
    }

    if (placed > 0) {
      console.log(`📐 Architect: Placed ${placed} construction sites in ${room.name}`);
    }
  }

  /**
   * Plan extension positions in a crescent around spawn
   */
  private static planExtensions(room: Room, spawn: StructureSpawn, count: number): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const spawnPos = spawn.pos;

    // Crescent pattern: Positions around spawn, prioritizing front/sides
    const crescentOffsets = [
      // Front arc (3 positions)
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      // Side positions (2 positions)
      { x: -2, y: 0 }, { x: 2, y: 0 }
      // Can extend to full circle if needed:
      // { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
    ];

    for (const offset of crescentOffsets) {
      if (positions.length >= count) break;

      const pos = new RoomPosition(
        spawnPos.x + offset.x,
        spawnPos.y + offset.y,
        room.name
      );

      // Validate position (buildable, no structures)
      if (this.isValidBuildPosition(room, pos) && !this.hasStructureAt(room, pos, STRUCTURE_EXTENSION)) {
        positions.push(pos);
      }
    }

    return positions;
  }

  /**
   * Plan source container position (adjacent to source, optimal for harvesting)
   */
  private static planSourceContainer(room: Room, source: Source): RoomPosition | null {
    const sourcePos = source.pos;

    // Find the best adjacent position:
    // 1. Walkable terrain
    // 2. Not blocking pathfinding to other areas
    // 3. Ideally not on a road (but can be)
    const adjacentPositions = this.getAdjacentPositions(room, sourcePos);

    // Score positions based on accessibility and terrain
    let bestPos: RoomPosition | null = null;
    let bestScore = -Infinity;

    for (const pos of adjacentPositions) {
      if (!this.isValidBuildPosition(room, pos)) continue;

      let score = 0;

      // Prefer positions with more open adjacent tiles (easier access)
      const openNeighbors = this.getAdjacentPositions(room, pos)
        .filter(p => this.isWalkable(room, p))
        .length;
      score += openNeighbors * 10;

      // Prefer plain terrain over swamp (cheaper roads later)
      const terrain = room.getTerrain().get(pos.x, pos.y);
      if (terrain === 0) score += 5; // Plain
      if (terrain === TERRAIN_MASK_SWAMP) score -= 5; // Swamp

      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  /**
   * Plan controller container position (near controller, accessible to upgraders)
   */
  private static planControllerContainer(
    room: Room,
    controller: StructureController,
    spawn: StructureSpawn
  ): RoomPosition | null {
    const controllerPos = controller.pos;

    // Find position adjacent to controller that's on the path from spawn
    // This ensures upgraders can easily access it
    const path = Traveler.findTravelPath(spawn.pos, controllerPos);

    if (!path || path.path.length === 0) {
      console.log(`⚠️ Architect: No path found from spawn to controller`);
      return null;
    }

    // Find the last path position that's adjacent to the controller
    for (let i = path.path.length - 1; i >= 0; i--) {
      const pathPos = path.path[i];
      if (this.isAdjacentTo(pathPos, controllerPos)) {
        // Check if this position is valid for a container
        if (this.isValidBuildPosition(room, pathPos)) {
          return new RoomPosition(pathPos.x, pathPos.y, room.name);
        }
      }
    }

    // Fallback: Just find any valid adjacent position
    const adjacentPositions = this.getAdjacentPositions(room, controllerPos);
    for (const pos of adjacentPositions) {
      if (this.isValidBuildPosition(room, pos)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Plan road network connecting spawn, sources, and controller
   * Uses terrain-agnostic pathfinding (swamps = plains since roads will be built)
   */
  private static planRoadNetwork(
    room: Room,
    spawn: StructureSpawn,
    sources: Source[],
    controller: StructureController | undefined,
    plan: ArchitectPlan
  ): RoomPosition[] {
    const roadPositions: Set<string> = new Set();
    const spawnPos = spawn.pos;

    // Helper to add path to road set with terrain-agnostic pathfinding
    const addPathToRoads = (fromPos: RoomPosition, toPos: RoomPosition) => {
      // Custom roomCallback to treat swamps and plains equally (we're building roads!)
      const roomCallback = (roomName: string): CostMatrix | boolean => {
        if (roomName !== room.name) return false;

        const costs = new PathFinder.CostMatrix();
        const terrain = room.getTerrain();

        // Set costs: plains = 1, swamps = 1 (same!), walls = 255
        for (let x = 0; x < 50; x++) {
          for (let y = 0; y < 50; y++) {
            const tile = terrain.get(x, y);
            if (tile === TERRAIN_MASK_WALL) {
              costs.set(x, y, 255); // Impassable
            } else {
              costs.set(x, y, 1); // Both plains and swamps cost 1
            }
          }
        }

        // Avoid existing structures (except roads/containers)
        const structures = room.find(FIND_STRUCTURES);
        for (const structure of structures) {
          if (structure.structureType !== STRUCTURE_ROAD &&
              structure.structureType !== STRUCTURE_CONTAINER &&
              structure.structureType !== STRUCTURE_RAMPART) {
            costs.set(structure.pos.x, structure.pos.y, 255);
          }
        }

        return costs;
      };

      const path = Traveler.findTravelPath(fromPos, toPos, {
        roomCallback: roomCallback,
        ignoreCreeps: true,
        maxOps: 4000
      });

      if (path && path.path.length > 0) {
        for (const step of path.path) {
          const posKey = `${step.x},${step.y}`;
          roadPositions.add(posKey);
        }
      }
    };

    // Roads from spawn to each source container
    for (const [sourceId, containerPos] of plan.sourceContainers) {
      addPathToRoads(spawnPos, containerPos);
    }

    // Road from spawn to controller container (if exists)
    if (plan.destContainers.controller) {
      addPathToRoads(spawnPos, plan.destContainers.controller);
    }

    // Convert set back to RoomPosition array
    const roads: RoomPosition[] = [];
    for (const posKey of roadPositions) {
      const [x, y] = posKey.split(',').map(Number);
      roads.push(new RoomPosition(x, y, room.name));
    }

    return roads;
  }

  /**
   * Check if a position is valid for building
   */
  private static isValidBuildPosition(room: Room, pos: RoomPosition): boolean {
    // Check bounds
    if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) return false;

    // Check terrain (not wall)
    const terrain = room.getTerrain().get(pos.x, pos.y);
    if (terrain === TERRAIN_MASK_WALL) return false;

    // Check no existing structures (except roads, which can be built over)
    const structures = pos.lookFor(LOOK_STRUCTURES);
    for (const structure of structures) {
      if (structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a structure exists at a position
   */
  private static hasStructureAt(room: Room, pos: RoomPosition, structureType: StructureConstant): boolean {
    const structures = pos.lookFor(LOOK_STRUCTURES);
    const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

    return (
      structures.some(s => s.structureType === structureType) ||
      sites.some(s => s.structureType === structureType)
    );
  }

  /**
   * Check if position is walkable
   */
  private static isWalkable(room: Room, pos: RoomPosition): boolean {
    const terrain = room.getTerrain().get(pos.x, pos.y);
    return terrain !== TERRAIN_MASK_WALL;
  }

  /**
   * Get adjacent positions (8 directions)
   */
  private static getAdjacentPositions(room: Room, pos: RoomPosition): RoomPosition[] {
    const positions: RoomPosition[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip center
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
          positions.push(new RoomPosition(x, y, room.name));
        }
      }
    }
    return positions;
  }

  /**
   * Check if two positions are adjacent
   */
  private static isAdjacentTo(pos1: RoomPosition, pos2: RoomPosition): boolean {
    return Math.abs(pos1.x - pos2.x) <= 1 && Math.abs(pos1.y - pos2.y) <= 1;
  }

  /**
   * Clean up faulty construction sites that don't match the current plan
   * Removes misplaced sites so they can be rebuilt correctly
   */
  private static cleanupFaultySites(room: Room, plan: ArchitectPlan): void {
    const allSites = room.find(FIND_CONSTRUCTION_SITES);
    let removed = 0;

    // Build sets of planned positions for quick lookup
    const plannedExtensions = new Set(plan.extensions.map(pos => `${pos.x},${pos.y}`));
    const plannedContainers = new Set([
      ...Array.from(plan.sourceContainers.values()).map(pos => `${pos.x},${pos.y}`),
      plan.destContainers.controller ? `${plan.destContainers.controller.x},${plan.destContainers.controller.y}` : null
    ].filter(Boolean));
    const plannedRoads = new Set(plan.roads.map(pos => `${pos.x},${pos.y}`));

    for (const site of allSites) {
      const posKey = `${site.pos.x},${site.pos.y}`;
      let shouldRemove = false;

      // Check if this site matches the plan
      switch (site.structureType) {
        case STRUCTURE_EXTENSION:
          if (!plannedExtensions.has(posKey)) {
            shouldRemove = true;
            console.log(`🗑️ Architect: Removing misplaced extension at ${site.pos}`);
          }
          break;

        case STRUCTURE_CONTAINER:
          if (!plannedContainers.has(posKey)) {
            shouldRemove = true;
            console.log(`🗑️ Architect: Removing misplaced container at ${site.pos}`);
          }
          break;

        case STRUCTURE_ROAD:
          if (!plannedRoads.has(posKey)) {
            shouldRemove = true;
            console.log(`🗑️ Architect: Removing misplaced road at ${site.pos}`);
          }
          break;
      }

      if (shouldRemove) {
        site.remove();
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Architect: Cleaned up ${removed} faulty construction site(s) in ${room.name}`);
    }
  }

  /**
   * Display plan in room visual (for debugging)
   */
  public static visualizePlan(room: Room, plan: ArchitectPlan): void {
    const visual = room.visual;

    // Extensions (green circles)
    for (const pos of plan.extensions) {
      visual.circle(pos, { fill: 'green', radius: 0.4, opacity: 0.5 });
    }

    // Source containers (yellow squares)
    for (const pos of plan.sourceContainers.values()) {
      visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: 'yellow', opacity: 0.5 });
    }

    // Controller container (blue square)
    if (plan.destContainers.controller) {
      const pos = plan.destContainers.controller;
      visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: 'blue', opacity: 0.5 });
    }

    // Roads (gray lines)
    for (const pos of plan.roads) {
      visual.circle(pos, { fill: 'gray', radius: 0.2, opacity: 0.3 });
    }
  }
}
