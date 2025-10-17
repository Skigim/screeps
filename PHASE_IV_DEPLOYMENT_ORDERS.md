# 🏛️ PHASE IV: OPERATION LEGIONARY - DEPLOYMENT ORDERS

**Imperator's Command**: Implement task-based execution system using the legion (3 AI agents)

---

## 📋 MISSION DOCUMENTS PREPARED

### 1. **BRIEFING_PHASE_IV.md** - Complete Tactical Orders
   - Detailed implementation specifications for all 3 agents
   - Code examples and patterns
   - Success criteria for each phase
   - Estimated 2-hour completion time

### 2. **PHASE_IV_STATUS.md** - Real-Time Status Tracker
   - Agent progress checklists
   - Dependency chain visualization
   - Risk register
   - Deployment readiness checklist

### 3. **CAMPAIGN_STATUS.md** - Updated
   - Phase IV objectives added
   - Agent assignments clear
   - Dispatch log ready for updates

### 4. **AGENT_COORDINATION_RULES.md** - Updated
   - New file ownership boundaries for Phase IV
   - Clear responsibility assignments
   - Prevents file conflicts

---

## 🎯 PHASE IV OBJECTIVES

### **The Problem**:
Our Empire can observe, plan, and spawn - but creeps **cannot execute tasks**.

### **The Solution**:
Implement a task-based execution system with:
- **Base framework** (TaskExecutor, TaskResult, Factory pattern)
- **8 specific executors** (Harvest, Transfer, Upgrade, Build, Repair, Withdraw, Defend, Idle)
- **Legion Commander** (Coordinates all creep execution)
- **Empire integration** (Wires execution into main loop)

---

## ⚔️ AGENT ASSIGNMENTS

### **Agent Primus** - Phase IV-A (20 minutes)
**Mission**: Build the execution framework
- Create `src/execution/` directory
- Implement base `TaskExecutor` class
- Create `TaskResult` interface
- Build `ExecutorFactory` skeleton
- **No blockers** - can start immediately

### **Agent Secundus** - Phase IV-B (90 minutes)
**Mission**: Implement 8 task executors
- HarvestExecutor (harvest from sources)
- TransferExecutor (deliver energy to structures)
- UpgradeExecutor (upgrade controller)
- BuildExecutor (build construction sites)
- RepairExecutor (repair damaged structures)
- WithdrawExecutor (withdraw from storage/containers)
- DefendExecutor (attack hostiles)
- IdleExecutor (default behavior)
- **Blocked until**: Agent Primus completes Phase IV-A

### **Agent Tertius** - Phase IV-C (30 minutes)
**Mission**: Integrate execution into Empire
- Create `LegatusLegionum` (Legion Commander)
- Update `Empire.ts` to use Legion Commander
- Wire execution chain: Observe → Plan → Spawn → **Execute**
- Test task assignment and completion
- **Blocked until**: Agent Secundus completes Phase IV-B

---

## 📊 EXECUTION FLOW (After Phase IV)

```
┌─────────────────────────────────────────────────────────┐
│                    GAME TICK START                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  ARCHIVIST: Observes room (sources, energy, threats)    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  TASKMASTER: Creates prioritized tasks                  │
│  - HARVEST_ENERGY (priority 85)                         │
│  - REFILL_SPAWN (priority 80)                           │
│  - UPGRADE_CONTROLLER (priority 55)                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  BROODMOTHER: Spawns creeps for unfilled tasks          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LEGION COMMANDER: Executes tasks with creeps  ⭐ NEW   │
│  1. Assign tasks to unassigned creeps                   │
│  2. Get executor for each creep's task                  │
│  3. Execute task (move → action → result)               │
│  4. Handle completion/failure/blocking                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     TICK COMPLETE                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT SEQUENCE

### **Step 1**: Deploy All Three Agents Simultaneously
- They will self-coordinate using CAMPAIGN_STATUS.md
- Agent Primus starts immediately
- Agents Secundus and Tertius wait for signals

### **Step 2**: Monitor Progress
- Check `PHASE_IV_STATUS.md` for progress tracking
- Agents will post dispatches to `CAMPAIGN_STATUS.md`
- Estimated completion: 2 hours

### **Step 3**: Verify Build
- After all agents signal completion
- Run `npm run build`
- Verify 0 errors

### **Step 4**: Deploy to Screeps
- Recommended: Test in simulation room first
- Watch first 100 ticks carefully
- Verify creeps harvest → transfer → upgrade

---

## ✅ SUCCESS METRICS

After Phase IV deployment, you should see:

1. **Tick 1-10**: Empire initializes, Archivist reports room state
2. **Tick 10-20**: Taskmaster creates HARVEST_ENERGY tasks
3. **Tick 20-30**: Broodmother spawns harvester creeps
4. **Tick 30+**: Creeps **move to sources and harvest** ⭐
5. **Tick 50+**: Creeps transfer energy to spawns
6. **Tick 70+**: Creeps upgrade controller
7. **Continuous**: Energy economy flowing, tasks completing and reassigning

---

## 📁 FILES TO WATCH

### **Created During Phase IV**:
```
src/
├── execution/
│   ├── TaskExecutor.ts       (Primus)
│   ├── TaskResult.ts         (Primus)
│   ├── ExecutorFactory.ts    (Primus + Secundus)
│   ├── index.ts              (Primus)
│   └── executors/
│       ├── HarvestExecutor.ts    (Secundus)
│       ├── TransferExecutor.ts   (Secundus)
│       ├── UpgradeExecutor.ts    (Secundus)
│       ├── BuildExecutor.ts      (Secundus)
│       ├── RepairExecutor.ts     (Secundus)
│       ├── WithdrawExecutor.ts   (Secundus)
│       ├── DefendExecutor.ts     (Secundus)
│       └── IdleExecutor.ts       (Secundus)
└── magistrates/
    └── LegatusLegionum.ts    (Tertius)

src/principate/Empire.ts      (Modified by Tertius)
```

---

## 🎖️ READY FOR DEPLOYMENT

**All coordination documents prepared.**  
**All agent briefings complete.**  
**File ownership boundaries established.**  
**Success criteria defined.**

**Ave Imperator! The legion awaits your order to march.** ⚔️

---

**Next Command**: Deploy your three agents to begin Phase IV implementation.
