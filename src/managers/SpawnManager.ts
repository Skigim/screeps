import { RCL1Config } from "configs/RCL1Config";
import type { RCLConfig, RoleConfig } from "configs/RCL1Config";

/**
 * Central Spawn Manager
 * Handles spawning logic for all RCL levels by importing RCL-specific configs
 */
export class SpawnManager {
  // Map of RCL configs
  private static readonly RCL_CONFIGS: { [rcl: number]: RCLConfig } = {
    1: RCL1Config
    // TODO: Add RCL 2-8 configs as we progress
  };

  /**
   * Main spawn logic - delegates to RCL-specific config
   */
  public static run(spawn: StructureSpawn): void {
    // Don't spawn if already spawning
    if (spawn.spawning) {
      this.displaySpawningStatus(spawn);
      return;
    }

    const room = spawn.room;
    if (!room.controller) return;

    const rcl = room.controller.level;
    const config = this.getConfigForRCL(rcl);

    if (!config) {
      console.log(`⚠️ No spawn config available (tried RCL ${rcl} and all fallbacks)`);
      return;
    }

    // Count creeps by role in this room
    const creepCounts = this.getCreepCounts(room);

    // Display status periodically
    if (Game.time % 10 === 0) {
      this.displayStatus(room, config, creepCounts);
    }

    // Spawn based on priority
    this.spawnByPriority(spawn, config, creepCounts);
  }

  /**
   * Get config for a specific RCL, with fallback to highest available RCL config
   * Example: If RCL 5 is requested but only RCL 1-3 configs exist, use RCL 3
   */
  private static getConfigForRCL(rcl: number): RCLConfig | null {
    // Try exact RCL match first
    if (this.RCL_CONFIGS[rcl]) {
      return this.RCL_CONFIGS[rcl];
    }

    // Fallback: Find highest available config that's less than or equal to current RCL
    const availableRCLs = Object.keys(this.RCL_CONFIGS)
      .map(Number)
      .filter(configRcl => configRcl <= rcl)
      .sort((a, b) => b - a); // Sort descending

    if (availableRCLs.length > 0) {
      const fallbackRCL = availableRCLs[0];
      if (Game.time % 100 === 0) {
        console.log(`ℹ️ Using RCL ${fallbackRCL} config for RCL ${rcl} (fallback)`);
      }
      return this.RCL_CONFIGS[fallbackRCL];
    }

    return null;
  }

  /**
   * Count creeps by role in a room
   */
  private static getCreepCounts(room: Room): { [role: string]: number } {
    const counts: { [role: string]: number } = {};

    const creeps = room.find(FIND_MY_CREEPS);
    for (const creep of creeps) {
      const role = creep.memory.role;
      counts[role] = (counts[role] || 0) + 1;
    }

    return counts;
  }

  /**
   * Spawn creeps based on priority
   */
  private static spawnByPriority(
    spawn: StructureSpawn,
    config: RCLConfig,
    creepCounts: { [role: string]: number }
  ): void {
    // Sort roles by priority
    const roleEntries = Object.entries(config.roles).sort(
      ([, a], [, b]) => a.priority - b.priority
    );

    // Critical: Always maintain at least 1 creep
    const totalCreeps = Object.values(creepCounts).reduce((sum, count) => sum + count, 0);
    if (totalCreeps === 0) {
      console.log("⚠️ CRITICAL: No creeps alive! Spawning emergency creep");
      const [firstRole, firstConfig] = roleEntries[0];
      this.spawnCreep(spawn, firstRole, firstConfig);
      return;
    }

    // Spawn first needed role
    for (const [roleName, roleConfig] of roleEntries) {
      const currentCount = creepCounts[roleName] || 0;

      if (currentCount < roleConfig.target) {
        const result = this.spawnCreep(spawn, roleName, roleConfig);

        if (result !== OK && result !== ERR_NOT_ENOUGH_ENERGY) {
          console.log(`❌ Spawn failed for ${roleName}: ${this.getErrorName(result)}`);
        }

        return; // Only spawn one creep per tick
      }
    }
  }

  /**
   * Spawn a single creep
   */
  private static spawnCreep(
    spawn: StructureSpawn,
    roleName: string,
    config: RoleConfig
  ): ScreepsReturnCode {
    const name = `${roleName.charAt(0).toUpperCase() + roleName.slice(1)}_${Game.time}`;

    const result = spawn.spawnCreep(config.body, name, {
      memory: {
        role: roleName,
        room: spawn.room.name,
        working: false
      }
    });

    if (result === OK) {
      console.log(`✅ Spawning ${roleName}: ${name}`);
    }

    return result;
  }

  /**
   * Display spawning status
   */
  private static displaySpawningStatus(spawn: StructureSpawn): void {
    if (!spawn.spawning) return;

    const spawningCreep = Game.creeps[spawn.spawning.name];
    spawn.room.visual.text(
      `🛠️ ${spawningCreep.memory.role}`,
      spawn.pos.x + 1,
      spawn.pos.y,
      { align: "left", opacity: 0.8 }
    );
  }

  /**
   * Display room status
   */
  private static displayStatus(
    room: Room,
    config: RCLConfig,
    creepCounts: { [role: string]: number }
  ): void {
    console.log(`\n=== RCL${room.controller?.level} Status (${room.name}) ===`);
    console.log(`Controller Progress: ${room.controller?.progress}/${room.controller?.progressTotal}`);
    console.log(`Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);

    for (const [roleName, roleConfig] of Object.entries(config.roles)) {
      const count = creepCounts[roleName] || 0;
      console.log(`${roleName}: ${count}/${roleConfig.target}`);
    }
  }

  /**
   * Get error name from code
   */
  private static getErrorName(code: ScreepsReturnCode): string {
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
