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
export function getOptimalMinerBody(energyCapacity: number): BodyPartConstant[] {
  // Minimum viable miner
  if (energyCapacity < 250) {
    return [WORK, WORK, MOVE];
  }

  // Small miner
  if (energyCapacity < 500) {
    return [WORK, WORK, WORK, MOVE];
  }

  // Medium miner - good energy capacity sweet spot
  if (energyCapacity < 800) {
    return [WORK, WORK, WORK, WORK, CARRY, MOVE];
  }

  // Large miner
  if (energyCapacity < 1200) {
    return [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
  }

  // Max miner
  return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
}

/**
 * Get optimal hauler body for current energy capacity
 * Haulers need: CARRY (capacity), MOVE (speed to move full load)
 * 
 * Strategy: 1 MOVE per 2 CARRY to handle full loads without fatigue
 */
export function getOptimalHaulerBody(energyCapacity: number): BodyPartConstant[] {
  // Minimum hauler
  if (energyCapacity < 200) {
    return [CARRY, CARRY, MOVE];
  }

  // Small hauler
  if (energyCapacity < 400) {
    return [CARRY, CARRY, CARRY, MOVE, MOVE];
  }

  // Medium hauler - sweet spot
  if (energyCapacity < 600) {
    return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
  }

  // Large hauler
  if (energyCapacity < 900) {
    return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
  }

  // Max hauler
  return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
}

/**
 * Get optimal builder body for current energy capacity
 * Builders need: WORK (building), CARRY (energy for builds), MOVE (getting to sites)
 */
export function getOptimalBuilderBody(energyCapacity: number): BodyPartConstant[] {
  // Minimum builder
  if (energyCapacity < 250) {
    return [WORK, CARRY, MOVE];
  }

  // Small builder
  if (energyCapacity < 400) {
    return [WORK, WORK, CARRY, MOVE];
  }

  // Medium builder
  if (energyCapacity < 600) {
    return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
  }

  // Large builder
  if (energyCapacity < 900) {
    return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
  }

  // Max builder
  return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
}

/**
 * Get body cost total
 */
export function calculateBodyCost(body: BodyPartConstant[]): number {
  return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
}
