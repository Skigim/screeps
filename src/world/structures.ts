/**
 * STRUCTURE REGISTRY & NAMING SYSTEM
 * 
 * Automatically assigns human-readable names to structures.
 * Stores mapping between IDs and names in Memory.
 * 
 * Examples:
 * - Sources: SourceA, SourceB
 * - Spawns: SpawnMain, SpawnBackup
 * - Extensions: ExtensionA, ExtensionB
 * - Containers: ContainerA, ContainerB
 * - Controllers: ControllerMain
 */

export interface StructureInfo {
  id: string;
  name: string;
  type: string;
  roomName: string;
  locked: boolean;
  createdAt: number;
}

/**
 * Get or create the structures registry in memory
 */
function getRegistry(): Record<string, StructureInfo> {
  if (!Memory.structures) {
    Memory.structures = {};
  }
  return Memory.structures as Record<string, StructureInfo>;
}

/**
 * Register a structure with a name
 */
function registerStructure(id: string, name: string, type: string, roomName: string): void {
  const registry = getRegistry();
  registry[id] = {
    id,
    name,
    type,
    roomName,
    locked: false,
    createdAt: Game.time
  };
}

/**
 * Get name for a structure by ID
 */
export function getStructureName(id: string): string {
  const registry = getRegistry();
  return registry[id]?.name || id;
}

/**
 * Get ID for a structure by name
 */
export function getStructureId(name: string): string | undefined {
  const registry = getRegistry();
  for (const [id, info] of Object.entries(registry)) {
    if (info.name === name) {
      return id;
    }
  }
  return undefined;
}

/**
 * Scan room and auto-name structures and construction sites
 */
export function scanRoom(room: Room): void {
  const registry = getRegistry();

  // Sources
  const sources = room.find(FIND_SOURCES);
  sources.forEach((source, index) => {
    if (!registry[source.id]) {
      const letter = String.fromCharCode(65 + index); // A, B, C...
      registerStructure(source.id, `Source${letter}`, 'source', room.name);
    }
  });

  // Spawns
  const spawns = room.find(FIND_MY_SPAWNS);
  spawns.forEach((spawn, index) => {
    if (!registry[spawn.id]) {
      const name = index === 0 ? 'SpawnMain' : `SpawnBackup${index}`;
      registerStructure(spawn.id, name, 'spawn', room.name);
    }
  });

  // Extensions
  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  });
  extensions.forEach((ext, index) => {
    if (!registry[ext.id]) {
      const letter = String.fromCharCode(65 + index);
      registerStructure(ext.id, `Extension${letter}`, 'extension', room.name);
    }
  });

  // Containers (they're resources, not structures in the Screeps API)
  // Skip containers in this scan as they're handled separately

  // Storage
  const storage = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_STORAGE
  });
  storage.forEach(stor => {
    if (!registry[stor.id]) {
      registerStructure(stor.id, 'Storage', 'storage', room.name);
    }
  });

  // Controller
  if (room.controller && !registry[room.controller.id]) {
    registerStructure(room.controller.id, 'Controller', 'controller', room.name);
  }

  // Construction sites - name them site1, site2, etc.
  const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
  sites.forEach(site => {
    if (!registry[site.id]) {
      // Find the next available site number
      let siteNum = 1;
      while (Object.values(registry).some(s => s.name === `site${siteNum}` && s.roomName === room.name)) {
        siteNum++;
      }
      registerStructure(site.id, `site${siteNum}`, 'site', room.name);
    }
  });
}

/**
 * Lock a structure (prevent actions on it)
 */
export function lockStructure(nameOrId: string): boolean {
  const registry = getRegistry();
  const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);

  if (!id || !registry[id]) {
    return false;
  }

  registry[id].locked = true;
  return true;
}

/**
 * Unlock a structure
 */
export function unlockStructure(nameOrId: string): boolean {
  const registry = getRegistry();
  const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);

  if (!id || !registry[id]) {
    return false;
  }

  registry[id].locked = false;
  return true;
}

/**
 * Check if a structure is locked
 */
export function isLocked(nameOrId: string): boolean {
  const registry = getRegistry();
  const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);

  if (!id || !registry[id]) {
    return false;
  }

  return registry[id].locked;
}

/**
 * Get all structures in a room
 */
export function getStructuresInRoom(roomName: string): StructureInfo[] {
  const registry = getRegistry();
  return Object.values(registry).filter(s => s.roomName === roomName);
}

/**
 * Get all structures of a type
 */
export function getStructuresByType(type: string, roomName?: string): StructureInfo[] {
  const registry = getRegistry();
  return Object.values(registry).filter(s => 
    s.type === type && (!roomName || s.roomName === roomName)
  );
}

/**
 * Rename a structure
 */
export function renameStructure(oldNameOrId: string, newName: string): boolean {
  const registry = getRegistry();
  const id = registry[oldNameOrId] ? oldNameOrId : getStructureId(oldNameOrId);

  if (!id || !registry[id]) {
    return false;
  }

  // Check if new name is already taken
  for (const [otherId, info] of Object.entries(registry)) {
    if (otherId !== id && info.name === newName) {
      return false; // Name conflict
    }
  }

  registry[id].name = newName;
  return true;
}

/**
 * Get structure info
 */
export function getStructureInfo(nameOrId: string): StructureInfo | undefined {
  const registry = getRegistry();
  const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);

  if (!id) {
    return undefined;
  }

  return registry[id];
}

/**
 * Get all locked structures
 */
export function getLockedStructures(roomName?: string): StructureInfo[] {
  const registry = getRegistry();
  return Object.values(registry).filter(s => 
    s.locked && (!roomName || s.roomName === roomName)
  );
}

/**
 * List all structures (for debugging)
 */
export function listStructures(roomName?: string): void {
  const registry = getRegistry();
  const structures = roomName
    ? Object.values(registry).filter(s => s.roomName === roomName)
    : Object.values(registry);

  if (structures.length === 0) {
    console.log('No structures registered');
    return;
  }

  console.log('\nRegistered Structures:');
  console.log('─'.repeat(80));

  for (const info of structures) {
    const locked = info.locked ? '🔒' : '🔓';
    console.log(
      `${locked} ${info.name.padEnd(20)} | ${info.type.padEnd(12)} | ${info.roomName} | ${info.id.substring(0, 8)}...`
    );
  }

  console.log('');
}

/**
 * Auto-rename completed construction sites to final names
 * Called each tick to detect completed sites and rename them
 */
export function updateConstructionSites(room: Room): void {
  const registry = getRegistry();

  // Find all completed structures that were built from sites
  const completedStructures = room.find(FIND_MY_STRUCTURES);

  completedStructures.forEach(struct => {
    // Check if this structure is NOT in the registry with a permanent name
    const existing = Object.values(registry).find(s => s.id === struct.id);

    // If it's not registered, register it
    if (!existing) {
      let name = '';
      const type = struct.structureType;

      // Generate name based on type and existing count
      switch (type) {
        case STRUCTURE_EXTENSION: {
          const count = Object.values(registry).filter(s => s.type === 'extension' && s.roomName === room.name).length;
          const letter = String.fromCharCode(65 + count);
          name = `Extension${letter}`;
          break;
        }
        case STRUCTURE_TOWER: {
          const count = Object.values(registry).filter(s => s.type === 'tower' && s.roomName === room.name).length;
          const letter = String.fromCharCode(65 + count);
          name = `Tower${letter}`;
          break;
        }
        case STRUCTURE_STORAGE:
          name = 'Storage';
          break;
        case STRUCTURE_RAMPART: {
          const count = Object.values(registry).filter(s => s.type === 'rampart' && s.roomName === room.name).length;
          const letter = String.fromCharCode(65 + count);
          name = `Rampart${letter}`;
          break;
        }
        default:
          name = `${type}${Game.time}`;
      }

      registerStructure(struct.id, name, type, room.name);
    }
  });

  // Check for completed construction sites and rename them
  const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
  const siteIds = new Set(sites.map(s => s.id));

  // If a registered site is no longer in the construction list, it was completed
  const registryArray = Object.entries(registry);
  for (const [id, info] of registryArray) {
    if (info.roomName === room.name && info.type === 'site' && !siteIds.has(id as any)) {
      // Site completed! Remove the site entry - it will be picked up as a new structure above
      delete registry[id];
    }
  }
}

