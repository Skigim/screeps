/**
 * SPAWN QUEUE SYSTEM
 * 
 * Allows queuing spawn commands that execute when energy becomes available.
 * Useful for planning ahead without manual energy monitoring.
 */

export interface QueuedSpawn {
  id: string;
  role: string;
  body: BodyPartConstant[];
  task?: {
    type: string;
    targetId?: string;
  };
  room: string;
  createdAt: number;
}

/**
 * Initialize spawn queue if not present
 */
export function initializeQueue(): void {
  if (!Memory.empire) {
    Memory.empire = {};
  }
  if (!Memory.empire.spawnQueue) {
    Memory.empire.spawnQueue = [];
  }
}

/**
 * Add a spawn to the queue
 * @param role - Creep role (miner, hauler, builder, upgrader)
 * @param body - Array of body parts
 * @param room - Room to spawn in
 * @param task - Optional: task to assign after spawning
 * @returns Queue item ID
 */
export function queueSpawn(
  role: string,
  body: BodyPartConstant[],
  room: string,
  task?: { type: string; targetId?: string }
): string {
  initializeQueue();
  
  const id = `queue_${Game.time}_${Math.random().toString(36).substr(2, 9)}`;
  
  const item: QueuedSpawn = {
    id,
    role,
    body,
    task,
    room,
    createdAt: Game.time
  };
  
  (Memory.empire!.spawnQueue as QueuedSpawn[]).push(item);
  return id;
}

/**
 * Remove a spawn from the queue by ID
 */
export function dequeueSpawn(id: string): boolean {
  initializeQueue();
  
  const queue = Memory.empire!.spawnQueue as QueuedSpawn[];
  const index = queue.findIndex(item => item.id === id);
  
  if (index === -1) {
    return false;
  }
  
  queue.splice(index, 1);
  return true;
}

/**
 * Get all queued spawns
 */
export function getQueue(): QueuedSpawn[] {
  initializeQueue();
  return (Memory.empire!.spawnQueue as QueuedSpawn[]) || [];
}

/**
 * Get queue items for a specific room
 */
export function getQueueForRoom(roomName: string): QueuedSpawn[] {
  return getQueue().filter(item => item.room === roomName);
}

/**
 * Clear entire queue
 */
export function clearQueue(): void {
  initializeQueue();
  Memory.empire!.spawnQueue = [];
}

/**
 * Process spawn queue for a room
 * Called once per tick from room orchestrator
 * Spawns queued creeps when energy is available
 */
export function processSpawnQueue(room: Room): void {
  const queue = getQueueForRoom(room.name);
  
  if (queue.length === 0) {
    return;
  }

  const spawn = room.find(FIND_MY_SPAWNS)[0];
  if (!spawn || spawn.spawning) {
    return;
  }

  // Try to spawn the first item in queue
  const item = queue[0];
  const cost = item.body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

  if (room.energyAvailable >= cost) {
    // Generate creep name
    const abbr = item.role.charAt(0).toUpperCase();
    let maxNum = 0;
    const pattern = new RegExp(`^${abbr}(\\d+)$`);

    for (const creepName in Game.creeps) {
      const match = creepName.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }

    const creepName = `${abbr}${maxNum + 1}`;

    // Spawn the creep
    const result = spawn.spawnCreep(item.body, creepName, {
      memory: {
        role: item.role,
        room: room.name,
        working: false,
        task: item.task
      }
    });

    if (result === OK) {
      // Remove from queue and assign task if specified
      dequeueSpawn(item.id);

      if (item.task) {
        const creep = Game.creeps[creepName];
        if (creep && creep.memory) {
          creep.memory.task = item.task;
        }
      }
    }
  }
}
