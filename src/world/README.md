# World Module - Screeps RCL1 Foundation

This directory contains all game logic for the Screeps AI, organized into clean, documented modules.

## 📁 Directory Structure

```
src/world/
├── index.ts              # Main entry point, re-exports key functions
├── constants.ts          # Shared constants
├── README.md            # This file
├── creeps/              # Creep role behaviors
│   ├── index.ts         # Creep dispatcher
│   ├── harvester.ts     # Harvester role (gather energy)
│   ├── upgrader.ts      # Upgrader role (upgrade controller)
│   └── builder.ts       # Builder role (build structures)
├── rooms/               # Room-level orchestration
│   ├── index.ts         # Room module exports
│   └── orchestrator.ts  # Room logic coordinator
├── spawns/              # Spawn management
│   ├── index.ts         # Spawn module exports
│   └── manager.ts       # Spawn strategy and body design
└── types/               # Local type definitions
    └── index.d.ts       # World-specific types
```

## 🎯 Architecture Overview

### Main Loop Flow
1. **src/main.ts** - Entry point, cleans memory and iterates rooms
2. **world/rooms/orchestrator.ts** - Runs all logic for each room
3. **world/spawns/manager.ts** - Manages creep spawning priority
4. **world/creeps/[role].ts** - Individual creep behaviors

### Module Responsibilities

#### 🏠 Rooms Module (`rooms/`)
- **orchestrator.ts** - Coordinates spawning, creeps, and room statistics
- Counts creeps by role
- Calls spawn manager
- Dispatches creep behaviors
- Logs room stats

#### 👷 Creeps Module (`creeps/`)
- **index.ts** - Unified `runCreep()` dispatcher
- **harvester.ts** - Gathers energy, fills spawn/extensions
- **upgrader.ts** - Upgrades controller to increase RCL
- **builder.ts** - Builds construction sites

Each role file is fully documented with:
- Role purpose and strategy
- State machine explanation
- Function-level documentation
- Code comments explaining decisions

#### 🏭 Spawns Module (`spawns/`)
- **manager.ts** - Spawn strategy and body design
- Priority-based spawning (harvesters → upgraders → builders)
- Scalable `[WORK, CARRY, MOVE]` body pattern
- Energy-based body optimization

## 🚀 Usage Examples

### Import and use in main.ts
```typescript
import { runRoom } from './world';

export const loop = () => {
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller?.my) {
      runRoom(room);
    }
  }
};
```

### Add a new creep role
1. Create `src/world/creeps/myrole.ts`
2. Export `runMyRole(creep: Creep)` function
3. Update `src/world/creeps/index.ts`:
   ```typescript
   import { runMyRole } from './myrole';
   
   export function runCreep(creep: Creep) {
     switch (creep.memory.role) {
       // ... existing cases
       case 'myrole':
         runMyRole(creep);
         break;
     }
   }
   ```
4. Update spawn manager to spawn your new role

### Customize spawn priorities
Edit `src/world/spawns/manager.ts` → `manageSpawn()` function
Change priority order or counts as needed.

### Customize body design
Edit `src/world/spawns/manager.ts` → `getBody()` function
Modify the body part pattern (currently `[WORK, CARRY, MOVE]`).

## 📚 Learning Resources

Each file has comprehensive documentation explaining:
- **Why** the code does what it does
- **How** the algorithms work
- **What** each function is responsible for

Start by reading:
1. `src/main.ts` - Understand the main loop
2. `world/rooms/orchestrator.ts` - See how rooms are managed
3. `world/creeps/harvester.ts` - Example of a well-documented role

## 🎓 Next Steps

Now that the structure is in place, you can:
- **Experiment** with different spawn priorities
- **Add** new creep roles (e.g., repairer, hauler)
- **Optimize** pathfinding and energy efficiency
- **Expand** to RCL2+ features (towers, links, etc.)
- **Learn** by modifying and observing behavior changes

Every function is documented, so you can jump into any file and understand what's happening. Good luck with your Screeps journey! 🎮
