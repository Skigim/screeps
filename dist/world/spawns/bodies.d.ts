/**
 * BODY CONFIG REGISTRY
 *
 * Stores named body configurations for easy creep spawning.
 * Allows preset bodies and dynamic body construction.
 *
 * Examples:
 * - registerBody('harvester1', [WORK, CARRY, MOVE])
 * - registerBody('scout', [MOVE])
 * - spawnCreep('Scout1', 'scout', 'scout', 'W1N1')
 */
export interface BodyConfig {
    name: string;
    parts: BodyPartConstant[];
    role: string;
    createdAt: number;
}
/**
 * Register a named body configuration
 *
 * @param name - Name of the body type (e.g., 'harvester_basic', 'scout')
 * @param parts - Array of body parts (e.g., [WORK, CARRY, MOVE])
 * @param role - Optional: the role this body is designed for
 */
export declare function registerBody(name: string, parts: BodyPartConstant[], role?: string): void;
/**
 * Get a registered body configuration
 *
 * @param nameOrArray - Name of registered body, or array of parts
 * @returns Array of body parts, or undefined if not found
 */
export declare function getBodyConfig(nameOrArray: string | BodyPartConstant[]): BodyPartConstant[] | undefined;
/**
 * List all registered body configurations
 */
export declare function listBodyConfigs(role?: string): void;
/**
 * Delete a registered body configuration
 */
export declare function deleteBodyConfig(name: string): boolean;
/**
 * Get body cost (energy required to spawn)
 */
export declare function getBodyCost(nameOrArray: string | BodyPartConstant[]): number;
/**
 * Register default/preset body types
 * Called once on startup
 */
export declare function registerDefaultBodies(): void;
//# sourceMappingURL=bodies.d.ts.map