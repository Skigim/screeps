import type { RCLConfig, RoleConfig } from "configs/RCL1Config";

/**
 * Spawn Manager
 * Handles spawning logic based on provided RCL config
 */
export class SpawnManager {
  /**
   * Main spawn logic - uses provided config
   */
  public static run(spawn: StructureSpawn, config: RCLConfig): void {
    // Don't spawn if already spawning
    if (spawn.spawning) {
      this.displaySpawningStatus(spawn);
      return;
    }

    const room = spawn.room;

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

    // GUARDRAIL: Get harvester count
    const harvesterCount = creepCounts.harvester || 0;
    const harvesterTarget = config.roles.harvester?.target || 0;
    const harvesterRatio = harvesterTarget > 0 ? harvesterCount / harvesterTarget : 1;

    // Spawn first needed role
    for (const [roleName, roleConfig] of roleEntries) {
      const currentCount = creepCounts[roleName] || 0;

      if (currentCount < roleConfig.target) {
        // GUARDRAIL: If harvester ratio < 50%, ONLY spawn harvesters (force energy income)
        if (harvesterRatio < 0.5 && roleName !== "harvester") {
          console.log(`🛡️ Harvester deficit detected (${harvesterCount}/${harvesterTarget}) - skipping ${roleName}`);
          continue; // Skip non-harvester roles until we have enough harvesters
        }

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
