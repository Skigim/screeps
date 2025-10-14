/**
 * Architect - Intelligent Room Planning System
 *
 * Recovered from previous iteration and made self-contained.
 * Plans optimal positions for extensions, containers, and roads using Traveler paths.
 */

import { Traveler } from "../vendor/traveler";

export interface ArchitectPlan {
  extensions: RoomPosition[];
  sourceContainers: Map<string, RoomPosition>;
  spawnContainers: RoomPosition[];
  destContainers: {
    controller?: RoomPosition;
  };
  roads: RoomPosition[];
}

export class Architect {
  /**
   * Main entry point for room planning.
   */
  public static run(room: Room): void {
    if (!room.controller || !room.controller.my) {
      return;
    }

    const rcl = room.controller.level;
    const roomKey = room.name;

    if (!Memory.architectPlans) {
      Memory.architectPlans = {};
    }

    const lastPlannedRCL = Memory.architectPlans[roomKey];

    if (lastPlannedRCL === undefined) {
      Memory.architectPlans[roomKey] = rcl;
      console.log(`📐 Architect: Initialized tracking for ${room.name} at RCL ${rcl} (no planning yet)`);
      return;
    }

    if (lastPlannedRCL !== rcl && rcl >= 2) {
      console.log(`📐 Architect: RCL changed ${lastPlannedRCL} → ${rcl} in ${room.name}`);
      console.log(`📐 Architect: Planning infrastructure for ${room.name} (RCL ${rcl})`);

      const plan = this.planRoom(room);
      this.executePlan(room, plan);

      Memory.architectPlans[roomKey] = rcl;
    }
  }

  public static forceReplan(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room || !room.controller || !room.controller.my) {
      console.log(`❌ Architect: Cannot replan ${roomName} - invalid room or not owned`);
      return;
    }

    console.log(`🔄 Architect: Force replanning ${roomName}...`);

    if (Memory.architectPlans) {
      delete Memory.architectPlans[roomName];
    }

    this.run(room);
    console.log(`✅ Architect: Replan complete for ${roomName}`);
  }

  public static planRoom(room: Room): ArchitectPlan {
    const plan: ArchitectPlan = {
      extensions: [],
      sourceContainers: new Map(),
      spawnContainers: [],
      destContainers: {},
      roads: []
    };

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) {
      console.log(`⚠️ Architect: No spawn found in ${room.name}`);
      return plan;
    }

    const controller = room.controller;
    const sources = room.find(FIND_SOURCES);
    const rcl = controller?.level ?? 1;

    if (rcl >= 2) {
      for (const source of sources) {
        const containerPos = this.planSourceContainer(room, source);
        if (containerPos) {
          plan.sourceContainers.set(source.id, containerPos);
        }
      }

      plan.spawnContainers = this.planSpawnContainers(room, spawn, sources);
      plan.extensions = this.planExtensions(room, spawn, 5, plan.spawnContainers);

      if (controller) {
        const controllerContainer = this.planControllerContainer(room, controller, spawn);
        if (controllerContainer) {
          plan.destContainers.controller = controllerContainer;
        }
      }

      plan.roads = this.planRoadNetwork(room, spawn, sources, controller ?? undefined, plan);
      this.cleanupFaultySites(room, plan);
    }

    return plan;
  }

  public static executePlan(room: Room, plan: ArchitectPlan): void {
    const existingSites = room.find(FIND_CONSTRUCTION_SITES);
    const maxSites = 100;

    const placementQueue: { pos: RoomPosition; type: BuildableStructureConstant }[] = [];

    for (const pos of Array.from(plan.sourceContainers.values())) {
      if (!this.hasStructureAt(pos, STRUCTURE_CONTAINER)) {
        placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
      }
    }

    for (const pos of plan.spawnContainers) {
      if (!this.hasStructureAt(pos, STRUCTURE_CONTAINER)) {
        placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
      }
    }

    for (const pos of plan.extensions) {
      if (!this.hasStructureAt(pos, STRUCTURE_EXTENSION)) {
        placementQueue.push({ pos, type: STRUCTURE_EXTENSION });
      }
    }

    for (const pos of plan.roads) {
      if (!this.hasStructureAt(pos, STRUCTURE_ROAD) && !this.hasStructureAt(pos, STRUCTURE_SPAWN)) {
        placementQueue.push({ pos, type: STRUCTURE_ROAD });
      }
    }

    if (plan.destContainers.controller) {
      const pos = plan.destContainers.controller;
      if (!this.hasStructureAt(pos, STRUCTURE_CONTAINER)) {
        placementQueue.push({ pos, type: STRUCTURE_CONTAINER });
      }
    }

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

  private static planExtensions(
    room: Room,
    spawn: StructureSpawn,
    count: number,
    avoidPositions: RoomPosition[] = []
  ): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const spawnPos = spawn.pos;

    const crescentOffsets = [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -2, y: 0 },
      { x: 2, y: 0 }
    ];

    for (const offset of crescentOffsets) {
      if (positions.length >= count) break;

      const pos = new RoomPosition(spawnPos.x + offset.x, spawnPos.y + offset.y, room.name);

      if (avoidPositions.some(avoid => avoid.x === pos.x && avoid.y === pos.y)) {
        continue;
      }

      if (this.isValidBuildPosition(room, pos)) {
        positions.push(pos);
      }
    }

    return positions;
  }

  private static planSpawnContainers(room: Room, spawn: StructureSpawn, sources: Source[]): RoomPosition[] {
    const containers: RoomPosition[] = [];
    const spawnPos = spawn.pos;

    for (const source of sources) {
      const path = Traveler.findTravelPath(spawnPos, source.pos);
      if (!path || path.path.length < 2) continue;

      for (const step of path.path) {
        const distance = spawnPos.getRangeTo(step.x, step.y);
        if (distance >= 2 && distance <= 3) {
          const pos = new RoomPosition(step.x, step.y, room.name);
          if (this.isValidBuildPosition(room, pos) && !containers.some(c => c.x === pos.x && c.y === pos.y)) {
            containers.push(pos);
            break;
          }
        }
      }
    }

    return containers;
  }

  private static planSourceContainer(room: Room, source: Source): RoomPosition | null {
    const adjacentPositions = this.getAdjacentPositions(room, source.pos);

    let bestPos: RoomPosition | null = null;
    let bestScore = -Infinity;

    for (const pos of adjacentPositions) {
      if (!this.isValidBuildPosition(room, pos)) continue;

      let score = 0;
      const openNeighbors = this.getAdjacentPositions(room, pos).filter(p => this.isWalkable(room, p)).length;
      score += openNeighbors * 10;

      const terrain = room.getTerrain().get(pos.x, pos.y);
      if (terrain === 0) score += 5;
      if (terrain === TERRAIN_MASK_SWAMP) score -= 5;

      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  private static planControllerContainer(
    room: Room,
    controller: StructureController,
    spawn: StructureSpawn
  ): RoomPosition | null {
    const path = Traveler.findTravelPath(spawn.pos, controller.pos);

    if (!path || path.path.length === 0) {
      console.log("⚠️ Architect: No path found from spawn to controller");
      return null;
    }

    for (let i = path.path.length - 1; i >= 0; i--) {
      const pathPos = path.path[i];
      if (this.isAdjacentTo(pathPos, controller.pos) && this.isValidBuildPosition(room, pathPos)) {
        return new RoomPosition(pathPos.x, pathPos.y, room.name);
      }
    }

    const adjacentPositions = this.getAdjacentPositions(room, controller.pos);
    for (const pos of adjacentPositions) {
      if (this.isValidBuildPosition(room, pos)) {
        return pos;
      }
    }

    return null;
  }

  private static planRoadNetwork(
    room: Room,
    spawn: StructureSpawn,
    sources: Source[],
    controller: StructureController | undefined,
    plan: ArchitectPlan
  ): RoomPosition[] {
    const roadPositions: Set<string> = new Set();
    const spawnPos = spawn.pos;

    const addPathToRoads = (fromPos: RoomPosition, toPos: RoomPosition) => {
      const roomCallback = (roomName: string): CostMatrix | boolean => {
        if (roomName !== room.name) return false;

        const costs = new PathFinder.CostMatrix();
        const terrain = room.getTerrain();

        for (let x = 0; x < 50; x++) {
          for (let y = 0; y < 50; y++) {
            const tile = terrain.get(x, y);
            costs.set(x, y, tile === TERRAIN_MASK_WALL ? 255 : 1);
          }
        }

        const structures = room.find(FIND_STRUCTURES);
        for (const structure of structures) {
          if (
            structure.structureType !== STRUCTURE_ROAD &&
            structure.structureType !== STRUCTURE_CONTAINER &&
            structure.structureType !== STRUCTURE_RAMPART
          ) {
            costs.set(structure.pos.x, structure.pos.y, 255);
          }
        }

        return costs;
      };

      const path = Traveler.findTravelPath(fromPos, toPos, {
        roomCallback,
        ignoreCreeps: true,
        maxOps: 4000
      });

      if (path && path.path.length > 0) {
        for (const step of path.path) {
          roadPositions.add(`${step.x},${step.y}`);
        }
      }
    };

    for (const containerPos of Array.from(plan.sourceContainers.values())) {
      addPathToRoads(spawnPos, containerPos);
    }

    if (plan.destContainers.controller) {
      addPathToRoads(spawnPos, plan.destContainers.controller);
    }

    const roads: RoomPosition[] = [];
    for (const posKey of Array.from(roadPositions)) {
      const [x, y] = posKey.split(",").map(Number);
      roads.push(new RoomPosition(x, y, room.name));
    }

    return roads;
  }

  private static isValidBuildPosition(room: Room, pos: RoomPosition): boolean {
    if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) return false;

    const terrain = room.getTerrain().get(pos.x, pos.y);
    if (terrain === TERRAIN_MASK_WALL) return false;

    const structures = pos.lookFor(LOOK_STRUCTURES);
    for (const structure of structures) {
      if (structure.structureType !== STRUCTURE_ROAD && structure.structureType !== STRUCTURE_CONTAINER) {
        return false;
      }
    }

    return true;
  }

  private static hasStructureAt(pos: RoomPosition, structureType: StructureConstant): boolean {
    const structures = pos.lookFor(LOOK_STRUCTURES);
    const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

    return (
      structures.some(s => s.structureType === structureType) || sites.some(s => s.structureType === structureType)
    );
  }

  private static isWalkable(room: Room, pos: RoomPosition): boolean {
    const terrain = room.getTerrain().get(pos.x, pos.y);
    return terrain !== TERRAIN_MASK_WALL;
  }

  private static getAdjacentPositions(room: Room, pos: RoomPosition): RoomPosition[] {
    const positions: RoomPosition[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
          positions.push(new RoomPosition(x, y, room.name));
        }
      }
    }
    return positions;
  }

  private static isAdjacentTo(pos1: RoomPosition, pos2: RoomPosition): boolean {
    return Math.abs(pos1.x - pos2.x) <= 1 && Math.abs(pos1.y - pos2.y) <= 1;
  }

  private static cleanupFaultySites(room: Room, plan: ArchitectPlan): number {
    const allSites = room.find(FIND_CONSTRUCTION_SITES);
    let removed = 0;

    const plannedExtensions = new Set(plan.extensions.map(pos => `${pos.x},${pos.y}`));
    const plannedContainers = new Set(
      [
        ...Array.from(plan.sourceContainers.values()).map(pos => `${pos.x},${pos.y}`),
        plan.destContainers.controller
          ? `${plan.destContainers.controller.x},${plan.destContainers.controller.y}`
          : null
      ].filter(Boolean) as string[]
    );
    const plannedRoads = new Set(plan.roads.map(pos => `${pos.x},${pos.y}`));

    for (const site of allSites) {
      const posKey = `${site.pos.x},${site.pos.y}`;
      let shouldRemove = false;

      switch (site.structureType) {
        case STRUCTURE_EXTENSION:
          shouldRemove = !plannedExtensions.has(posKey);
          if (shouldRemove) console.log(`🗑️ Architect: Removing misplaced extension at ${site.pos}`);
          break;
        case STRUCTURE_CONTAINER:
          shouldRemove = !plannedContainers.has(posKey);
          if (shouldRemove) console.log(`🗑️ Architect: Removing misplaced container at ${site.pos}`);
          break;
        case STRUCTURE_ROAD:
          shouldRemove = !plannedRoads.has(posKey);
          if (shouldRemove) console.log(`🗑️ Architect: Removing misplaced road at ${site.pos}`);
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

    return removed;
  }

  public static visualizePlan(room: Room, plan: ArchitectPlan): void {
    const visual = room.visual;

    for (const pos of plan.extensions) {
      visual.circle(pos, { fill: "green", radius: 0.4, opacity: 0.5 });
    }

    for (const pos of Array.from(plan.sourceContainers.values())) {
      visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: "yellow", opacity: 0.5 });
    }

    if (plan.destContainers.controller) {
      const pos = plan.destContainers.controller;
      visual.rect(pos.x - 0.4, pos.y - 0.4, 0.8, 0.8, { fill: "blue", opacity: 0.5 });
    }

    for (const pos of plan.roads) {
      visual.circle(pos, { fill: "gray", radius: 0.2, opacity: 0.3 });
    }
  }
}
