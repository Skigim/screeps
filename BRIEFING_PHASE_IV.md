# MISSION BRIEFING: OPERATION LEGIONARY - PHASE IV

## Campaign Designation
**Phase IV: Creep Task Execution System**

## Strategic Objective
Implement the execution layer that enables creeps to autonomously execute assigned tasks. Transform our Empire from planning to action - from strategy to tactics on the ground.

## Current Situation
- ✅ **Observation Layer**: Archivist reports room state
- ✅ **Planning Layer**: Taskmaster generates prioritized tasks
- ✅ **Spawning Layer**: Broodmother creates optimized creeps
- ❌ **EXECUTION LAYER**: **MISSING** - Creeps cannot act on their tasks

---

## General Directives for All Agents

**Language**: TypeScript with strict type safety  
**Architecture**: Task-based execution system (not role-based)  
**Philosophy**: Each creep is a legionary that executes orders (tasks), not a role  
**Testing**: Compile and test after each phase  
**Coordination**: Update `CAMPAIGN_STATUS.md` after each deliverable  

---

## TRACK 1: AGENT PRIMUS (The Executor Architectus)

**Role**: Design and implement the core task execution framework

### Phase IV-A: Task Executor Interface & Base Class

**Tasks**:

1. **Create `src/execution/` directory**

2. **Create `src/execution/TaskExecutor.ts`** - Base class for all task executors
```typescript
/**
 * Base class for task execution
 * Each TaskType has a corresponding executor that knows how to execute it
 */
export abstract class TaskExecutor {
  abstract execute(creep: Creep, task: Task): TaskResult;
  
  /**
   * Check if creep is at the target position
   */
  protected isAtTarget(creep: Creep, target: RoomPosition | RoomObject): boolean {
    return creep.pos.isNearTo(target);
  }
  
  /**
   * Move creep to target
   */
  protected moveToTarget(creep: Creep, target: RoomPosition | RoomObject): ScreepsReturnCode {
    return creep.moveTo(target, {
      visualizePathStyle: { stroke: '#ffffff' },
      reusePath: 10
    });
  }
}
```

3. **Create `src/execution/TaskResult.ts`** - Result interface
```typescript
export enum TaskStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED'
}

export interface TaskResult {
  status: TaskStatus;
  message?: string;
  energyUsed?: number;
  workDone?: number;
}
```

4. **Create `src/execution/ExecutorFactory.ts`** - Factory to get the right executor
```typescript
/**
 * Factory that returns the appropriate TaskExecutor for a given TaskType
 */
export class ExecutorFactory {
  private static executors: Map<TaskType, TaskExecutor> = new Map();
  
  public static getExecutor(taskType: TaskType): TaskExecutor | null {
    // Initialize executors on first use
    if (this.executors.size === 0) {
      this.initializeExecutors();
    }
    
    return this.executors.get(taskType) || null;
  }
  
  private static initializeExecutors(): void {
    // Will be populated by Agent Secundus
  }
}
```

**Deliverables**:
- Directory: `src/execution/`
- File: `src/execution/TaskExecutor.ts` (base class)
- File: `src/execution/TaskResult.ts` (result interface)
- File: `src/execution/ExecutorFactory.ts` (factory pattern)
- File: `src/execution/index.ts` (exports)

---

## TRACK 2: AGENT SECUNDUS (The Executor Implementor)

**Role**: Implement specific task executors for each task type

### Phase IV-B: Core Task Executors

**Priority 1 Executors** (Critical for survival):

1. **`src/execution/executors/HarvestExecutor.ts`**
   - Move to source if not adjacent
   - Execute `creep.harvest(source)`
   - Handle container positioning
   - Return COMPLETED when source empty or creep full

2. **`src/execution/executors/TransferExecutor.ts`**
   - Move to target structure (spawn, extension, tower)
   - Execute `creep.transfer(target, RESOURCE_ENERGY)`
   - Handle multiple transfer targets
   - Return COMPLETED when creep empty

3. **`src/execution/executors/UpgradeExecutor.ts`**
   - Move to controller if not in range
   - Execute `creep.upgradeController(controller)`
   - Work until energy depleted
   - Return COMPLETED when out of energy

**Priority 2 Executors** (Construction & Maintenance):

4. **`src/execution/executors/BuildExecutor.ts`**
   - Move to construction site
   - Execute `creep.build(site)`
   - Return COMPLETED when site finished or out of energy

5. **`src/execution/executors/RepairExecutor.ts`**
   - Move to structure
   - Execute `creep.repair(structure)`
   - Return COMPLETED when structure at max hits or out of energy

6. **`src/execution/executors/WithdrawExecutor.ts`**
   - Move to container/storage
   - Execute `creep.withdraw(structure, RESOURCE_ENERGY)`
   - Return COMPLETED when creep full or structure empty

**Priority 3 Executors** (Special Operations):

7. **`src/execution/executors/DefendExecutor.ts`**
   - Move to hostile
   - Execute `creep.attack(hostile)` or `creep.rangedAttack(hostile)`
   - Return IN_PROGRESS while hostile exists

8. **`src/execution/executors/IdleExecutor.ts`**
   - Default fallback
   - Move to parking position (near controller)
   - Return IN_PROGRESS

**Implementation Pattern** (example for HarvestExecutor):
```typescript
import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

export class HarvestExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has target
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No harvest target' };
    }
    
    const source = Game.getObjectById(task.targetId as Id<Source>);
    if (!source) {
      return { status: TaskStatus.FAILED, message: 'Source not found' };
    }
    
    // Check if creep is full
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return { status: TaskStatus.COMPLETED, message: 'Creep full' };
    }
    
    // Check if source is empty
    if (source.energy === 0) {
      return { status: TaskStatus.BLOCKED, message: 'Source empty' };
    }
    
    // Move to source if not adjacent
    if (!this.isAtTarget(creep, source)) {
      this.moveToTarget(creep, source);
      return { status: TaskStatus.IN_PROGRESS, message: 'Moving to source' };
    }
    
    // Harvest
    const result = creep.harvest(source);
    if (result === OK) {
      return { status: TaskStatus.IN_PROGRESS, message: 'Harvesting' };
    } else {
      return { status: TaskStatus.FAILED, message: `Harvest failed: ${result}` };
    }
  }
}
```

**Deliverables**:
- 8 executor files in `src/execution/executors/`
- Update `ExecutorFactory.ts` to register all executors
- Export all executors from `src/execution/index.ts`

---

## TRACK 3: AGENT TERTIUS (The Legatus Executor)

**Role**: Integrate task execution into the main game loop

### Phase IV-C: Creep Executor Integration

**Tasks**:

1. **Create `src/magistrates/LegatusLegionum.ts`** - The Legion Commander
```typescript
/**
 * Legatus Legionum - The Legion Commander
 * 
 * Responsibility: Execute tasks assigned to creeps
 * Philosophy: Every creep is a soldier executing orders
 * 
 * The Legion Commander ensures each creep executes its assigned task.
 * It coordinates creep behavior and handles task lifecycle.
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

2. **Update `src/principate/Empire.ts`**
   - Import `LegatusLegionum`
   - Add to `RoomMagistrates` interface
   - Instantiate in `manageColonia`
   - Call `legionCommander.run(tasks)` after Broodmother

3. **Create visual indicators** (optional but helpful)
   - Add task type indicator above creeps
   - Show path visualization
   - Display energy levels

**Deliverables**:
- File: `src/magistrates/LegatusLegionum.ts`
- Updated: `src/principate/Empire.ts` with Legion Commander integration
- Verified: Full execution chain (Observe → Plan → Spawn → **Execute**)

---

## DEPENDENCY CHAIN

```
AGENT PRIMUS (Phase IV-A: Framework)
        ↓
AGENT SECUNDUS (Phase IV-B: Executors) 
        ↓
AGENT TERTIUS (Phase IV-C: Integration)
        ↓
BUILD & DEPLOY TEST
```

---

## SUCCESS CRITERIA

### Phase IV-A Complete (Agent Primus):
- [ ] `src/execution/` directory created
- [ ] `TaskExecutor` base class implemented
- [ ] `TaskResult` interface defined
- [ ] `ExecutorFactory` skeleton created
- [ ] Code compiles without errors

### Phase IV-B Complete (Agent Secundus):
- [ ] All 8 executors implemented
- [ ] Each executor handles movement, action, and result
- [ ] `ExecutorFactory` populated with all executors
- [ ] Code compiles without errors
- [ ] Type safety verified

### Phase IV-C Complete (Agent Tertius):
- [ ] `LegatusLegionum` implemented
- [ ] Empire.ts integration complete
- [ ] Task assignment logic operational
- [ ] Task completion handling works
- [ ] Build succeeds
- [ ] **Ready for live deployment**

---

## TESTING STRATEGY

After Phase IV completion:
1. Deploy to Screeps (private server or sim room recommended first)
2. Observe first 100 ticks
3. Verify:
   - Creeps spawn ✓
   - Tasks assigned ✓
   - Creeps move to targets ✓
   - Actions execute ✓
   - Tasks complete and reassign ✓
   - Energy flows (harvest → transfer → upgrade) ✓

---

## COMMUNICATION PROTOCOL

Each agent must post to `CAMPAIGN_STATUS.md` after completing their phase:

```
### AGENT [NAME] DISPATCH - Phase IV-[A/B/C] COMPLETE
**Phase**: IV-[A/B/C]
**Status**: ✅ COMPLETE
**Files Created**: [list]
**Compilation**: [PASS/FAIL]
**Critical Signal**: PHASE IV-[A/B/C] COMPLETE
```

---

## ESTIMATED TIMELINE

- **Agent Primus Phase IV-A**: 20 minutes (framework is straightforward)
- **Agent Secundus Phase IV-B**: 60-90 minutes (8 executors with logic)
- **Agent Tertius Phase IV-C**: 30 minutes (integration and testing)
- **Total**: ~2 hours

---

**Ave Imperator! Phase IV will give our legions the ability to march and fight. Deploy the agents when ready.**
