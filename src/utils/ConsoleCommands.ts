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
      memory: { role, room: spawn.room.name, working: false, task: null }
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
   * Display hauler assignments per source
   * Usage: checkHaulers() or checkHaulers('W1N1')
   */
  public static checkHaulers(roomName?: string): string {
    const room = roomName ? Game.rooms[roomName] : Object.values(Game.rooms)[0];
    if (!room) {
      return "❌ Room not found!";
    }

    const sources = room.find(FIND_SOURCES);
    const haulers = Object.values(Game.creeps).filter(c => c.memory.role === "hauler" && c.room.name === room.name);

    let result = `🚚 Hauler Assignments in ${room.name}:\n`;
    result += `Total haulers: ${haulers.length}\n`;
    result += `Total sources: ${sources.length}\n\n`;

    for (const source of sources) {
      const assigned = haulers.filter(h => h.memory.assignedSource === source.id);
      result += `Source @ ${source.pos.x},${source.pos.y}:\n`;
      result += `  Assigned haulers: ${assigned.length}\n`;
      if (assigned.length > 0) {
        assigned.forEach(h => {
          result += `    - ${h.name} (spawning: ${h.spawning ? "yes" : "no"})\n`;
        });
      } else {
        result += `    ⚠️ NO HAULERS ASSIGNED!\n`;
      }
    }

    // Check for unassigned haulers
    const unassigned = haulers.filter(h => !h.memory.assignedSource);
    if (unassigned.length > 0) {
      result += `\n⚠️ Unassigned haulers: ${unassigned.length}\n`;
      unassigned.forEach(h => {
        result += `  - ${h.name} (spawning: ${h.spawning ? "yes" : "no"})\n`;
      });
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

  /**
   * Reset simulation room (regenerate terrain and sources)
   * Usage: resetSim()
   * Note: Only works in simulation mode
   */
  public static resetSim(): string {
    // Check if we're in simulation mode
    const room = Object.values(Game.rooms)[0];
    if (!room) {
      return "❌ No room found";
    }

    // In simulation, you need to use the UI controls to reset
    // This command provides instructions
    return `🔄 To reset simulation room:
1. Click the gear icon (⚙️) in the top-right corner
2. Select "Reset Room" or "New Room"
3. Or use the Screeps console command: Game.rooms['${room.name}'].createFlag(0, 0, 'RESET')

Note: Simulation rooms can only be reset through the UI.
Current room: ${room.name}`;
  }

  /**
   * Visualize Architect's plan using room visuals
   * Usage: showPlan() or showPlan('W1N1')
   */
  public static showPlan(roomName?: string): string {
    const room = roomName ? Game.rooms[roomName] : Object.values(Game.rooms)[0];
    if (!room) {
      return "❌ Room not found!";
    }

    // Use Architect from global scope (exposed in main.ts)
    const Architect = (global as any).Architect;
    if (!Architect) {
      return "❌ Architect not available. Make sure code is deployed correctly.";
    }

    const plan = Architect.planRoom(room);

    const visual = room.visual;

    // Draw source containers (red circles)
    for (const pos of plan.sourceContainers.values()) {
      visual.circle(pos.x, pos.y, {
        radius: 0.5,
        fill: "#ff4444",
        opacity: 0.7,
        stroke: "#ff0000",
        strokeWidth: 0.1
      });
      visual.text("📦S", pos.x, pos.y, {
        color: "#ffffff",
        font: 0.5,
        stroke: "#000000",
        strokeWidth: 0.05
      });
    }

    // Draw spawn containers (orange circles)
    for (const pos of plan.spawnContainers) {
      visual.circle(pos.x, pos.y, {
        radius: 0.5,
        fill: "#ff8800",
        opacity: 0.7,
        stroke: "#ff6600",
        strokeWidth: 0.1
      });
      visual.text("📦H", pos.x, pos.y, {
        color: "#ffffff",
        font: 0.5,
        stroke: "#000000",
        strokeWidth: 0.05
      });
    }

    // Draw controller container (purple circle)
    if (plan.destContainers.controller) {
      const pos = plan.destContainers.controller;
      visual.circle(pos.x, pos.y, {
        radius: 0.5,
        fill: "#8844ff",
        opacity: 0.7,
        stroke: "#6622dd",
        strokeWidth: 0.1
      });
      visual.text("📦C", pos.x, pos.y, {
        color: "#ffffff",
        font: 0.5,
        stroke: "#000000",
        strokeWidth: 0.05
      });
    }

    // Draw extensions (green circles)
    for (const pos of plan.extensions) {
      visual.circle(pos.x, pos.y, {
        radius: 0.4,
        fill: "#44ff44",
        opacity: 0.6,
        stroke: "#00ff00",
        strokeWidth: 0.1
      });
      visual.text("⚡", pos.x, pos.y, {
        color: "#ffffff",
        font: 0.4,
        stroke: "#000000",
        strokeWidth: 0.05
      });
    }

    // Draw roads (gray lines)
    for (const pos of plan.roads) {
      visual.circle(pos.x, pos.y, {
        radius: 0.15,
        fill: "#666666",
        opacity: 0.4
      });
    }

    return `📐 Architect Plan for ${room.name}:
🔴 📦S = Source Container (${plan.sourceContainers.size})
🟠 📦H = Spawn Hub Container (${plan.spawnContainers.length})
🟣 📦C = Controller Container (${plan.destContainers.controller ? 1 : 0})
🟢 ⚡ = Extension (${plan.extensions.length})
⚪ Road Network (${plan.roads.length} tiles)

Visuals will persist for this tick. Run again to refresh.`;
  }

  /**
   * Display current git commit hash
   * Usage: version() or hash()
   */
  public static version(): string {
    const hash = (global as any).__GIT_HASH__ || "unknown";
    const gameTime = Game.time;
    return `📋 Code Version
Git Hash: ${hash}
Game Time: ${gameTime}
Deploy verified: ${hash !== "unknown" ? "✅" : "❌"}`;
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
(global as any).resetSim = ConsoleCommands.resetSim.bind(ConsoleCommands);
(global as any).version = ConsoleCommands.version.bind(ConsoleCommands);
(global as any).hash = ConsoleCommands.version.bind(ConsoleCommands); // Alias for version
(global as any).checkHaulers = ConsoleCommands.checkHaulers.bind(ConsoleCommands);
(global as any).showPlan = ConsoleCommands.showPlan.bind(ConsoleCommands);
