# Screeps Architecture

## State Machine-Based RCL Management

### Overview
The system uses a state machine architecture where RCL configs define the state, and managers execute behaviors based on that state.

### Structure

```
src/
├── configs/
│   ├── RCL1Config.ts      # RCL 1 state definition
│   ├── RCL2Config.ts      # (TODO) RCL 2 state definition
│   └── ...                # (TODO) RCL 3-8 state definitions
│
├── managers/
│   ├── RoomStateManager.ts     # State machine orchestrator
│   ├── SpawnManager.ts         # Spawning behavior executor
│   ├── AssignmentManager.ts    # Source assignment behavior executor
│   └── RCL1SpawnManager.ts     # (DEPRECATED - to be removed)
│
└── main.ts                # Minimal orchestrator (creep cleanup + role execution)
```

### How It Works

1. **RCL Configs** (`src/configs/RCL*Config.ts`)
   - Define the STATE for each RCL level
   - Specify role targets, body parts, priorities
   - Configure source assignment rules
   - Export an `RCLConfig` object

2. **RoomStateManager** (`src/managers/RoomStateManager.ts`)
   - **State Machine Orchestrator**
   - Loads appropriate RCL config based on room level
   - Fallback logic: uses highest available config if exact match not found
   - Delegates to specialized managers (SpawnManager, AssignmentManager)
   - Displays consolidated room status

3. **SpawnManager** (`src/managers/SpawnManager.ts`)
   - **Behavior Executor** (not state holder)
   - Receives config from RoomStateManager
   - Executes spawning based on config priorities
   - Pure execution logic, no state decisions

4. **AssignmentManager** (`src/managers/AssignmentManager.ts`)
   - **Behavior Executor** (not state holder)
   - Receives config from RoomStateManager
   - Executes source assignments based on config rules
   - Handles all assignment logic internally
   - Pure execution logic, no state decisions

5. **Main Loop** (`src/main.ts`)
   - **Minimal Orchestrator**
   - Cleans up dead creep memory
   - Calls RoomStateManager for each owned room
   - Executes creep roles
   - No business logic, just coordination

### Adding New RCL Levels

To add support for a new RCL level:

1. **Create Config File**: `src/configs/RCL2Config.ts`
```typescript
export const RCL2Config: RCLConfig = {
  roles: {
    harvester: {
      target: 4,
      body: [WORK, WORK, CARRY, MOVE, MOVE],
      priority: 1,
      assignToSource: true
    },
    upgrader: {
      target: 3,
      body: [WORK, CARRY, MOVE],
      priority: 2
    },
    builder: {
      target: 2,
      body: [WORK, CARRY, MOVE],
      priority: 3
    }
  },
  sourceAssignment: {
    maxWorkPartsPerSource: 10  // RCL2: Increase to 10 work parts
  }
};
```

2. **Register in RoomStateManager**: `src/managers/RoomStateManager.ts`
```typescript
import { RCL2Config } from "configs/RCL2Config";

private static readonly RCL_CONFIGS: { [rcl: number]: RCLConfig } = {
  1: RCL1Config,
  2: RCL2Config  // Add this line
};
```

3. **Done!** The state machine automatically uses it when the room reaches RCL 2.

### Benefits

- **State-Driven**: Configs define WHAT to do, managers define HOW
- **Separation of Concerns**: State (configs) vs. Behavior (managers)
- **Centralized Control**: RoomStateManager is single source of truth
- **Testable**: Managers can be tested with different configs
- **Scalable**: Easy to add new RCL levels and new managers
- **Clean Main Loop**: main.ts has zero business logic
- **Graceful Degradation**: Fallback logic ensures rooms keep working

### Data Flow

```
Game Tick Start
      ↓
main.ts: Clean up dead creeps
      ↓
main.ts: For each owned room → RoomStateManager.run(room)
      ↓
RoomStateManager: Get RCL config for room
      ↓
RoomStateManager: SpawnManager.run(spawn, config)
      ↓
RoomStateManager: AssignmentManager.run(room, config)
      ↓
main.ts: For each creep → Execute role behavior
      ↓
Game Tick End
```

### Example: RCL1Config

```typescript
export const RCL1Config: RCLConfig = {
  roles: {
    harvester: {
      target: 3,                        // Spawn 3 harvesters
      body: [WORK, CARRY, MOVE],        // Simple 200-energy body
      priority: 1                        // Highest priority
    },
    upgrader: {
      target: 2,                        // Spawn 2 upgraders
      body: [WORK, CARRY, MOVE],        // Simple 200-energy body
      priority: 2                        // Second priority
    }
  }
};
```

### Migration Notes

- Old `RCL1SpawnManager.ts` is now **deprecated**
- All RCL-specific logic should be in config files
- SpawnManager handles all the spawning logic centrally
- **Fallback Behavior**: Rooms at higher RCLs will automatically use the highest available config until you add their specific config
  - Example: RCL 4 room with only RCL 1-2 configs will use RCL 2 config
  - Console message appears every 100 ticks to remind you: `ℹ️ Using RCL X config for RCL Y (fallback)`
