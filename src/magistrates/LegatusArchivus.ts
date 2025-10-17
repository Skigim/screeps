/// <reference types="screeps" />

import {
  ArchivistReport,
  SourceReport,
  SpawnReport,
  TowerReport,
  ContainerReport,
  ConstructionSiteReport,
  RepairTargetReport,
  ControllerReport,
  HostileReport
} from '../interfaces';

/**
 * Legatus Archivus - The Archivist
 * 
 * Responsibility: Observe and report on room state
 * Philosophy: No decisions, no opinions - only data
 * 
 * The Archivist is the eyes and ears of the Magistrates.
 * It produces a clean, structured report that other modules consume.
 */
export class LegatusArchivus {
  constructor(readonly roomName: string) {}

  /**
   * Generate a comprehensive report on the room's current state
   */
  public run(room: Room): ArchivistReport {
    return {
      roomName: room.name,
      rcl: room.controller?.level || 0,
      
      energyAvailable: room.energyAvailable,
      energyCapacityAvailable: room.energyCapacityAvailable,
      energyDeficit: room.energyCapacityAvailable - room.energyAvailable,
      
      sources: this.analyzeSources(room),
      spawns: this.analyzeSpawns(room),
      extensions: room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_EXTENSION
      }).length,
      towers: this.analyzeTowers(room),
      containers: this.analyzeContainers(room),
      storageAvailable: room.storage !== undefined,
      storageEnergy: room.storage?.store[RESOURCE_ENERGY] || 0,
      
      constructionSites: this.analyzeConstructionSites(room),
      repairTargets: this.analyzeRepairTargets(room),
      
      controller: this.analyzeController(room),
      
      hostiles: this.analyzeHostiles(room),
      hostileThreatLevel: this.calculateThreatLevel(room),
      
      creepsByRole: this.countCreepsByRole(room),
      totalCreeps: this.countTotalCreeps(room),
      
      highTrafficPositions: [] // TODO: Implement traffic analysis
    };
  }

  /**
   * Analyze all energy sources in the room
   */
  private analyzeSources(room: Room): SourceReport[] {
    const sources = room.find(FIND_SOURCES);
    return sources.map(source => {
      const harvesters = room.find(FIND_MY_CREEPS, {
        filter: (c) => c.memory.role === 'harvester' && 
                       c.memory.targetId === source.id
      });
      
      // Calculate available harvesting positions around source
      const availableSpaces = this.countAvailableSpaces(room, source.pos);
      
      return {
        id: source.id,
        pos: { x: source.pos.x, y: source.pos.y },
        energy: source.energy,
        energyCapacity: source.energyCapacity,
        harvestersPresent: harvesters.length,
        harvestersNeeded: availableSpaces // Use actual terrain-based capacity
      };
    });
  }

  /**
   * Count walkable spaces adjacent to a position
   * This determines how many creeps can actually harvest from a source
   */
  private countAvailableSpaces(room: Room, pos: RoomPosition): number {
    const terrain = room.getTerrain();
    let spaces = 0;
    
    // Check all 8 adjacent tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the center (source itself)
        
        const x = pos.x + dx;
        const y = pos.y + dy;
        
        // Check bounds
        if (x < 0 || x > 49 || y < 0 || y > 49) continue;
        
        // Check terrain
        const terrainType = terrain.get(x, y);
        if (terrainType !== TERRAIN_MASK_WALL) {
          spaces++;
        }
      }
    }
    
    return spaces;
  }

  /**
   * Analyze all spawn structures in the room
   */
  private analyzeSpawns(room: Room): SpawnReport[] {
    const spawns = room.find(FIND_MY_SPAWNS);
    return spawns.map(spawn => ({
      id: spawn.id,
      spawning: spawn.spawning !== null,
      energy: spawn.store[RESOURCE_ENERGY],
      energyCapacity: spawn.store.getCapacity(RESOURCE_ENERGY)
    }));
  }

  /**
   * Analyze all tower structures in the room
   */
  private analyzeTowers(room: Room): TowerReport[] {
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    }) as StructureTower[];
    
    return towers.map(tower => ({
      id: tower.id,
      energy: tower.store[RESOURCE_ENERGY],
      energyCapacity: tower.store.getCapacity(RESOURCE_ENERGY),
      needsRefill: tower.store[RESOURCE_ENERGY] < tower.store.getCapacity(RESOURCE_ENERGY) * 0.5
    }));
  }

  /**
   * Analyze all container structures in the room
   */
  private analyzeContainers(room: Room): ContainerReport[] {
    const containers = room.find(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER
    }) as StructureContainer[];
    
    return containers.map(container => ({
      id: container.id,
      pos: { x: container.pos.x, y: container.pos.y },
      store: { energy: container.store[RESOURCE_ENERGY] },
      storeCapacity: container.store.getCapacity(RESOURCE_ENERGY)
    }));
  }

  /**
   * Analyze all construction sites in the room
   */
  private analyzeConstructionSites(room: Room): ConstructionSiteReport[] {
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    return sites.map(site => ({
      id: site.id,
      structureType: site.structureType,
      progress: site.progress,
      progressTotal: site.progressTotal,
      pos: { x: site.pos.x, y: site.pos.y }
    }));
  }

  /**
   * Analyze all structures that need repair
   */
  private analyzeRepairTargets(room: Room): RepairTargetReport[] {
    const structures = room.find(FIND_STRUCTURES, {
      filter: (s) => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL
    });
    
    return structures.map(structure => ({
      id: structure.id,
      structureType: structure.structureType,
      hits: structure.hits,
      hitsMax: structure.hitsMax,
      priority: this.calculateRepairPriority(structure),
      pos: { x: structure.pos.x, y: structure.pos.y }
    }));
  }

  /**
   * Calculate repair priority for a structure based on type and condition
   */
  private calculateRepairPriority(structure: Structure): number {
    const hitPercent = structure.hits / structure.hitsMax;
    
    // Critical structures get higher priority
    const criticalStructures: StructureConstant[] = [
      STRUCTURE_SPAWN,
      STRUCTURE_TOWER,
      STRUCTURE_STORAGE,
      STRUCTURE_TERMINAL
    ];
    
    if ((criticalStructures as StructureConstant[]).includes(structure.structureType)) {
      return hitPercent < 0.5 ? 90 : 70;
    }
    
    return hitPercent < 0.3 ? 50 : 30;
  }

  /**
   * Analyze the room controller status
   */
  private analyzeController(room: Room): ControllerReport {
    const controller = room.controller!;
    return {
      id: controller.id,
      level: controller.level,
      progress: controller.progress,
      progressTotal: controller.progressTotal,
      ticksToDowngrade: controller.ticksToDowngrade || 0,
      upgraderCount: this.countUpgraders(room),
      upgraderRecommendation: this.recommendUpgraders(controller)
    };
  }

  /**
   * Count how many upgrader creeps are currently active
   */
  private countUpgraders(room: Room): number {
    return room.find(FIND_MY_CREEPS, {
      filter: (c) => c.memory.role === 'upgrader'
    }).length;
  }

  /**
   * Recommend optimal number of upgraders based on controller level
   */
  private recommendUpgraders(controller: StructureController): number {
    // Simple logic: more upgraders for higher RCL
    if (controller.level < 3) return 1;
    if (controller.level < 5) return 2;
    return 3;
  }

  /**
   * Analyze all hostile creeps in the room
   */
  private analyzeHostiles(room: Room): HostileReport[] {
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    return hostiles.map(hostile => ({
      id: hostile.id,
      pos: { x: hostile.pos.x, y: hostile.pos.y },
      owner: hostile.owner.username,
      body: hostile.body.map(part => part.type),
      threatLevel: this.calculateCreepThreat(hostile)
    }));
  }

  /**
   * Calculate threat level of a creep based on body composition
   */
  private calculateCreepThreat(creep: Creep): number {
    let threat = 0;
    creep.body.forEach(part => {
      if (part.type === ATTACK) threat += 3;
      if (part.type === RANGED_ATTACK) threat += 2;
      if (part.type === HEAL) threat += 2;
      if (part.type === TOUGH) threat += 1;
    });
    return threat;
  }

  /**
   * Calculate overall threat level for the room (0-10 scale)
   */
  private calculateThreatLevel(room: Room): number {
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    if (hostiles.length === 0) return 0;
    
    const totalThreat = hostiles.reduce((sum, h) => sum + this.calculateCreepThreat(h), 0);
    return Math.min(10, Math.ceil(totalThreat / 5));
  }

  /**
   * Count creeps by role
   */
  private countCreepsByRole(room: Room): Map<string, number> {
    const creeps = room.find(FIND_MY_CREEPS);
    const counts = new Map<string, number>();
    
    creeps.forEach(creep => {
      const role = creep.memory.role || 'unknown';
      counts.set(role, (counts.get(role) || 0) + 1);
    });
    
    return counts;
  }

  /**
   * Count total creeps in the room
   */
  private countTotalCreeps(room: Room): number {
    return room.find(FIND_MY_CREEPS).length;
  }
}
