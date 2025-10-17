/**
 * The Empire - The Principate
 *
 * The highest authority in Project Imperium. Orchestrates all subordinate systems
 * and executes the grand strategy each tick.
 *
 * Responsibilities:
 * - Initialize all Magistrate instances per room
 * - Execute the main decision cycle each tick
 * - Handle empire-wide state management
 * - Maintain the magistrate execution chain
 */
export declare class Empire {
    private isInitialized;
    private magistratesByRoom;
    constructor();
    /**
     * Main execution function - called every game tick
     */
    run(): void;
    private initialize;
    private executeImperialStrategy;
    /**
     * Manage a single colony (room) through its magistrate council
     * Executes the full decision and execution chain
     */
    private manageColonia;
}
//# sourceMappingURL=Empire.d.ts.map