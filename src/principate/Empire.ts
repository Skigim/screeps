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
    
    // 2. Taskmaster generates tasks based on the report
    const newTasks = magistrates.taskmaster.run(report);
    
    // Store tasks in room memory for persistence
    room.memory.tasks = newTasks;
    
    // 3. Broodmother spawns creeps based on tasks
    magistrates.broodmother.run(newTasks);
    
    // 4. Legion Commander executes tasks with existing creeps
    magistrates.legionCommander.run(newTasks);
    
    // 5. Architect handles construction
    magistrates.architect.run();
    
    // 6. Trailblazer handles pathfinding and movement
    magistrates.trailblazer.run();
  }
}
