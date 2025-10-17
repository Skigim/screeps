import { Task } from '../interfaces';
import { ExecutorFactory, TaskStatus, TaskResult } from '../execution';

/**
 * Legatus Legionum - The Legion Commander
 * 
 * Responsibility: Execute tasks assigned to creeps
 * Philosophy: Every creep is a soldier executing orders
 * 
 * The Legion Commander ensures each creep executes its assigned task.
 * It coordinates with ExecutorFactory to delegate task execution to 
 * specialized executors, then handles the results (completion, failure, etc.)
 */
export class LegatusLegionum {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Execute tasks for all creeps in the room
   * 
   * For each creep:
   * 1. Check if it has an assigned task
   * 2. If no task, try to assign one from available tasks
   * 3. If it has a task, execute it using the appropriate executor
   * 4. Handle the result (mark complete, reassign, etc.)
   */
  public run(tasks: Task[]): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    const creeps = room.find(FIND_MY_CREEPS);
    
    creeps.forEach(creep => {
      this.executeCreepTask(creep, tasks);
    });
  }

  /**
   * Execute the assigned task for a specific creep
   * 
   * @param creep - The creep to execute a task for
   * @param tasks - Available tasks in the room
   */
  private executeCreepTask(creep: Creep, tasks: Task[]): void {
    // Get creep's assigned task
    const taskId = creep.memory.task;
    
    if (!taskId) {
      // Creep has no task - assign one
      this.assignTask(creep, tasks);
      return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      // Task no longer exists - clear and reassign
      console.log(`⚠️ ${creep.name}: Task ${taskId} not found, reassigning`);
      creep.memory.task = undefined;
      this.assignTask(creep, tasks);
      return;
    }
    
    // Get executor for this task type
    const executor = ExecutorFactory.getExecutor(task.type);
    if (!executor) {
      console.log(`⚠️ ${creep.name}: No executor for task type ${task.type}`);
      return;
    }
    
    // Execute the task
    console.log(`⚙️ ${creep.name}: Executing ${task.type} (${task.id})`);
    const result = executor.execute(creep, task);
    console.log(`📊 ${creep.name}: Result = ${result.status}, ${result.message}`);
    
    // Handle result
    this.handleTaskResult(creep, task, result);
  }

  /**
   * Assign a task to an idle creep
   * 
   * Finds the highest priority task that:
   * 1. Needs more creeps assigned
   * 2. The creep is capable of performing (based on body parts and state)
   * 
   * @param creep - The creep to assign a task to
   * @param tasks - Available tasks
   */
  private assignTask(creep: Creep, tasks: Task[]): void {
    // Analyze creep body composition
    const workParts = creep.body.filter(p => p.type === WORK).length;
    const carryParts = creep.body.filter(p => p.type === CARRY).length;
    const attackParts = creep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
    
    // Check creep role for specialized filtering
    const role = creep.memory.role || 'worker';
    
    // Check if creep can do this task based on energy state
    const hasEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const hasSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    
    // Special case: Harvesters with NO CARRY parts don't need space (energy drops immediately)
    const isNoCarryHarvester = role === 'harvester' && carryParts === 0;
    
    // Filter tasks based on creep capabilities and state
    const suitableTasks = tasks.filter(t => {
      // Check if already assigned to this task
      if (t.assignedCreeps.includes(creep.name)) return false;
      
      // SPECIALIZED ROLE FILTERING:
      // Harvesters ONLY harvest (never haul, build, upgrade, etc.)
      if (role === 'harvester' && t.type !== 'HARVEST_ENERGY') {
        return false;
      }
      
      // Haulers ONLY haul energy (no WORK parts - can't build/upgrade/repair)
      // Allowed: PICKUP, HAUL, REFILL, WITHDRAW
      if (role === 'hauler') {
        const haulerTasks = ['PICKUP_ENERGY', 'HAUL_ENERGY', 'REFILL_SPAWN', 
                            'REFILL_EXTENSION', 'REFILL_TOWER', 'WITHDRAW_ENERGY'];
        if (!haulerTasks.includes(t.type)) {
          return false;
        }
      }
      
      // Workers NEVER harvest (dedicated harvesters do that)
      // Workers: pickup, build, upgrade, repair, refill only
      if (role === 'worker' && t.type === 'HARVEST_ENERGY') {
        return false;
      }
      
      // Check if task is full - if so, can we displace someone less suitable?
      if (t.assignedCreeps.length >= t.creepsNeeded) {
        const myScore = this.calculateTaskSuitability(creep, t, workParts, carryParts, attackParts);
        const canDisplace = this.canDisplaceForTask(creep, t, myScore);
        if (!canDisplace) return false;
      }
      
      // Energy transfer tasks require energy
      if (t.type === 'REFILL_SPAWN' || t.type === 'REFILL_EXTENSION' || 
          t.type === 'REFILL_TOWER' || t.type === 'HAUL_ENERGY' || t.type === 'PICKUP_ENERGY') {
        if (!hasEnergy && t.type === 'PICKUP_ENERGY') return true; // Pickup needs space, not energy
        if (t.type !== 'PICKUP_ENERGY' && !hasEnergy) return false;
      }
      
      // Harvest and pickup tasks require space
      // EXCEPTION: Harvesters with no CARRY parts drop energy immediately, don't need space
      if (t.type === 'HARVEST_ENERGY' || t.type === 'PICKUP_ENERGY' || t.type === 'WITHDRAW_ENERGY') {
        if (!hasSpace && !isNoCarryHarvester) return false;
      }
      
      // Upgrade/build/repair - DON'T filter by energy, let executor handle getting energy
      // (Creeps can be assigned while empty, then go harvest, then execute the task)
      // Only UPGRADE requires energy (it's low priority and only for already-loaded creeps)
      if (t.type === 'UPGRADE_CONTROLLER') {
        if (!hasEnergy) return false;
      }
      
      // Defense tasks require attack parts
      if (t.type === 'DEFEND_ROOM' && attackParts === 0) return false;
      
      return true;
    });
    
    // Debug: Log why no tasks available
    if (suitableTasks.length === 0) {
      console.log(`🔍 ${creep.name} - NO SUITABLE TASKS`);
      console.log(`  Energy: ${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity(RESOURCE_ENERGY)} (hasEnergy:${hasEnergy}, hasSpace:${hasSpace})`);
      console.log(`  Body: WORK:${workParts} CARRY:${carryParts} ATTACK:${attackParts}`);
      console.log(`  Total tasks: ${tasks.length}`);
      tasks.forEach(t => {
        const reason = [];
        if (t.assignedCreeps.length >= t.creepsNeeded) reason.push('FULL');
        if (t.assignedCreeps.includes(creep.name)) reason.push('ALREADY_ASSIGNED');
        if (['REFILL_SPAWN', 'REFILL_EXTENSION', 'REFILL_TOWER', 'HAUL_ENERGY'].includes(t.type) && !hasEnergy) reason.push('NEEDS_ENERGY');
        if (['HARVEST_ENERGY', 'PICKUP_ENERGY', 'WITHDRAW_ENERGY'].includes(t.type) && !hasSpace) reason.push('NEEDS_SPACE');
        if (t.type === 'UPGRADE_CONTROLLER' && !hasEnergy) reason.push('NEEDS_ENERGY');
        console.log(`    ${t.type} [${t.priority}] ${t.assignedCreeps.length}/${t.creepsNeeded} - ❌ ${reason.join(', ')}`);
      });
    }
    
    // Sort by priority (highest first)
    suitableTasks.sort((a, b) => b.priority - a.priority);
    
    const availableTask = suitableTasks[0];
    
    if (availableTask) {
      // Check if task is full and we need to displace someone
      if (availableTask.assignedCreeps.length >= availableTask.creepsNeeded) {
        const myScore = this.calculateTaskSuitability(creep, availableTask, workParts, carryParts, attackParts);
        this.displaceWeakestForTask(creep, availableTask, myScore);
      } else {
        // Normal assignment
        creep.memory.task = availableTask.id;
        creep.memory.targetId = availableTask.targetId;
        availableTask.assignedCreeps.push(creep.name);
        console.log(`📋 ${creep.name} assigned to ${availableTask.type} (target: ${availableTask.targetId})`);
      }
    } else {
      // No tasks available - assign idle task
      creep.memory.task = 'idle';
      creep.memory.targetId = undefined;
      console.log(`💤 ${creep.name} idle - no tasks available`);
    }
  }

  /**
   * Calculate how suitable a creep is for a specific task type
   * Higher score = better fit
   */
  private calculateTaskSuitability(_creep: Creep, task: Task, workParts: number, carryParts: number, attackParts: number): number {
    let score = 0;
    
    switch (task.type) {
      case 'HARVEST_ENERGY':
        // Harvesters: WORK parts are king
        score = workParts * 10;
        break;
        
      case 'PICKUP_ENERGY':
      case 'REFILL_SPAWN':
      case 'REFILL_EXTENSION':
      case 'REFILL_TOWER':
      case 'HAUL_ENERGY':
        // Haulers: CARRY parts matter most, penalize WORK parts
        score = carryParts * 10 - workParts * 5;
        break;
        
      case 'UPGRADE_CONTROLLER':
        // Upgraders: WORK parts for speed
        score = workParts * 8;
        break;
        
      case 'BUILD':
      case 'REPAIR':
        // Builders: WORK and CARRY both useful
        score = workParts * 6 + carryParts * 4;
        break;
        
      case 'DEFEND_ROOM':
        // Defenders: ATTACK parts essential
        score = attackParts * 10;
        break;
        
      default:
        // Generic tasks: balanced creeps preferred
        score = workParts + carryParts;
    }
    
    return score;
  }

  /**
   * Check if this creep can displace someone less suitable for the task
   */
  private canDisplaceForTask(_creep: Creep, task: Task, myScore: number): boolean {
    // Find least suitable assigned creep
    for (const assignedName of task.assignedCreeps) {
      const assignedCreep = Game.creeps[assignedName];
      if (!assignedCreep) continue;
      
      const workParts = assignedCreep.body.filter(p => p.type === WORK).length;
      const carryParts = assignedCreep.body.filter(p => p.type === CARRY).length;
      const attackParts = assignedCreep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
      
      const theirScore = this.calculateTaskSuitability(assignedCreep, task, workParts, carryParts, attackParts);
      if (myScore > theirScore) {
        return true; // We can displace at least one less suitable creep
      }
    }
    return false;
  }

  /**
   * Displace the least suitable creep and assign this one instead
   */
  private displaceWeakestForTask(creep: Creep, task: Task, myScore: number): void {
    let weakestCreep: Creep | null = null;
    let weakestScore = myScore;
    
    // Find the least suitable assigned creep
    for (const assignedName of task.assignedCreeps) {
      const assignedCreep = Game.creeps[assignedName];
      if (!assignedCreep) continue;
      
      const workParts = assignedCreep.body.filter(p => p.type === WORK).length;
      const carryParts = assignedCreep.body.filter(p => p.type === CARRY).length;
      const attackParts = assignedCreep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
      
      const theirScore = this.calculateTaskSuitability(assignedCreep, task, workParts, carryParts, attackParts);
      if (theirScore < weakestScore) {
        weakestCreep = assignedCreep;
        weakestScore = theirScore;
      }
    }
    
    if (weakestCreep) {
      // Remove less suitable creep from task
      const index = task.assignedCreeps.indexOf(weakestCreep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
      weakestCreep.memory.task = undefined;
      weakestCreep.memory.targetId = undefined;
      
      // Assign better suited creep
      creep.memory.task = task.id;
      creep.memory.targetId = task.targetId;
      task.assignedCreeps.push(creep.name);
      
      console.log(`⚔️ ${creep.name} (score:${myScore}) displaced ${weakestCreep.name} (score:${weakestScore}) from ${task.type}`);
    }
  }

  /**
   * Handle the result of a task execution
   * 
   * @param creep - The creep that executed the task
   * @param task - The task that was executed
   * @param result - The result of the execution
   */
  private handleTaskResult(creep: Creep, task: Task, result: TaskResult): void {
    if (result.status === TaskStatus.COMPLETED) {
      // Task complete - clear assignment
      creep.memory.task = undefined;
      creep.memory.targetId = undefined;
      const index = task.assignedCreeps.indexOf(creep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
      console.log(`✅ ${creep.name} completed ${task.type}`);
    } else if (result.status === TaskStatus.FAILED) {
      // Task failed - log and clear
      console.log(`❌ ${creep.name} failed ${task.type}: ${result.message || 'Unknown error'}`);
      creep.memory.task = undefined;
      creep.memory.targetId = undefined;
      const index = task.assignedCreeps.indexOf(creep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
    } else if (result.status === TaskStatus.BLOCKED) {
      // Task blocked - for most tasks, clear and reassign
      // EXCEPTION: Harvesters should stay at their source even when blocked (waiting for regen)
      const role = creep.memory.role || 'worker';
      if (role === 'harvester' && task.type === 'HARVEST_ENERGY') {
        // Harvester stays assigned, just waits for source to regenerate
        console.log(`⏸️ ${creep.name} waiting at source: ${result.message || 'Source regenerating'}`);
      } else {
        // Other creeps clear and get reassigned
        console.log(`🚫 ${creep.name} blocked on ${task.type}: ${result.message || 'Task blocked'}`);
        creep.memory.task = undefined;
        const index = task.assignedCreeps.indexOf(creep.name);
        if (index > -1) {
          task.assignedCreeps.splice(index, 1);
        }
      }
    }
    // IN_PROGRESS: Continue normally next tick
  }
}
