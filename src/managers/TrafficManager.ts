/**
 * TrafficManager - Centralized system for routing hauler deliveries to builders
 *
 * Benefits:
 * - CPU efficient: O(1) hauler assignment instead of O(builders) per hauler
 * - Opportunistic delivery: Haulers help builders on their existing paths
 * - Clean separation: Builders request, manager assigns, haulers deliver
 */

export class TrafficManager {
  /**
   * Request energy delivery from a nearby hauler
   * Called by builders when they need energy
   */
  static requestEnergy(builder: Creep): void {
    // Find available haulers with energy that are allowed to transport
    const haulers = builder.room.find(FIND_MY_CREEPS, {
      filter: c =>
        c.memory.role === "hauler" &&
        c.store[RESOURCE_ENERGY] > 0 &&
        !c.memory.assignedBuilder && // Not already assigned to help someone
        c.memory.canTransport !== false // Allowed to transport (undefined defaults to true)
    });

    if (haulers.length === 0) return;

    // Find closest hauler that can reasonably help
    const bestHauler = builder.pos.findClosestByPath(haulers, {
      filter: h => this.canHaulerHelp(h, builder)
    });

    if (bestHauler) {
      // Assign hauler to this builder
      bestHauler.memory.assignedBuilder = builder.name;
      bestHauler.memory.deliveryAmount = Math.min(
        bestHauler.store[RESOURCE_ENERGY],
        builder.store.getFreeCapacity(RESOURCE_ENERGY)
      );

      // Mark builder as having requested help
      builder.memory.energyRequested = true;
      builder.memory.requestTime = Game.time;

      console.log(
        `TrafficManager: Assigned ${bestHauler.name} to deliver ${bestHauler.memory.deliveryAmount} energy to ${builder.name}`
      );
    }
  }

  /**
   * Check if a hauler can reasonably help a builder
   * Ensures delivery doesn't cause major path deviation
   */
  private static canHaulerHelp(hauler: Creep, builder: Creep): boolean {
    // Must have energy
    if (hauler.store[RESOURCE_ENERGY] === 0) return false;

    // Simple distance check: only help if builder is reasonably close
    // This prevents haulers from abandoning their primary duty
    const distance = hauler.pos.getRangeTo(builder);
    if (distance > 15) return false;

    // Don't help if hauler is still at source (let it finish collection)
    if (hauler.memory.assignedSource) {
      const source = Game.getObjectById(hauler.memory.assignedSource as Id<Source>);
      if (source && hauler.pos.getRangeTo(source) <= 2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up stale builder assignments
   * Called from main loop to handle edge cases (builder died, got energy elsewhere, etc.)
   */
  static cleanupAssignments(room: Room): void {
    // Manage canTransport flags first
    this.manageTransportFlags(room);

    const assignedHaulers = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "hauler" && c.memory.assignedBuilder
    });

    for (const hauler of assignedHaulers) {
      const builder = Game.creeps[hauler.memory.assignedBuilder!];

      // Builder is gone or full - release hauler
      if (!builder || builder.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        console.log(`TrafficManager: Releasing ${hauler.name} from builder assignment (builder gone/full)`);
        delete hauler.memory.assignedBuilder;
        delete hauler.memory.deliveryAmount;
      }
    }

    // Clean up builder request flags for builders that got energy or died
    const requestingBuilders = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "builder" && c.memory.energyRequested
    });

    for (const builder of requestingBuilders) {
      // Got energy somehow - clear request
      if (builder.store[RESOURCE_ENERGY] > 0) {
        delete builder.memory.energyRequested;
        delete builder.memory.requestTime;
      }

      // Request timed out (20 ticks) - builder should self-serve
      if (builder.memory.requestTime && Game.time - builder.memory.requestTime > 20) {
        console.log(`TrafficManager: Request timeout for ${builder.name}, allowing self-serve`);
        delete builder.memory.energyRequested;
        delete builder.memory.requestTime;
      }
    }
  }

  /**
   * Manage canTransport flags on haulers
   * Ensures at least 2 haulers are dedicated to spawn/extension delivery (canTransport: false)
   * Remaining haulers can help builders (canTransport: true or undefined)
   */
  private static manageTransportFlags(room: Room): void {
    const haulers = room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === "hauler"
    });

    if (haulers.length === 0) return;

    // Count how many haulers are currently flagged as critical (canTransport: false)
    const criticalHaulers = haulers.filter(h => h.memory.canTransport === false);
    const minCriticalHaulers = Math.min(2, haulers.length); // Want 2 critical, but if only 1-2 haulers total, adjust

    if (criticalHaulers.length < minCriticalHaulers) {
      // Need more critical haulers - flag some
      const needToFlag = minCriticalHaulers - criticalHaulers.length;
      const availableHaulers = haulers.filter(h => h.memory.canTransport !== false);

      for (let i = 0; i < Math.min(needToFlag, availableHaulers.length); i++) {
        availableHaulers[i].memory.canTransport = false;
        console.log(`TrafficManager: Flagged ${availableHaulers[i].name} as critical hauler (canTransport: false)`);
      }
    } else if (criticalHaulers.length > minCriticalHaulers && haulers.length > 3) {
      // Have more critical haulers than needed AND enough total haulers - free one up
      const excessCritical = criticalHaulers.length - minCriticalHaulers;

      for (let i = 0; i < excessCritical; i++) {
        criticalHaulers[i].memory.canTransport = true;
        console.log(`TrafficManager: Freed ${criticalHaulers[i].name} to help builders (canTransport: true)`);
      }
    }

    // For any hauler without a flag set, default to true (can transport) if we have enough critical haulers
    if (criticalHaulers.length >= minCriticalHaulers) {
      const unsetHaulers = haulers.filter(h => h.memory.canTransport === undefined);
      for (const hauler of unsetHaulers) {
        hauler.memory.canTransport = true;
      }
    }
  }
}
