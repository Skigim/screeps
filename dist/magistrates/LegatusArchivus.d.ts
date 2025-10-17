import { ArchivistReport } from '../interfaces';
/**
 * Legatus Archivus - The Archivist
 *
 * Responsibility: Observe and report on room state
 * Philosophy: No decisions, no opinions - only data
 *
 * The Archivist is the eyes and ears of the Magistrates.
 * It produces a clean, structured report that other modules consume.
 */
export declare class LegatusArchivus {
    readonly roomName: string;
    constructor(roomName: string);
    /**
     * Generate a comprehensive report on the room's current state
     */
    run(room: Room): ArchivistReport;
    /**
     * Analyze all energy sources in the room
     */
    private analyzeSources;
    /**
     * Count walkable spaces adjacent to a position
     * This determines how many creeps can actually harvest from a source
     */
    private countAvailableSpaces;
    /**
     * Analyze all spawn structures in the room
     */
    private analyzeSpawns;
    /**
     * Analyze all tower structures in the room
     */
    private analyzeTowers;
    /**
     * Analyze all container structures in the room
     */
    private analyzeContainers;
    /**
     * Analyze all construction sites in the room
     */
    private analyzeConstructionSites;
    /**
     * Analyze all structures that need repair
     */
    private analyzeRepairTargets;
    /**
     * Calculate repair priority for a structure based on type and condition
     */
    private calculateRepairPriority;
    /**
     * Analyze the room controller status
     */
    private analyzeController;
    /**
     * Count how many upgrader creeps are currently active
     */
    private countUpgraders;
    /**
     * Recommend optimal number of upgraders based on controller level
     */
    private recommendUpgraders;
    /**
     * Analyze all hostile creeps in the room
     */
    private analyzeHostiles;
    /**
     * Calculate threat level of a creep based on body composition
     */
    private calculateCreepThreat;
    /**
     * Calculate overall threat level for the room (0-10 scale)
     */
    private calculateThreatLevel;
    /**
     * Count creeps by role
     */
    private countCreepsByRole;
    /**
     * Count total creeps in the room
     */
    private countTotalCreeps;
}
//# sourceMappingURL=LegatusArchivus.d.ts.map