/**
 * CREEP SPAWNING LOGIC BASED ON BEHAVIOR CONFIG
 * 
 * This module uses the behavior configuration system to:
 * - Determine which roles should be spawned
 * - Check if we're below target counts
 * - Generate appropriate bodies based on config
 */

import {
  getBehaviorConfig
} from './behaviors';

/**
 * Spawn request with priority and role info
 */
export interface SpawnRequest {
  role: string;
  body: BodyPartConstant[];
  priority: number;
  reason: string;
}

/**
 * Get all roles that need spawning (below target count)
 * 
 * @param room - The room to check
 * @returns Array of SpawnRequests sorted by priority (highest first)
 * 
 * @example
 * ```typescript
 * const requests = getSpawnRequests(room);
 * const topPriority = requests[0];
 * console.log(`Should spawn ${topPriority.role} (priority ${topPriority.priority})`);
 * ```
 */
export function getSpawnRequests(room: Room): SpawnRequest[] {
  const config = getBehaviorConfig(room.controller?.level || 1);
  const requests: SpawnRequest[] = [];

  // Count current creeps by role
  const creepsByRole = countCreepsByRole(room);

  // Check each role to see if we need more
  for (const roleConfig of config.roles) {
    const currentCount = creepsByRole[roleConfig.name] || 0;

    if (currentCount < roleConfig.targetCount) {
      requests.push({
        role: roleConfig.name,
        body: roleConfig.body,
        priority: roleConfig.priority,
        reason: `${roleConfig.name} (${currentCount}/${roleConfig.targetCount})`
      });
    }
  }

  // Sort by priority (highest first)
  return requests.sort((a, b) => b.priority - a.priority);
}

/**
 * Count creeps in room grouped by role
 * 
 * @param room - The room to count creeps in
 * @returns Object with role names as keys and counts as values
 */
function countCreepsByRole(room: Room): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const creep of room.find(FIND_MY_CREEPS)) {
    const role = creep.memory.role || 'unknown';
    counts[role] = (counts[role] || 0) + 1;
  }

  return counts;
}

/**
 * Get a human-readable summary of current vs target creep composition
 * 
 * @param room - The room to analyze
 * @returns Formatted status string
 * 
 * @example
 * ```
 * Harvesters: 2/2 ✓ | Upgraders: 1/1 ✓ | Builders: 0/1 ⚠️
 * ```
 */
export function getSpawnStatus(room: Room): string {
  const config = getBehaviorConfig(room.controller?.level || 1);
  const counts = countCreepsByRole(room);
  const parts: string[] = [];

  for (const roleConfig of config.roles) {
    const current = counts[roleConfig.name] || 0;
    const target = roleConfig.targetCount;
    const status = current >= target ? '✓' : '⚠️';
    parts.push(`${roleConfig.name}: ${current}/${target} ${status}`);
  }

  return parts.join(' | ');
}

/**
 * Get the next role that should be spawned (if any)
 * 
 * @param room - The room to check
 * @returns SpawnRequest for the highest priority role that needs spawning, or undefined
 */
export function getNextSpawnRequest(room: Room): SpawnRequest | undefined {
  const requests = getSpawnRequests(room);
  return requests.length > 0 ? requests[0] : undefined;
}
