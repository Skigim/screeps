# Demand-Based Spawning System

## Overview

The spawning system has been refactored from **hard-coded population targets** to **intelligent demand-based spawning**. The system calculates spawn needs dynamically based on actual room conditions while using RCL configs to guide body compositions and behaviors.

## Architecture

### The Hybrid Approach

**RCL Configs Define:**
- ✅ Body part compositions for each role at that RCL
- ✅ Behavior patterns (energySource: "harvest"/"withdraw", workTarget: "spawn/extensions"/etc.)
- ✅ Infrastructure guidelines (maxWorkPartsPerSource, etc.)
- ✅ Strategic flags (enableBuilders, useContainers)

**SpawnRequestGenerator Calculates:**
- ✅ Dynamic population counts (how many harvesters/upgraders/builders needed RIGHT NOW)
- ✅ Spawn prioritization based on current room state
- ✅ Adaptive responses to emergencies

### Component Responsibilities

#### 1. **RCL Configs** (`src/configs/RCL1Config.ts`, `RCL2Config.ts`)
```typescript
export const RCL1Config: RCLConfig = {
  roles: {
    harvester: {
      body: [WORK, CARRY, MOVE],  // Body composition
      priority: 1,
      assignToSource: true,
      behavior: {
        energySource: "harvest",   // HOW they work
        workTarget: "spawn/extensions"
      }
    },
    upgrader: { /* ... */ }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 5
  },
  spawning: {
    enableBuilders: false,  // RCL 1 has no builders (nothing to build)
    useContainers: false
  }
};
```

**Key Changes:**
- ❌ **Removed:** `target: number` fields (no more hard-coded counts)
- ✅ **Added:** `spawning.enableBuilders` flag (RCL progression control)
- ✅ **Added:** `spawning.useContainers` flag (logistics model toggle)
- ✅ **Enhanced:** Documentation with RCL progression strategy from game docs

#### 2. **SpawnRequestGenerator** (`src/managers/SpawnRequestGenerator.ts`)

Generates spawn requests based on actual room conditions:

```typescript
generateRequests(room: Room): SpawnRequest[]
```

**Harvester Logic:**
- **Count:** 1 per source + 1 spare
- **Reasoning:** Ensures all sources covered with redundancy
- **Body:** Uses `config.roles.harvester.body`

**Upgrader Logic:**
- **Count (RCL 1):** 2 upgraders (just enough to keep upgrading)
- **Count (RCL 2):** 3 upgraders (push to RCL 3)
- **Count (RCL 3+):** Up to 5, scaled by energy capacity
- **Body:** Uses `config.roles.upgrader.body`

**Builder Logic:**
- **Conditional:** Only spawns if `config.spawning.enableBuilders === true`
- **Count:** 0 if no construction sites exist
- **Count:** 1 per 10,000 construction progress needed (min 1, max 3)
- **Body:** Uses `config.roles.builder.body`

#### 3. **SpawnManager** (`src/managers/SpawnManager.ts`)

Processes spawn requests and executes spawning:

```typescript
run(spawn: StructureSpawn): void
```

**Key Features:**
- Generates requests via `SpawnRequestGenerator.generateRequests(room)`
- Sorts requests by priority (lower number = higher priority)
- Emergency spawning if no creeps alive
- Logs spawn reason from request (e.g., "Source coverage: 2/3 harvesters")
- Displays active requests every 10 ticks

#### 4. **RoomStateManager** (`src/managers/RoomStateManager.ts`)

Orchestrates all managers:

```typescript
public static run(room: Room): void {
  const config = this.getConfigForRoom(room);

  // Run spawn manager (demand-based, no config needed for counts)
  SpawnManager.run(spawn);

  // Run assignment manager (uses config for maxWorkPartsPerSource)
  AssignmentManager.run(room, config);
}
```

**Integration:**
- SpawnManager no longer receives config parameter (it fetches internally)
- AssignmentManager still uses config for `maxWorkPartsPerSource`
- Roles still receive config for behavior guidance

## Spawn Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│ RoomStateManager.run(room)                                   │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ SpawnManager.run(spawn)                                      │
│   ├─ Generate requests: SpawnRequestGenerator.generateReq() │
│   ├─ Sort by priority                                        │
│   └─ Process first viable request                            │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ SpawnRequestGenerator.generateRequests(room)                 │
│   ├─ Get config: RoomStateManager.getConfigForRoom()        │
│   ├─ Request harvesters (1 per source + 1 spare)            │
│   ├─ Request upgraders (RCL-scaled: RCL1=2, RCL2=3)         │
│   └─ Request builders (if enabled && construction exists)    │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ RCL Config (RCL1Config / RCL2Config)                         │
│   ├─ Body compositions: [WORK, CARRY, MOVE]                 │
│   ├─ Behaviors: energySource, workTarget                     │
│   ├─ Flags: enableBuilders, useContainers                    │
│   └─ Priority: harvester=1, upgrader=2, builder=3            │
└──────────────────────────────────────────────────────────────┘
```

## Example Spawn Reasons

The system logs **why** each spawn is requested:

```
✅ Spawning harvester: Harvester_12345 (Source coverage: 2/3 harvesters)
✅ Spawning upgrader: Upgrader_12346 (Controller upgrading: 1/2 upgraders)
✅ Spawning builder: Builder_12347 (Construction: 5 sites, 25000 progress needed)
```

## Guardrails Integration

All existing guardrails remain active:

1. **Progressive Harvester Priority:** SpawnRequestGenerator only generates upgrader/builder requests if `harvesterCount >= minHarvesters`
2. **Energy Reservation:** Upgraders/builders don't withdraw if `room.energyAvailable < 200` (in role logic)
3. **Crisis Mode:** Upgraders/builders harvest from sources when energy reserved (in role logic)
4. **Emergency Spawn:** SpawnManager spawns immediately if `totalCreeps === 0`

## Benefits

### Adaptive Spawning
- **Source Changes:** Automatically adjusts harvester count if sources are added/removed
- **Construction Phases:** Builders only spawn during RCL 2 infrastructure buildout
- **RCL Progression:** Upgrader count scales naturally with RCL

### Config-Driven Behavior
- **Body Scaling:** Update `config.roles.harvester.body` to `[WORK×5, MOVE]` and all future harvesters use it
- **Logistics Models:** Toggle `useContainers: true` to enable container-based behaviors
- **Role Enablement:** Set `enableBuilders: false` at RCL 1 (nothing to build)

### Maintainability
- **Clear Separation:** Configs define "HOW", Generator defines "HOW MANY"
- **RCL Progression:** Configs document RCL strategy from your game docs
- **Future Scaling:** Add RCL 3-8 configs with new roles (towers, haulers, remote miners)

## Next Steps

1. **Test in Game:** Deploy and verify spawn counts match expected behavior
2. **RCL 2 Container Logistics:** Add hauler role once containers are built
3. **Dynamic Body Scaling:** Update configs to use variable bodies based on `room.energyCapacityAvailable`
4. **RCL 3+ Configs:** Create configs for higher RCLs with towers, labs, etc.

## Migration Notes

### What Changed
- **Removed:** `config.roles.X.target` fields (hard-coded population targets)
- **Added:** `config.spawning.enableBuilders` (RCL progression control)
- **Added:** `config.spawning.useContainers` (logistics model toggle)
- **Refactored:** SpawnManager now generates requests dynamically

### Backwards Compatibility
- ✅ All role behaviors unchanged (roles still receive config)
- ✅ AssignmentManager still uses config
- ✅ RoomStateManager still orchestrates everything
- ✅ Guardrails still active

### Files Modified
- `src/configs/RCL1Config.ts` - Removed targets, added flags
- `src/configs/RCL2Config.ts` - Removed targets, added flags
- `src/managers/SpawnRequestGenerator.ts` - Uses configs for body/behavior, calculates counts
- `src/managers/SpawnManager.ts` - Replaced with demand-based version
- `src/managers/RoomStateManager.ts` - Updated SpawnManager call (no config param)

### Files Deprecated
- `src/managers/SpawnManager_old.ts` - Old config-driven version (backup)
- `src/configs/RCLBehaviors.ts` - Prototype for pure demand-based (not used)
