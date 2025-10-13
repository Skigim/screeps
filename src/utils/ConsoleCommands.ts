/**
 * Console commands for manual spawn control
 * Usage: Call these functions from the Screeps console
 */

import { StatsCollector } from "./StatsCollector";
import { DistanceTransformTest } from "../managers/DistanceTransformTest";

export class ConsoleCommands {
  /**
   * Spawn a creep with specified role and body parts
   * Usage: spawnCreep('harvester', [WORK, CARRY, MOVE])
   * Usage: spawnCreep('harvester', [WORK, CARRY, MOVE], 'Spawn1')
   */
  public static spawnCreep(role: string, body: BodyPartConstant[], spawnName?: string): string {
    const spawn = spawnName ? Game.spawns[spawnName] : Object.values(Game.spawns)[0];

    if (!spawn) {
      return `❌ Spawn ${spawnName || "default"} not found!`;
    }

    const name = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
    const result = spawn.spawnCreep(body, name, {
      memory: { role, room: spawn.room.name, working: false }
    });

    if (result === OK) {
      return `✅ Spawning ${role} "${name}" with body: [${body.join(", ")}]`;
    } else {
      return `❌ Failed to spawn ${role}: ${this.getErrorName(result)}`;
    }
  }

  /**
   * Spawn a harvester (quick command)
   * Usage: spawnHarvester()
   * Usage: spawnHarvester([WORK, WORK, CARRY, MOVE])
   */
  public static spawnHarvester(body?: BodyPartConstant[]): string {
    return this.spawnCreep("harvester", body || [WORK, CARRY, MOVE]);
  }

  /**
   * Spawn a builder (quick command)
   * Usage: spawnBuilder()
   * Usage: spawnBuilder([WORK, WORK, CARRY, MOVE])
   */
  public static spawnBuilder(body?: BodyPartConstant[]): string {
    return this.spawnCreep("builder", body || [WORK, CARRY, MOVE]);
  }

  /**
   * Spawn an upgrader (quick command)
   * Usage: spawnUpgrader()
   * Usage: spawnUpgrader([WORK, WORK, CARRY, MOVE])
   */
  public static spawnUpgrader(body?: BodyPartConstant[]): string {
    return this.spawnCreep("upgrader", body || [WORK, CARRY, MOVE]);
  }

  /**
   * Get creep count by role
   * Usage: getCreepCount()
   * Usage: getCreepCount('harvester')
   */
  public static getCreepCount(role?: string): string {
    if (role) {
      const count = Object.values(Game.creeps).filter(c => c.memory.role === role).length;
      return `${role}: ${count}`;
    }

    const counts: { [role: string]: number } = {};
    for (const creep of Object.values(Game.creeps)) {
      counts[creep.memory.role] = (counts[creep.memory.role] || 0) + 1;
    }

    let result = "🤖 Creep counts:\n";
    for (const [r, count] of Object.entries(counts)) {
      result += `  ${r}: ${count}\n`;
    }
    result += `  Total: ${Object.values(Game.creeps).length}`;
    return result;
  }

  /**
   * Kill a creep by name
   * Usage: killCreep('Harvester123')
   */
  public static killCreep(name: string): string {
    const creep = Game.creeps[name];
    if (!creep) {
      return `❌ Creep "${name}" not found!`;
    }
    creep.suicide();
    return `💀 Killed ${creep.memory.role} "${name}"`;
  }

  /**
   * Kill all creeps of a specific role
   * Usage: killRole('harvester')
   */
  public static killRole(role: string): string {
    const creeps = Object.values(Game.creeps).filter(c => c.memory.role === role);
    if (creeps.length === 0) {
      return `❌ No ${role}s found!`;
    }
    creeps.forEach(c => c.suicide());
    return `💀 Killed ${creeps.length} ${role}(s)`;
  }

  /**
   * Calculate body cost
   * Usage: bodyCost([WORK, WORK, CARRY, MOVE])
   */
  public static bodyCost(body: BodyPartConstant[]): string {
    const cost = body.reduce((total, part) => total + BODYPART_COST[part], 0);
    return `Body cost: ${cost} energy\nParts: [${body.join(", ")}]`;
  }

  /**
   * Generate an optimal body based on energy available
   * Usage: optimalBody('harvester', 300)
   */
  public static optimalBody(role: string, energy: number): string {
    const parts: BodyPartConstant[] = [];
    let remaining = energy;

    if (role === "harvester") {
      // Prioritize: 2 WORK, 1 CARRY, 1 MOVE as base, then scale
      const base: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
      const baseCost = this.calculateCost(base);
      if (remaining >= baseCost) {
        parts.push(...base);
        remaining -= baseCost;
        // Add more sets if possible
        while (remaining >= baseCost) {
          parts.push(...base);
          remaining -= baseCost;
        }
      }
    } else if (role === "upgrader" || role === "builder") {
      // Balanced WORK, CARRY, MOVE
      while (remaining >= 200) {
        parts.push(WORK, CARRY, MOVE);
        remaining -= 200;
      }
    }

    if (parts.length === 0) {
      return `❌ Not enough energy (${energy}) for ${role}`;
    }

    return `Optimal ${role} body (${energy} energy):\n[${parts.join(", ")}]\nCost: ${this.calculateCost(parts)} energy`;
  }

  /**
   * List all spawns and their status
   * Usage: listSpawns()
   */
  public static listSpawns(): string {
    let result = "🏭 Spawns:\n";
    for (const [name, spawn] of Object.entries(Game.spawns)) {
      result += `  ${name} - Room: ${spawn.room.name}\n`;
      result += `    Energy: ${spawn.room.energyAvailable}/${spawn.room.energyCapacityAvailable}\n`;
      if (spawn.spawning) {
        const spawningCreep = Game.creeps[spawn.spawning.name];
        result += `    Spawning: ${spawningCreep.memory.role} (${spawn.spawning.remainingTime} ticks)\n`;
      } else {
        result += `    Status: Idle\n`;
      }
    }
    return result;
  }

  /**
   * Display stats summary
   * Usage: stats()
   */
  public static showStats(): void {
    StatsCollector.displaySummary();
  }

  /**
   * Clear all collected stats
   * Usage: clearStats()
   */
  public static clearStats(): string {
    StatsCollector.clear();
    return "✅ Stats cleared";
  }

  /**
   * Test Distance Transform algorithm
   * Usage: testDistanceTransform('W1N1')
   */
  public static testDistanceTransform(roomName: string): void {
    DistanceTransformTest.run(roomName);
  }

  // Helper methods
  private static calculateCost(body: BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
  }

  private static getErrorName(code: number): string {
    const errors: { [key: number]: string } = {
      [ERR_NOT_OWNER]: "ERR_NOT_OWNER",
      [ERR_NAME_EXISTS]: "ERR_NAME_EXISTS",
      [ERR_BUSY]: "ERR_BUSY",
      [ERR_NOT_ENOUGH_ENERGY]: "ERR_NOT_ENOUGH_ENERGY",
      [ERR_INVALID_ARGS]: "ERR_INVALID_ARGS",
      [ERR_RCL_NOT_ENOUGH]: "ERR_RCL_NOT_ENOUGH"
    };
    return errors[code] || `Error code: ${code}`;
  }
}

// Expose commands to global scope for console use
(global as any).spawn = ConsoleCommands.spawnCreep.bind(ConsoleCommands);
(global as any).spawnHarvester = ConsoleCommands.spawnHarvester.bind(ConsoleCommands);
(global as any).spawnBuilder = ConsoleCommands.spawnBuilder.bind(ConsoleCommands);
(global as any).spawnUpgrader = ConsoleCommands.spawnUpgrader.bind(ConsoleCommands);
(global as any).creeps = ConsoleCommands.getCreepCount.bind(ConsoleCommands);
(global as any).killCreep = ConsoleCommands.killCreep.bind(ConsoleCommands);
(global as any).killRole = ConsoleCommands.killRole.bind(ConsoleCommands);
(global as any).bodyCost = ConsoleCommands.bodyCost.bind(ConsoleCommands);
(global as any).optimalBody = ConsoleCommands.optimalBody.bind(ConsoleCommands);
(global as any).spawns = ConsoleCommands.listSpawns.bind(ConsoleCommands);
(global as any).stats = ConsoleCommands.showStats.bind(ConsoleCommands);
(global as any).clearStats = ConsoleCommands.clearStats.bind(ConsoleCommands);
(global as any).testDistanceTransform = ConsoleCommands.testDistanceTransform.bind(ConsoleCommands);
