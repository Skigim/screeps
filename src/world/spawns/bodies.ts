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
 * Get or create the body registry in memory
 */
function getBodyRegistry(): Record<string, BodyConfig> {
  if (!Memory.empire) {
    Memory.empire = {};
  }
  if (!Memory.empire.bodyConfigs) {
    Memory.empire.bodyConfigs = {};
  }
  return Memory.empire.bodyConfigs as Record<string, BodyConfig>;
}

/**
 * Register a named body configuration
 * 
 * @param name - Name of the body type (e.g., 'harvester_basic', 'scout')
 * @param parts - Array of body parts (e.g., [WORK, CARRY, MOVE])
 * @param role - Optional: the role this body is designed for
 */
export function registerBody(name: string, parts: BodyPartConstant[], role: string = 'generic'): void {
  const registry = getBodyRegistry();
  registry[name] = {
    name,
    parts,
    role,
    createdAt: Game.time
  };
}

/**
 * Get a registered body configuration
 * 
 * @param nameOrArray - Name of registered body, or array of parts
 * @returns Array of body parts, or undefined if not found
 */
export function getBodyConfig(nameOrArray: string | BodyPartConstant[]): BodyPartConstant[] | undefined {
  // If it's already an array, return it
  if (Array.isArray(nameOrArray)) {
    return nameOrArray;
  }

  // Otherwise look it up
  const registry = getBodyRegistry();
  return registry[nameOrArray]?.parts;
}

/**
 * List all registered body configurations
 */
export function listBodyConfigs(role?: string): void {
  const registry = getBodyRegistry();
  const configs = role
    ? Object.values(registry).filter(c => c.role === role)
    : Object.values(registry);

  if (configs.length === 0) {
    console.log('📦 No body configurations registered');
    return;
  }

  console.log(`\n📦 Body Configurations${role ? ` (${role})` : ''}:`);
  console.log('─'.repeat(80));

  for (const config of configs) {
    const partNames = config.parts.map(p => {
      switch (p) {
        case WORK: return 'W';
        case CARRY: return 'C';
        case MOVE: return 'M';
        case ATTACK: return 'A';
        case HEAL: return 'H';
        case RANGED_ATTACK: return 'R';
        case TOUGH: return 'T';
        case CLAIM: return 'CL';
        default: return p;
      }
    }).join('');

    console.log(`  ${config.name.padEnd(25)} | ${config.role.padEnd(15)} | [${partNames}]`);
  }

  console.log('');
}

/**
 * Delete a registered body configuration
 */
export function deleteBodyConfig(name: string): boolean {
  const registry = getBodyRegistry();
  if (!registry[name]) {
    return false;
  }
  delete registry[name];
  return true;
}

/**
 * Get body cost (energy required to spawn)
 */
export function getBodyCost(nameOrArray: string | BodyPartConstant[]): number {
  const parts = getBodyConfig(nameOrArray);
  if (!parts) {
    return 0;
  }

  let cost = 0;
  for (const part of parts) {
    cost += BODYPART_COST[part];
  }
  return cost;
}

/**
 * Register default/preset body types
 * Called once on startup
 */
export function registerDefaultBodies(): void {
  // RCL1 Harvester - balanced for early game
  registerBody('harvester_basic', [WORK, CARRY, MOVE], 'harvester');

  // RCL1 Upgrader
  registerBody('upgrader_basic', [WORK, CARRY, MOVE], 'upgrader');

  // RCL1 Builder
  registerBody('builder_basic', [WORK, CARRY, MOVE], 'builder');

  // Scout - minimal, just movement
  registerBody('scout', [MOVE], 'scout');

  // Hauler - lots of carry, minimal work
  registerBody('hauler', [CARRY, CARRY, CARRY, MOVE, MOVE], 'hauler');

  // Worker - balanced work and carry
  registerBody('worker', [WORK, WORK, CARRY, MOVE], 'worker');
}
