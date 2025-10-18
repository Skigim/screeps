/**
 * DYNAMIC BODY SCALING
 *
 * Scales creep bodies based on room energy capacity to maximize efficiency.
 * Larger bodies = better resource efficiency, but requires more upfront energy.
 */
/**
 * Get optimal miner body for current energy capacity
 * Miners need: WORK (mining), CARRY (buffering), MOVE (efficiency)
 *
 * Strategy: Maximize WORK to mine faster, then add CARRY/MOVE as needed
 */
export declare function getOptimalMinerBody(energyCapacity: number): BodyPartConstant[];
/**
 * Get optimal hauler body for current energy capacity
 * Haulers need: CARRY (capacity), MOVE (speed to move full load)
 *
 * Strategy: 1 MOVE per 2 CARRY to handle full loads without fatigue
 */
export declare function getOptimalHaulerBody(energyCapacity: number): BodyPartConstant[];
/**
 * Get optimal builder body for current energy capacity
 * Builders need: WORK (building), CARRY (energy for builds), MOVE (getting to sites)
 */
export declare function getOptimalBuilderBody(energyCapacity: number): BodyPartConstant[];
/**
 * Get body cost total
 */
export declare function calculateBodyCost(body: BodyPartConstant[]): number;
//# sourceMappingURL=bodyScaling.d.ts.map