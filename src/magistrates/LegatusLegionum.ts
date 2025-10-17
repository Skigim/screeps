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
   * Finds the highest priority task that needs more creeps assigned
   * 
   * @param creep - The creep to assign a task to
   * @param tasks - Available tasks
   */
  private assignTask(creep: Creep, tasks: Task[]): void {
    // Find highest priority task needing creeps
    const availableTask = tasks.find(t => 
      t.assignedCreeps.length < t.creepsNeeded &&
      !t.assignedCreeps.includes(creep.name)
    );
    
    if (availableTask) {
      creep.memory.task = availableTask.id;
      availableTask.assignedCreeps.push(creep.name);
      console.log(`📋 ${creep.name} assigned to ${availableTask.type}`);
    } else {
      // No tasks available - assign idle task
      creep.memory.task = 'idle';
      console.log(`💤 ${creep.name} idle - no tasks available`);
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
      const index = task.assignedCreeps.indexOf(creep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
      console.log(`✅ ${creep.name} completed ${task.type}`);
    } else if (result.status === TaskStatus.FAILED) {
      // Task failed - log and clear
      console.log(`❌ ${creep.name} failed ${task.type}: ${result.message || 'Unknown error'}`);
      creep.memory.task = undefined;
      const index = task.assignedCreeps.indexOf(creep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
    } else if (result.status === TaskStatus.BLOCKED) {
      // Task blocked - log and clear for reassignment
      console.log(`🚫 ${creep.name} blocked on ${task.type}: ${result.message || 'Task blocked'}`);
      creep.memory.task = undefined;
      const index = task.assignedCreeps.indexOf(creep.name);
      if (index > -1) {
        task.assignedCreeps.splice(index, 1);
      }
    }
    // IN_PROGRESS: Continue normally next tick
  }
}
