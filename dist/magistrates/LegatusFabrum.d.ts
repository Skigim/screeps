/**
 * Legatus Fabrum - The Architect
 *
 * Responsibility: Place construction sites according to room blueprints
 * Philosophy: Every room should be a masterpiece of efficiency
 *
 * The Architect plans and places structures to optimize room layout.
 * Currently implements RCL 1-3 infrastructure.
 */
export declare class LegatusFabrum {
    private roomName;
    constructor(roomName: string);
    /**
     * Analyze room and place construction sites based on RCL
     */
    run(): void;
    /**
     * Place extensions near spawn
     * RCL 2: 5 extensions, RCL 3: 10 extensions, etc.
     * Strategy: Place ONE at a time, evenly distributed in rings
     */
    private placeExtensions;
    /**
     * Place tower for defense (RCL 3+)
     */
    private placeTower;
    /**
     * Place containers near sources (RCL 3+)
     */
    private placeContainers;
    /**
     * Get all positions in a specific range (ring) around a position
     */
    private getPositionsInRange;
    /**
     * Get evenly distributed positions around a point
     * Prioritizes cardinal directions and diagonals for balanced spacing
     */
    private getEvenlyDistributedPositions;
    /**
     * Check if a structure can be placed at this position
     */
    private canPlaceStructure;
}
//# sourceMappingURL=LegatusFabrum.d.ts.map