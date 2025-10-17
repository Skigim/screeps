/**
 * Legatus Fabrum - The Architect
 * 
 * Responsibility: Place construction sites according to room blueprints
 * Philosophy: Every room should be a masterpiece of efficiency
 * 
 * The Architect plans and places structures to optimize room layout.
 * Currently implements RCL 1-3 infrastructure.
 */
export class LegatusFabrum {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze room and place construction sites based on RCL
   */
  public run(): void {
    const room = Game.rooms[this.roomName];
    if (!room || !room.controller || !room.controller.my) return;

    const rcl = room.controller.level;
    
    // Place structures based on RCL progression
    if (rcl >= 2) {
      this.placeExtensions(room);
    }
    
    if (rcl >= 3) {
      this.placeTower(room);
      this.placeContainers(room);
    }
    
    // Future: Roads, ramparts, walls, storage, etc.
  }

  /**
   * Place extensions near spawn
   * RCL 2: 5 extensions, RCL 3: 10 extensions, etc.
   * Strategy: Place ONE at a time, evenly distributed in rings
   */
  private placeExtensions(room: Room): void {
    const rcl = room.controller!.level;
    
    // Extension limits by RCL
    const extensionLimits: { [key: number]: number } = {
      2: 5,
      3: 10,
      4: 20,
      5: 30,
      6: 40,
      7: 50,
      8: 60
    };
    
    const maxExtensions = extensionLimits[rcl] || 0;
    
    // Count existing extensions and construction sites
    const existingExtensions = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }).length;
    
    const extensionSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }).length;
    
    const totalExtensions = existingExtensions + extensionSites;
    
    if (totalExtensions >= maxExtensions) return; // Already have enough
    
    // ONLY place ONE construction site at a time
    if (extensionSites > 0) return; // Wait for current site to be built
    
    // Find spawn to build near
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;
    
    // Place extensions evenly distributed in rings
    // Use a deterministic pattern to ensure even spacing
    const extensionsNeeded = 1; // ONE AT A TIME
    let placed = 0;
    
    // Search in expanding rings around spawn
    for (let range = 2; range <= 5 && placed < extensionsNeeded; range++) {
      const positions = this.getEvenlyDistributedPositions(spawn.pos, range);
      
      for (const pos of positions) {
        if (placed >= extensionsNeeded) break;
        
        // Check if position is valid for extension
        if (this.canPlaceStructure(room, pos)) {
          const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
          if (result === OK) {
            placed++;
            console.log(`🏗️ Architect: Placed EXTENSION at ${pos.x},${pos.y} (${totalExtensions + 1}/${maxExtensions})`);
          }
        }
      }
    }
  }

  /**
   * Place tower for defense (RCL 3+)
   */
  private placeTower(room: Room): void {
    // Check if we already have a tower or construction site
    const existingTowers = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    }).length;
    
    const towerSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    }).length;
    
    if (existingTowers + towerSites > 0) return;
    
    // Place tower near controller for defense
    const controller = room.controller!;
    const positions = this.getPositionsInRange(controller.pos, 3);
    
    for (const pos of positions) {
      if (this.canPlaceStructure(room, pos)) {
        const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
        if (result === OK) {
          console.log(`🏗️ Architect: Placed TOWER at ${pos.x},${pos.y}`);
          return;
        }
      }
    }
  }

  /**
   * Place containers near sources (RCL 3+)
   */
  private placeContainers(room: Room): void {
    const sources = room.find(FIND_SOURCES);
    
    sources.forEach(source => {
      // Check if source already has container or site
      const existingContainer = room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                      s.pos.inRangeTo(source.pos, 1)
      }).length;
      
      const containerSite = room.find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                      s.pos.inRangeTo(source.pos, 1)
      }).length;
      
      if (existingContainer + containerSite > 0) return;
      
      // Place container adjacent to source
      const positions = this.getPositionsInRange(source.pos, 1);
      
      for (const pos of positions) {
        if (this.canPlaceStructure(room, pos)) {
          const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
          if (result === OK) {
            console.log(`🏗️ Architect: Placed CONTAINER near source at ${pos.x},${pos.y}`);
            return;
          }
        }
      }
    });
  }

  /**
   * Get all positions in a specific range (ring) around a position
   */
  private getPositionsInRange(pos: RoomPosition, range: number): RoomPosition[] {
    const positions: RoomPosition[] = [];
    
    for (let x = pos.x - range; x <= pos.x + range; x++) {
      for (let y = pos.y - range; y <= pos.y + range; y++) {
        // Only positions at exactly this range (ring, not filled circle)
        const dx = Math.abs(x - pos.x);
        const dy = Math.abs(y - pos.y);
        if (Math.max(dx, dy) !== range) continue;
        
        if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
          positions.push(new RoomPosition(x, y, pos.roomName));
        }
      }
    }
    
    return positions;
  }

  /**
   * Get evenly distributed positions around a point
   * Prioritizes cardinal directions and diagonals for balanced spacing
   */
  private getEvenlyDistributedPositions(pos: RoomPosition, range: number): RoomPosition[] {
    const positions: RoomPosition[] = [];
    
    // For each ring, prioritize 8 main directions (N, NE, E, SE, S, SW, W, NW)
    // This creates balanced, cross-pattern distribution
    const directions = [
      { dx: 0, dy: -1 },  // North
      { dx: 1, dy: -1 },  // Northeast
      { dx: 1, dy: 0 },   // East
      { dx: 1, dy: 1 },   // Southeast
      { dx: 0, dy: 1 },   // South
      { dx: -1, dy: 1 },  // Southwest
      { dx: -1, dy: 0 },  // West
      { dx: -1, dy: -1 }  // Northwest
    ];
    
    // Add primary 8 directions at this range
    for (const dir of directions) {
      const x = pos.x + (dir.dx * range);
      const y = pos.y + (dir.dy * range);
      
      if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
        positions.push(new RoomPosition(x, y, pos.roomName));
      }
    }
    
    // Add remaining positions in the ring (fills gaps between cardinal/diagonal)
    for (let x = pos.x - range; x <= pos.x + range; x++) {
      for (let y = pos.y - range; y <= pos.y + range; y++) {
        const dx = Math.abs(x - pos.x);
        const dy = Math.abs(y - pos.y);
        if (Math.max(dx, dy) !== range) continue;
        
        // Skip if already added (cardinal/diagonal)
        const alreadyAdded = positions.some(p => p.x === x && p.y === y);
        if (alreadyAdded) continue;
        
        if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
          positions.push(new RoomPosition(x, y, pos.roomName));
        }
      }
    }
    
    return positions;
  }

  /**
   * Check if a structure can be placed at this position
   */
  private canPlaceStructure(room: Room, pos: RoomPosition): boolean {
    // Check terrain
    const terrain = room.getTerrain();
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;
    
    // Check for existing structures
    const structures = pos.lookFor(LOOK_STRUCTURES);
    if (structures.length > 0) return false;
    
    // Check for construction sites
    const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
    if (sites.length > 0) return false;
    
    // Don't build on source or controller
    const sources = pos.lookFor(LOOK_SOURCES);
    if (sources.length > 0) return false;
    
    // Check controller
    if (room.controller && pos.isEqualTo(room.controller.pos)) return false;
    
    return true;
  }
}

