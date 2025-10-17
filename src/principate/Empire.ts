import { LegatusArchivus } from '../magistrates/LegatusArchivus';
import { LegatusOfficio } from '../magistrates/LegatusOfficio';
import { LegatusGenetor } from '../magistrates/LegatusGenetor';
import { LegatusFabrum } from '../magistrates/LegatusFabrum';
import { LegatusViae } from '../magistrates/LegatusViae';
import { LegatusLegionum } from '../magistrates/LegatusLegionum';

/**
 * Room-specific magistrate instances
 */
interface RoomMagistrates {
  archivist: LegatusArchivus;
  taskmaster: LegatusOfficio;
  broodmother: LegatusGenetor;
  architect: LegatusFabrum;
  trailblazer: LegatusViae;
  legionCommander: LegatusLegionum;
}

/**
 * The Empire - The Principate
 * 
 * The highest authority in Project Imperium. Orchestrates all subordinate systems
 * and executes the grand strategy each tick.
 * 
 * Responsibilities:
 * - Initialize all Magistrate instances per room
 * - Execute the main decision cycle each tick
 * - Handle empire-wide state management
 * - Maintain the magistrate execution chain
 */
export class Empire {
  private isInitialized: boolean = false;
  private magistratesByRoom: Map<string, RoomMagistrates> = new Map();

  constructor() {
    console.log('🏛️ The Empire awakens...');
  }

  /**
   * Main execution function - called every game tick
   */
  public run(): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // TODO: This will be expanded after Magistrate classes are built
    this.executeImperialStrategy();
  }

  private initialize(): void {
    console.log('⚔️ Ave Imperator! Project Imperium initializing...');
    
    // TODO: Initialize Consuls (after they are created)
    // TODO: Initialize Magistrates for each room
    
    this.isInitialized = true;
  }

  private executeImperialStrategy(): void {
    // High-level empire logic - coordinate all rooms
    // Each room has its own magistrate council
    
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      
      // Only manage rooms we control
      if (room.controller && room.controller.my) {
        this.manageColonia(room);
      }
    }
  }

  /**
   * Manage a single colony (room) through its magistrate council
   * Executes the full decision and execution chain
   */
  private manageColonia(room: Room): void {
    // Get or create magistrates for this room
    if (!this.magistratesByRoom.has(room.name)) {
      this.magistratesByRoom.set(room.name, {
        archivist: new LegatusArchivus(room.name),
        taskmaster: new LegatusOfficio(room.name),
        broodmother: new LegatusGenetor(room.name),
        architect: new LegatusFabrum(room.name),
        trailblazer: new LegatusViae(room.name),
        legionCommander: new LegatusLegionum(room.name)
      });
    }

    const magistrates = this.magistratesByRoom.get(room.name)!;

    // Initialize room memory for tasks if needed
    if (!room.memory.tasks) {
      room.memory.tasks = [];
    }

    // Execute the Magistrate chain in order
    // 1. Archivist observes the room state
    const report = magistrates.archivist.run(room);
    console.log(`📊 ${room.name} Report: energyDeficit=${report.energyDeficit}, sources=${report.sources.length}, upgraderShortage=${report.controller.upgraderRecommendation - report.controller.upgraderCount}`);
    
    // Debug source info
    report.sources.forEach((s, i) => {
      console.log(`   Source ${i}: energy=${s.energy}, harvesters=${s.harvestersPresent}/${s.harvestersNeeded}`);
    });
    
    // 2. Taskmaster generates tasks based on the report
    // Use existing tasks from memory, or generate new ones if none exist
    let tasks = room.memory.tasks || [];
    
    // Clean up completed tasks (no assigned creeps and not needed anymore)
    tasks = tasks.filter(t => t.assignedCreeps.length > 0 || t.creepsNeeded > 0);
    
    // Generate new tasks if we have none, or refresh periodically (every 10 ticks)
    if (tasks.length === 0 || Game.time % 10 === 0) {
      const newTasks = magistrates.taskmaster.run(report);
      
      // Merge new tasks with existing ones (preserve assignments)
      // Match by targetId to handle ID format changes
      newTasks.forEach(newTask => {
        const existing = tasks.find(t => 
          t.type === newTask.type && 
          t.targetId === newTask.targetId
        );
        
        if (existing) {
          // Update existing task with new ID format and priority
          existing.id = newTask.id; // CRITICAL: Update to new stable ID format
          existing.priority = newTask.priority;
          existing.creepsNeeded = newTask.creepsNeeded;
        } else {
          // Add new task
          tasks.push(newTask);
        }
      });
      
      // Remove tasks that no longer exist in newTasks (target gone)
      tasks = tasks.filter(t => 
        newTasks.some(nt => nt.type === t.type && nt.targetId === t.targetId)
      );
      
      console.log(`📋 ${room.name}: Refreshed tasks - ${tasks.length} total`);
    }
    
    if (tasks.length > 0) {
      tasks.forEach(t => console.log(`   - ${t.type} (priority ${t.priority}, ${t.assignedCreeps.length}/${t.creepsNeeded} creeps)`));
    }
    
    // Store tasks in room memory for persistence
    room.memory.tasks = tasks;
    
    // 3. Broodmother spawns creeps based on tasks
    magistrates.broodmother.run(tasks);
    
    // 4. Legion Commander executes tasks with existing creeps
    magistrates.legionCommander.run(tasks);
    
    // 5. Architect handles construction
    magistrates.architect.run();
    
    // 6. Trailblazer handles pathfinding and movement
    magistrates.trailblazer.run();
  }
}
