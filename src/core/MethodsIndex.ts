/**
 * MethodsIndex - Service Locator and Event Queue
 *
 * This class serves two critical architectural functions:
 *
 * 1. Service Locator Pattern:
 *    - Provides a central registry for all manager modules
 *    - Eliminates circular dependencies by decoupling inter-manager communication
 *    - Managers request dependencies by name rather than importing directly
 *    - Enhances testability by allowing easy dependency injection/mocking
 *
 * 2. Event Queue Pattern:
 *    - Allows low-level modules to signal upward without breaking unidirectional data flow
 *    - Enables emergency responses (e.g., all harvesters dead) to be handled next tick
 *    - Events are processed at the end of each tick by high-level orchestrators
 *    - Automatically prunes stale events to prevent memory leaks
 *
 * Usage:
 *   // In main.ts - instantiate once per tick
 *   const methodsIndex = new MethodsIndex();
 *   methodsIndex.register('SpawnManager', SpawnManager);
 *
 *   // In a manager - request dependency
 *   const spawnManager = methodsIndex.get<typeof SpawnManager>('SpawnManager');
 *
 *   // In low-level code - emit event
 *   methodsIndex.emit({
 *     type: 'EMERGENCY_SPAWN',
 *     roomName: 'W1N1',
 *     priority: 'CRITICAL',
 *     data: { role: 'harvester' }
 *   });
 *
 *   // In high-level code - process events
 *   const events = methodsIndex.getEvents(room.name);
 */

/**
 * Event types for the Event Queue
 *
 * EMERGENCY_SPAWN: All creeps of a critical role have died
 * RESOURCE_FULL: Storage/containers full, need to pause harvesting
 * RESOURCE_EMPTY: Storage/containers empty, need emergency energy
 * UNDER_ATTACK: Hostile creeps detected in room
 * TOWER_NEEDS_ENERGY: Tower energy critically low
 * PHASE_TRANSITION: Room has transitioned to a new progression phase
 */
export type RoomEventType =
  | "EMERGENCY_SPAWN"
  | "RESOURCE_FULL"
  | "RESOURCE_EMPTY"
  | "UNDER_ATTACK"
  | "TOWER_NEEDS_ENERGY"
  | "PHASE_TRANSITION";

/**
 * Priority levels for events
 *
 * CRITICAL: Must be handled immediately (e.g., no harvesters)
 * HIGH: Should be handled soon (e.g., storage full)
 * NORMAL: Standard event (e.g., phase transition)
 * LOW: Informational (e.g., milestone reached)
 */
export type EventPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

/**
 * Structure of an event in the queue
 */
export interface RoomEvent {
  type: RoomEventType;
  roomName: string;
  priority: EventPriority;
  data: any;
  tickCreated: number;
}

/**
 * MethodsIndex - Central service registry and event queue
 *
 * Instantiated once per tick in main.ts and passed to all managers.
 * Provides decoupled communication between modules.
 */
export class MethodsIndex {
  private managers: Map<string, any> = new Map();
  private eventQueue: RoomEvent[] = [];
  private roomDataCache: Map<string, any> = new Map();

  /**
   * Register a manager module with the service locator
   *
   * @param name - Unique identifier for the manager (e.g., 'SpawnManager')
   * @param manager - The manager class or instance to register
   */
  register(name: string, manager: any): void {
    this.managers.set(name, manager);
  }

  /**
   * Retrieve a registered manager by name
   *
   * @param name - The identifier used during registration
   * @returns The manager class or instance
   * @throws Error if manager not found
   */
  get<T>(name: string): T {
    const manager = this.managers.get(name);
    if (!manager) {
      throw new Error(`[MethodsIndex] Manager '${name}' not found. Did you forget to register it?`);
    }
    return manager as T;
  }

  /**
   * Check if a manager is registered
   *
   * @param name - The identifier to check
   * @returns True if manager exists
   */
  has(name: string): boolean {
    return this.managers.has(name);
  }

  /**
   * Emit an event to the queue
   *
   * Events are processed by high-level orchestrators at the end of the tick.
   * Use this for upward signaling without breaking unidirectional data flow.
   *
   * @param event - Event object (tickCreated will be added automatically)
   */
  emit(event: Omit<RoomEvent, "tickCreated">): void {
    this.eventQueue.push({
      ...event,
      tickCreated: Game.time
    });
  }

  /**
   * Retrieve events from the queue
   *
   * @param roomName - Optional filter by room name
   * @param priority - Optional filter by priority level
   * @returns Array of matching events
   */
  getEvents(roomName?: string, priority?: EventPriority): RoomEvent[] {
    let events = this.eventQueue;

    if (roomName) {
      events = events.filter(e => e.roomName === roomName);
    }

    if (priority) {
      events = events.filter(e => e.priority === priority);
    }

    return events;
  }

  /**
   * Clear all events from the queue
   *
   * Should be called at the end of each tick after events are processed.
   */
  clearEvents(): void {
    this.eventQueue = [];
  }

  /**
   * Remove events older than a specified age
   *
   * Prevents memory leaks from events that were never processed.
   * Should be called at the start of each tick.
   *
   * @param maxAge - Maximum age in ticks (default: 10)
   */
  pruneOldEvents(maxAge: number = 10): void {
    const cutoffTick = Game.time - maxAge;
    const originalLength = this.eventQueue.length;

    this.eventQueue = this.eventQueue.filter(e => e.tickCreated >= cutoffTick);

    const pruned = originalLength - this.eventQueue.length;
    if (pruned > 0) {
      console.log(`[MethodsIndex] Pruned ${pruned} stale events older than ${maxAge} ticks`);
    }
  }

  /**
   * Cache room data for the current tick (Router-Push pattern)
   *
   * RoomStateManager collects typed data once and stores it here.
   * Managers receive data via parameter, but can use this as an escape hatch.
   *
   * @param roomName - The room identifier
   * @param data - The collected room data (RCL1Data, RCL2Data, etc.)
   */
  setRoomData(roomName: string, data: any): void {
    this.roomDataCache.set(roomName, data);
  }

  /**
   * Retrieve cached room data (Emergency escape hatch only)
   *
   * Primary data flow is Router-Push (data passed as parameters).
   * Only use this for rare edge cases where a manager needs additional data.
   *
   * @param roomName - The room identifier
   * @returns The cached room data, or undefined if not found
   */
  getRoomData(roomName: string): any {
    return this.roomDataCache.get(roomName);
  }

  /**
   * Clear the room data cache
   *
   * Should be called at the end of each tick to prevent stale data.
   */
  clearRoomData(): void {
    this.roomDataCache.clear();
  }

  /**
   * Get statistics about the current state
   *
   * Useful for debugging and telemetry.
   *
   * @returns Object with counts of managers, events, and cached rooms
   */
  getStats(): { managers: number; events: number; cachedRooms: number } {
    return {
      managers: this.managers.size,
      events: this.eventQueue.length,
      cachedRooms: this.roomDataCache.size
    };
  }
}
