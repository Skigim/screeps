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
 * Get name for a structure by ID
 */
export declare function getStructureName(id: string): string;
/**
 * Get ID for a structure by name
 */
export declare function getStructureId(name: string): string | undefined;
/**
 * Scan room and auto-name structures and construction sites
 */
export declare function scanRoom(room: Room): void;
/**
 * Lock a structure (prevent actions on it)
 */
export declare function lockStructure(nameOrId: string): boolean;
/**
 * Unlock a structure
 */
export declare function unlockStructure(nameOrId: string): boolean;
/**
 * Check if a structure is locked
 */
export declare function isLocked(nameOrId: string): boolean;
/**
 * Get all structures in a room
 */
export declare function getStructuresInRoom(roomName: string): StructureInfo[];
/**
 * Get all structures of a type
 */
export declare function getStructuresByType(type: string, roomName?: string): StructureInfo[];
/**
 * Rename a structure
 */
export declare function renameStructure(oldNameOrId: string, newName: string): boolean;
/**
 * Get structure info
 */
export declare function getStructureInfo(nameOrId: string): StructureInfo | undefined;
/**
 * Get all locked structures
 */
export declare function getLockedStructures(roomName?: string): StructureInfo[];
/**
 * List all structures (for debugging)
 */
export declare function listStructures(roomName?: string): void;
/**
 * Auto-rename completed construction sites to final names
 * Called each tick to detect completed sites and rename them
 */
export declare function updateConstructionSites(room: Room): void;
//# sourceMappingURL=structures.d.ts.map