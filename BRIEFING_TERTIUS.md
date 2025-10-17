# MISSION BRIEFING: AGENT TERTIUS (The Magister)

## Designation
**Agent Tertius** - Magistrate Operations & Tactical Implementation

## Mission Objective
Create the operational managers (Magistrates) that will execute room-level tactics. You build the officers who will turn the Archivist's reports into actionable orders, spawn creeps, build structures, and manage logistics.

## Chain of Command
- **Reports to**: Strategic Coordinator (Human Commander)
- **Dependencies**: Agent Secundus MUST complete all interfaces first
- **Supports**: Agent Primus needs your completion for Phase III integration

---

## PRE-MISSION CHECKLIST

**⚠️ YOU ARE BLOCKED**: Do NOT begin until Agent Secundus completes Phase II.

### Before Beginning ANY Work:

1. **Check `CAMPAIGN_STATUS.md`** for Agent Secundus status
2. Look for explicit signal: "Agent Secundus: Phase II COMPLETE"
3. Verify these files exist:
   - [ ] `src/interfaces/` directory exists with all interfaces
   - [ ] `src/interfaces/index.ts` exports all types
   - [ ] `src/magistrates/LegatusArchivus.ts` exists
   - [ ] Project compiles successfully with `npm run build`

**DO NOT PROCEED** until Agent Secundus signals completion in `CAMPAIGN_STATUS.md`.

### If Agent Secundus is Not Complete:
1. Update your status in `CAMPAIGN_STATUS.md` to "WAITING FOR AGENT SECUNDUS"
2. Check `CAMPAIGN_STATUS.md` periodically for the completion signal
3. Do NOT write any code until unblocked

---

## PHASE I: TASKMASTER IMPLEMENTATION

### Task 1.1: Legatus Officio - The Taskmaster
**File**: `src/magistrates/LegatusOfficio.ts`

```typescript
import { ArchivistReport, Task, TaskType } from '../interfaces';

/**
 * Legatus Officio - The Taskmaster
 * 
 * Responsibility: Transform observations into actionable tasks
 * Philosophy: Every problem is a task waiting to be solved
 * 
 * The Taskmaster reads the Archivist's report and creates a prioritized
 * work queue. It doesn't care WHO does the work - just WHAT needs doing.
 */
export class LegatusOfficio {
  private roomName: string;
  private taskIdCounter: number = 0;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze the room report and generate prioritized tasks
   */
  public run(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // Priority 1: Emergency Defense
    if (report.hostileThreatLevel > 0) {
      tasks.push(...this.createDefenseTasks(report));
    }

    // Priority 2: Spawn Energy (can't do anything without energy)
    if (report.energyDeficit > 0) {
      tasks.push(...this.createEnergyTasks(report));
    }

    // Priority 3: Tower Maintenance
    if (report.towers.some(t => t.needsRefill)) {
      tasks.push(...this.createTowerRefillTasks(report));
    }

    // Priority 4: Construction
    if (report.constructionSites.length > 0) {
      tasks.push(...this.createConstructionTasks(report));
    }

    // Priority 5: Critical Repairs
    const criticalRepairs = report.repairTargets.filter(r => r.priority > 70);
    if (criticalRepairs.length > 0) {
      tasks.push(...this.createRepairTasks(criticalRepairs));
    }

    // Priority 6: Controller Upgrade
    tasks.push(...this.createUpgradeTasks(report));

    // Priority 7: Non-Critical Repairs
    const minorRepairs = report.repairTargets.filter(r => r.priority <= 70);
    if (minorRepairs.length > 0) {
      tasks.push(...this.createRepairTasks(minorRepairs));
    }

    // Sort by priority (highest first)
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  private createDefenseTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];
    
    report.hostiles.forEach(hostile => {
      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.DEFEND_ROOM,
        priority: 95 + report.hostileThreatLevel,
        targetId: hostile.id,
        targetPos: hostile.pos,
        creepsNeeded: Math.ceil(hostile.threatLevel / 10),
        assignedCreeps: []
      });
    });

    return tasks;
  }

  private createEnergyTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // Harvest from sources
    report.sources.forEach(source => {
      if (source.energy > 0 && source.harvestersPresent < source.harvestersNeeded) {
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.HARVEST_ENERGY,
          priority: 85,
          targetId: source.id,
          targetPos: source.pos,
          creepsNeeded: source.harvestersNeeded - source.harvestersPresent,
          assignedCreeps: []
        });
      }
    });

    // Haul energy from containers to spawns/extensions
    report.containers.forEach(container => {
      if (container.store.energy > 100 && report.energyDeficit > 0) {
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.HAUL_ENERGY,
          priority: 80,
          targetId: container.id,
          targetPos: container.pos,
          creepsNeeded: 1,
          assignedCreeps: [],
          metadata: {
            energyAvailable: container.store.energy
          }
        });
      }
    });

    return tasks;
  }

  private createTowerRefillTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    report.towers.forEach(tower => {
      if (tower.needsRefill) {
        const energyNeeded = tower.energyCapacity - tower.energy;
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.REFILL_TOWER,
          priority: 75,
          targetId: tower.id,
          creepsNeeded: Math.ceil(energyNeeded / 500),
          assignedCreeps: [],
          metadata: {
            energyRequired: energyNeeded
          }
        });
      }
    });

    return tasks;
  }

  private createConstructionTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    report.constructionSites.forEach(site => {
      // Prioritize spawns and towers
      let priority = 60;
      if (site.structureType === STRUCTURE_SPAWN) priority = 85;
      if (site.structureType === STRUCTURE_TOWER) priority = 80;
      if (site.structureType === STRUCTURE_EXTENSION) priority = 70;

      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.BUILD,
        priority: priority,
        targetId: site.id,
        targetPos: site.pos,
        creepsNeeded: Math.ceil((site.progressTotal - site.progress) / 5000),
        assignedCreeps: [],
        metadata: {
          structureType: site.structureType,
          remainingWork: site.progressTotal - site.progress
        }
      });
    });

    return tasks;
  }

  private createRepairTasks(repairTargets: any[]): Task[] {
    const tasks: Task[] = [];

    repairTargets.forEach(target => {
      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.REPAIR,
        priority: target.priority,
        targetId: target.id,
        targetPos: target.pos,
        creepsNeeded: 1,
        assignedCreeps: [],
        metadata: {
          structureType: target.structureType,
          hitsNeeded: target.hitsMax - target.hits
        }
      });
    });

    return tasks;
  }

  private createUpgradeTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // Always have an upgrade task available
    const upgraderShortage = report.controller.upgraderRecommendation - 
                             report.controller.upgraderCount;

    if (upgraderShortage > 0 || report.controller.ticksToDowngrade < 5000) {
      const priority = report.controller.ticksToDowngrade < 5000 ? 90 : 55;
      
      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.UPGRADE_CONTROLLER,
        priority: priority,
        targetId: report.controller.id,
        creepsNeeded: Math.max(1, upgraderShortage),
        assignedCreeps: []
      });
    }

    return tasks;
  }

  private generateTaskId(): string {
    return `task_${this.roomName}_${Game.time}_${this.taskIdCounter++}`;
  }
}
```

---

## PHASE II: BROODMOTHER IMPLEMENTATION

### Task 2.1: Legatus Genetor - The Broodmother
**File**: `src/magistrates/LegatusGenetor.ts`

```typescript
import { Task, CreepRequest, TaskType } from '../interfaces';

/**
 * Legatus Genetor - The Broodmother
 * 
 * Responsibility: Design and spawn creeps optimized for tasks
 * Philosophy: The right tool for the right job
 * 
 * The Broodmother looks at the task queue and determines if a new creep
 * is needed. If so, it designs the perfect body for that task.
 */
export class LegatusGenetor {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze tasks and spawn creeps as needed
   */
  public run(tasks: Task[]): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    // Find available spawns
    const spawns = room.find(FIND_MY_SPAWNS, {
      filter: (s) => !s.spawning
    });

    if (spawns.length === 0) return;

    // Find highest priority task that needs creeps
    const taskNeedingCreeps = tasks.find(t => 
      t.assignedCreeps.length < t.creepsNeeded
    );

    if (!taskNeedingCreeps) return;

    // Design and spawn a creep for this task
    const request = this.designCreep(taskNeedingCreeps, room);
    if (request) {
      this.spawnCreep(spawns[0], request);
    }
  }

  private designCreep(task: Task, room: Room): CreepRequest | null {
    const energy = room.energyAvailable;
    
    // Design body based on task type
    let body: BodyPartConstant[] = [];
    let role: string = '';

    switch (task.type) {
      case TaskType.HARVEST_ENERGY:
        body = this.designHarvester(energy);
        role = 'harvester';
        break;
      
      case TaskType.HAUL_ENERGY:
      case TaskType.REFILL_TOWER:
      case TaskType.REFILL_SPAWN:
      case TaskType.REFILL_EXTENSION:
        body = this.designHauler(energy);
        role = 'hauler';
        break;
      
      case TaskType.BUILD:
        body = this.designBuilder(energy);
        role = 'builder';
        break;
      
      case TaskType.REPAIR:
        body = this.designRepairer(energy);
        role = 'repairer';
        break;
      
      case TaskType.UPGRADE_CONTROLLER:
        body = this.designUpgrader(energy);
        role = 'upgrader';
        break;
      
      case TaskType.DEFEND_ROOM:
        body = this.designDefender(energy);
        role = 'defender';
        break;
      
      default:
        body = this.designWorker(energy);
        role = 'worker';
    }

    if (body.length === 0) return null;

    const cost = this.calculateBodyCost(body);

    return {
      priority: task.priority,
      body: body,
      memory: {
        role: role,
        room: this.roomName,
        task: task.id,
        targetId: task.targetId?.toString()
      },
      initialTask: task,
      cost: cost,
      role: role
    };
  }

  private designHarvester(energy: number): BodyPartConstant[] {
    // Optimal harvester: 1 WORK per 2 MOVE for speed
    // Max 5 WORK parts (source energy/tick limit)
    const parts: BodyPartConstant[] = [];
    const maxWork = 5;
    let workParts = 0;
    let moveParts = 0;

    while (energy >= 150 && workParts < maxWork) {
      parts.push(WORK);
      parts.push(MOVE);
      workParts++;
      moveParts++;
      energy -= 150;
    }

    // Add carry for pickup
    if (energy >= 50) {
      parts.push(CARRY);
      energy -= 50;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private designHauler(energy: number): BodyPartConstant[] {
    // Hauler: Maximize CARRY with MOVE for speed
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 100) {
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 100;
    }

    return parts.length > 0 ? parts : [CARRY, MOVE];
  }

  private designBuilder(energy: number): BodyPartConstant[] {
    // Builder: Balanced WORK, CARRY, MOVE
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 200) {
      parts.push(WORK);
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 200;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private designRepairer(energy: number): BodyPartConstant[] {
    // Same as builder
    return this.designBuilder(energy);
  }

  private designUpgrader(energy: number): BodyPartConstant[] {
    // Upgrader: More WORK than builder for efficiency
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 300) {
      parts.push(WORK);
      parts.push(WORK);
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 300;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private designDefender(energy: number): BodyPartConstant[] {
    // Defender: ATTACK, MOVE, some TOUGH
    const parts: BodyPartConstant[] = [];
    
    // Add tough armor first
    if (energy >= 10) {
      parts.push(TOUGH);
      energy -= 10;
    }

    // Add attack and move
    while (energy >= 130) {
      parts.push(ATTACK);
      parts.push(MOVE);
      energy -= 130;
    }

    return parts.length > 0 ? parts : [ATTACK, MOVE];
  }

  private designWorker(energy: number): BodyPartConstant[] {
    // Generic worker: balanced parts
    const parts: BodyPartConstant[] = [];
    
    while (energy >= 200) {
      parts.push(WORK);
      parts.push(CARRY);
      parts.push(MOVE);
      energy -= 200;
    }

    return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
  }

  private calculateBodyCost(body: BodyPartConstant[]): number {
    const costs: { [key: string]: number } = {
      [MOVE]: 50,
      [WORK]: 100,
      [CARRY]: 50,
      [ATTACK]: 80,
      [RANGED_ATTACK]: 150,
      [HEAL]: 250,
      [TOUGH]: 10,
      [CLAIM]: 600
    };

    return body.reduce((sum, part) => sum + (costs[part] || 0), 0);
  }

  private spawnCreep(spawn: StructureSpawn, request: CreepRequest): void {
    const name = `${request.role}_${Game.time}`;
    const result = spawn.spawnCreep(request.body, name, { memory: request.memory });

    if (result === OK) {
      console.log(`🏛️ Spawning ${request.role}: ${name} (${request.cost} energy)`);
    } else if (result === ERR_NOT_ENOUGH_ENERGY) {
      // This is fine - we'll try again next tick
    } else {
      console.log(`⚠️ Failed to spawn ${request.role}: ${result}`);
    }
  }
}
```

---

## PHASE III: ARCHITECT & TRAILBLAZER SKELETONS

### Task 3.1: Legatus Fabrum - The Architect (SKELETON ONLY)
**File**: `src/magistrates/LegatusFabrum.ts`

```typescript
/**
 * Legatus Fabrum - The Architect
 * 
 * Responsibility: Place construction sites according to room blueprints
 * Philosophy: Every room should be a masterpiece of efficiency
 * 
 * The Architect plans and places structures to optimize room layout.
 * This is complex logic that will be implemented in future phases.
 */
export class LegatusFabrum {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze room and place construction sites
   * TODO: Implement room planning logic
   */
  public run(): void {
    // STUB: Room planning logic will be implemented later
    // This will include:
    // - Extension placement optimization
    // - Road planning (coordinate with Legatus Viae)
    // - Defense structure placement
    // - Storage and terminal positioning
  }
}
```

### Task 3.2: Legatus Viae - The Trailblazer (SKELETON ONLY)
**File**: `src/magistrates/LegatusViae.ts`

```typescript
/**
 * Legatus Viae - The Trailblazer
 * 
 * Responsibility: Analyze traffic and build roads
 * Philosophy: The shortest path between two points is a Roman road
 * 
 * The Trailblazer monitors creep movement patterns and builds roads
 * in high-traffic areas to improve efficiency.
 */
export class LegatusViae {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze traffic patterns and place road construction sites
   * TODO: Implement traffic analysis and road planning
   */
  public run(): void {
    // STUB: Traffic analysis logic will be implemented later
    // This will include:
    // - Tracking creep movement patterns
    // - Identifying high-traffic positions
    // - Placing road construction sites
    // - Optimizing paths between key structures
  }
}
```

---

## MISSION SUCCESS CRITERIA

### Phase I Complete When:
- [ ] `LegatusOfficio.ts` created and implemented
- [ ] Taskmaster can analyze ArchivistReport
- [ ] Taskmaster generates prioritized task list
- [ ] All task creation methods implemented
- [ ] Code compiles without errors

### Phase II Complete When:
- [ ] `LegatusGenetor.ts` created and implemented
- [ ] Broodmother can design creeps for all task types
- [ ] Broodmother can spawn creeps using Screeps API
- [ ] Body design methods for all roles implemented
- [ ] Code compiles without errors

### Phase III Complete When:
- [ ] `LegatusFabrum.ts` created with skeleton methods
- [ ] `LegatusViae.ts` created with skeleton methods
- [ ] Both files compile successfully
- [ ] Clear TODO comments indicate future implementation

---

## COMMUNICATION PROTOCOL

**CRITICAL**: You are BLOCKED until Agent Secundus completes. You are running in parallel once unblocked.

After EACH phase completion:
1. Update `CAMPAIGN_STATUS.md` with your status
2. Check for Agent Primus Phase III readiness before final integration
3. Post dispatch in this format:

```
AGENT TERTIUS DISPATCH - [Date/Time]
Phase: [I/II/III/WAITING]
Status: [COMPLETE/IN-PROGRESS/BLOCKED/WAITING]
Waiting For: [Agent Secundus Phase II / None]
Files Created: [list]
Files Modified: [list]
Implementation Status:
  - Taskmaster: [COMPLETE/IN-PROGRESS/NOT STARTED]
  - Broodmother: [COMPLETE/IN-PROGRESS/NOT STARTED]
  - Architect: [SKELETON/NOT STARTED]
  - Trailblazer: [SKELETON/NOT STARTED]
Compilation Test: [PASS/FAIL/NOT RUN]
Blockers: [None/Waiting for Agent Secundus/etc]
Next Action: [description]
Signal: [WAITING/IN-PROGRESS/ALL MAGISTRATES COMPLETE]
```

### Coordination Requirements:
- **Before Starting**: Wait for "Agent Secundus: Phase II COMPLETE" in `CAMPAIGN_STATUS.md`
- **After Phase III**: Signal "ALL MAGISTRATES COMPLETE" to unblock Agent Primus Phase III
- **Critical**: Agent Primus needs your completion for final integration

---

## CRITICAL NOTES

1. **⚠️ BLOCKED UNTIL AGENT SECUNDUS COMPLETES**: Check `CAMPAIGN_STATUS.md` before starting
2. **Focus on Core Logic**: Taskmaster and Broodmother are the priority
3. **Test after EVERY phase**: Run `npm run build` to verify compilation
4. **Architect & Trailblazer**: These are placeholders for future work - skeletons only
5. **Type Safety**: Import all types from `src/interfaces/`
6. **Error Handling**: Wrap Screeps API calls in try-catch where appropriate

## PARALLEL EXECUTION WARNINGS

⚠️ **DO NOT**:
- Start ANY work before Agent Secundus signals completion
- Modify interface files (Agent Secundus owns these)
- Forget to signal completion to Agent Primus

✅ **DO**:
- First action: Update `CAMPAIGN_STATUS.md` to "WAITING FOR AGENT SECUNDUS"
- Monitor `CAMPAIGN_STATUS.md` for Agent Secundus completion
- Update `CAMPAIGN_STATUS.md` after EACH phase
- Signal "ALL MAGISTRATES COMPLETE" when Phase III done
- Test compilation before signaling completion

⚠️ **COORDINATION**:
- You depend on Agent Secundus
- Agent Primus Phase III depends on you
- Update status file religiously

Ave Imperator! Stand ready to begin once Agent Secundus signals completion.

---

## 🆕 PHASE IV: OPERATION LEGIONARY - NEW ORDERS

**Status**: Phase III Complete ✅ | Phase IV Initiated ⚔️

### Your New Mission: Phase IV-C - Legion Commander Integration

**Objective**: Wire task execution into the main Empire loop

**Dependencies**: ⚠️ BLOCKED until Agent Secundus completes Phase IV-B (executors must exist first)

### Phase IV-C Tasks:

Once Agent Secundus signals "PHASE IV-B COMPLETE":

1. **Create `src/magistrates/LegatusLegionum.ts`**:
```typescript
import { Task, TaskType } from '../interfaces';
import { ExecutorFactory, TaskStatus, TaskResult } from '../execution';

/**
 * Legatus Legionum - The Legion Commander
 * 
 * Responsibility: Execute tasks assigned to creeps
 * Philosophy: Every creep is a soldier executing orders
 * 
 * The Legion Commander ensures each creep executes its assigned task.
 */
export class LegatusLegionum {
  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Execute tasks for all creeps in the room
   */
  public run(tasks: Task[]): void {
    const room = Game.rooms[this.roomName];
    if (!room) return;

    const creeps = room.find(FIND_MY_CREEPS);
    
    creeps.forEach(creep => {
      this.executeCreepTask(creep, tasks);
    });
  }

  private executeCreepTask(creep: Creep, tasks: Task[]): void {
    // Get creep's assigned task
    const taskId = creep.memory.task;
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      // Creep has no task - assign one
      this.assignTask(creep, tasks);
      return;
    }
    
    // Get executor for this task type
    const executor = ExecutorFactory.getExecutor(task.type);
    if (!executor) {
      console.log(`⚠️ No executor for task type: ${task.type}`);
      return;
    }
    
    // Execute the task
    const result = executor.execute(creep, task);
    
    // Handle result
    this.handleTaskResult(creep, task, result);
  }

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
    }
  }

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
      console.log(`❌ ${creep.name} failed ${task.type}: ${result.message}`);
      creep.memory.task = undefined;
    }
    // IN_PROGRESS and BLOCKED continue normally
  }
}
```

2. **Update `src/principate/Empire.ts`**:

Add import:
```typescript
import { LegatusLegionum } from '../magistrates/LegatusLegionum';
```

Update RoomMagistrates interface:
```typescript
interface RoomMagistrates {
  archivist: LegatusArchivus;
  taskmaster: LegatusOfficio;
  broodmother: LegatusGenetor;
  architect: LegatusFabrum;
  trailblazer: LegatusViae;
  legionCommander: LegatusLegionum;  // ADD THIS LINE
}
```

Update manageColonia to add Legion Commander:
```typescript
private manageColonia(room: Room): void {
  // Get or create magistrates for this room
  if (!this.magistratesByRoom.has(room.name)) {
    this.magistratesByRoom.set(room.name, {
      archivist: new LegatusArchivus(room.name),
      taskmaster: new LegatusOfficio(room.name),
      broodmother: new LegatusGenetor(room.name),
      architect: new LegatusFabrum(room.name),
      trailblazer: new LegatusViae(room.name),
      legionCommander: new LegatusLegionum(room.name)  // ADD THIS LINE
    });
  }

  const magistrates = this.magistratesByRoom.get(room.name)!;

  // Execute the Magistrate chain in order
  const report = magistrates.archivist.run(room);
  const tasks = magistrates.taskmaster.run(report);
  magistrates.broodmother.run(tasks);
  magistrates.legionCommander.run(tasks);  // ADD THIS LINE
  magistrates.architect.run();
  magistrates.trailblazer.run();
}
```

### Success Criteria:
- [ ] LegatusLegionum.ts created
- [ ] Empire.ts updated with Legion Commander
- [ ] Code compiles: `npm run build`
- [ ] Post completion to CAMPAIGN_STATUS.md

### After Completion:
Signal "PHASE IV-C COMPLETE" - PROJECT READY FOR DEPLOYMENT!

**This is the final piece. After you complete this, creeps will ACT! Ave!**
