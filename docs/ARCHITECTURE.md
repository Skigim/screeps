# Screeps Architecture

## Spawn Management System

### Overview
The spawn management system uses a modular, config-driven architecture that separates RCL-specific logic from the core spawning engine.

### Structure

```
src/
├── configs/
│   ├── RCL1Config.ts      # RCL 1 spawn targets and body configs
│   ├── RCL2Config.ts      # (TODO) RCL 2 configuration
│   └── ...                # (TODO) RCL 3-8 configurations
│
├── managers/
│   ├── SpawnManager.ts         # Central spawn manager (imports configs)
│   ├── AssignmentManager.ts    # Source assignment logic
│   └── RCL1SpawnManager.ts     # (DEPRECATED - to be removed)
│
└── main.ts                # Calls SpawnManager.run(spawn)
```

### How It Works

1. **Config Files** (`src/configs/RCL*Config.ts`)
   - Define role targets (e.g., 3 harvesters, 2 upgraders)
   - Define body parts for each role
   - Set spawning priority for each role
   - Export an `RCLConfig` object

2. **SpawnManager** (`src/managers/SpawnManager.ts`)
   - Imports all RCL configs
   - Automatically selects the correct config based on room's RCL
   - **Fallback Logic**: If a config doesn't exist for the current RCL, it uses the highest available config (e.g., if RCL 5 but only RCL 1-3 configs exist, uses RCL 3)
   - Handles spawn logic for all RCL levels
   - Spawns creeps based on priority and target counts

3. **Main Loop** (`src/main.ts`)
   - Calls `SpawnManager.run(spawn)` for each room
   - SpawnManager handles everything else automatically

### Adding New RCL Levels

To add support for a new RCL level:

1. **Create Config File**: `src/configs/RCL2Config.ts`
```typescript
export const RCL2Config: RCLConfig = {
  roles: {
    harvester: {
      target: 4,
      body: [WORK, WORK, CARRY, MOVE, MOVE],
      priority: 1
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
  }
};
```

2. **Import in SpawnManager**: `src/managers/SpawnManager.ts`
```typescript
import { RCL2Config } from "configs/RCL2Config";

private static readonly RCL_CONFIGS: { [rcl: number]: RCLConfig } = {
  1: RCL1Config,
  2: RCL2Config  // Add this line
};
```

3. **Done!** SpawnManager will automatically use it when the room reaches RCL 2.

### Benefits

- **Modularity**: Each RCL config is separate and independent
- **Scalability**: Easy to add new RCL levels without touching core logic
- **Graceful Degradation**: Fallback logic ensures rooms keep working even without exact RCL configs
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Simple to adjust targets and body compositions per RCL
- **Type Safety**: Full TypeScript type checking for configs

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
