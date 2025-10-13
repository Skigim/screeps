# Stats Collection System

## Overview

Automated performance and room metrics tracking system that stores data in `Memory.stats`.

## Features

### Automatic Collection
- **Frequency:** Every tick
- **Storage:** Last 20 ticks (configurable via `MAX_TICKS_STORED`)
- **Auto-cleanup:** Old data automatically removed

### Tracked Metrics

#### Global Stats (Per Tick)
```typescript
{
  time: number,        // Game tick
  cpu: {
    used: number,      // CPU used this tick
    limit: number,     // CPU limit
    bucket: number     // CPU bucket level
  },
  memory: {
    used: number       // Memory size in bytes
  },
  gcl: {
    level: number,
    progress: number,
    progressTotal: number
  }
}
```

#### Room Stats (Per Room, Per Tick)
```typescript
{
  rcl: number,
  controller: {
    progress: number,
    progressTotal: number,
    ticksToDowngrade: number
  },
  energy: {
    available: number,
    capacity: number
  },
  creeps: {
    [role: string]: number   // Count by role
  },
  spawns: {
    total: number,
    spawning: number
  },
  sources: {
    total: number,
    energyAvailable: number,
    energyCapacity: number,
    assignedWorkParts: number,
    maxWorkParts: number
  }
}
```

## Console Commands

### Display Stats Summary
```javascript
stats()
```
Shows formatted summary of the latest tick's stats including:
- CPU usage and bucket
- Memory usage
- GCL progress
- Per-room breakdown (RCL, energy, creeps, sources)

### Clear All Stats
```javascript
clearStats()
```
Removes all stored stats from Memory (useful for debugging or cleanup).

### View Raw Data
```javascript
Memory.stats                           // All stats
Memory.stats[Game.time]                // Current tick
Object.keys(Memory.stats).length       // Number of ticks stored
```

## Usage Examples

### Check Current Performance
```javascript
stats()
```
Output:
```
╔════════════════════════════════════════════╗
║ Stats Summary (Tick 12345678)              ║
╠════════════════════════════════════════════╣
║ CPU: 15.42/20 | Bucket: 9847               ║
║ Memory: 42.3 KB                            ║
║ GCL: 2 (1234/5678)                         ║
╠════════════════════════════════════════════╣
║ Room: E35N38                               ║
║   RCL: 2 | Energy: 250/300                 ║
║   Creeps: 9                                ║
║     harvester: 4                           ║
║     upgrader: 3                            ║
║     builder: 2                             ║
╚════════════════════════════════════════════╝
Stored ticks: 20/20
```

### Monitor CPU Over Time
```javascript
// Get CPU usage for last 5 ticks
const ticks = Object.keys(Memory.stats).map(Number).sort((a,b) => b-a).slice(0,5);
ticks.forEach(t => console.log(`Tick ${t}: ${Memory.stats[t].cpu.used.toFixed(2)} CPU`));
```

### Check Source Efficiency
```javascript
const tick = Game.time;
const room = Memory.stats[tick]?.rooms['E35N38'];
if (room) {
  const efficiency = (room.sources.assignedWorkParts / room.sources.maxWorkParts * 100).toFixed(1);
  console.log(`Source efficiency: ${efficiency}% (${room.sources.assignedWorkParts}/${room.sources.maxWorkParts})`);
}
```

### Track Energy Income
```javascript
// Compare energy over last 3 ticks
const ticks = Object.keys(Memory.stats).map(Number).sort((a,b) => b-a).slice(0,3);
ticks.forEach(t => {
  const room = Memory.stats[t]?.rooms['E35N38'];
  console.log(`Tick ${t}: ${room?.energy.available}/${room?.energy.capacity}`);
});
```

## Implementation

### Integration
The stats collector is automatically called at the end of each game loop in `main.ts`:
```typescript
export const loop = ErrorMapper.wrapLoop(() => {
  // ... game logic ...

  // Collect stats at the end of each tick
  StatsCollector.collect();
});
```

### Memory Structure
```javascript
Memory.stats = {
  12345678: { time: 12345678, cpu: {...}, memory: {...}, gcl: {...}, rooms: {...} },
  12345679: { time: 12345679, cpu: {...}, memory: {...}, gcl: {...}, rooms: {...} },
  // ... up to 20 most recent ticks
}
```

## Configuration

### Adjust Storage Limit
Edit `src/utils/StatsCollector.ts`:
```typescript
private static readonly MAX_TICKS_STORED = 20; // Change this value
```

### Add Custom Metrics
Extend the `RoomStats` or `TickStats` interfaces and update the `collectRoomStats()` method:
```typescript
export interface RoomStats {
  // ... existing fields ...
  customMetric: number;
}

private static collectRoomStats(room: Room): RoomStats {
  // ... existing code ...
  return {
    // ... existing fields ...
    customMetric: /* your calculation */
  };
}
```

## Performance Impact

- **CPU:** ~0.1-0.3 CPU per tick (minimal)
- **Memory:** ~200-500 bytes per tick × 20 ticks = 4-10 KB
- **Auto-cleanup:** Prevents memory bloat

## Best Practices

1. **Don't store stats for too many ticks** - 20 is usually sufficient for short-term analysis
2. **Use stats for debugging** - Identify CPU spikes, energy bottlenecks, source inefficiencies
3. **Clear stats when experimenting** - `clearStats()` before testing new code
4. **Export for long-term analysis** - Copy `Memory.stats` to external tools if needed

## Future Enhancements

Potential additions:
- Construction progress tracking
- Creep lifetime statistics
- Energy harvested per tick
- Spawn utilization percentage
- Crisis mode event logging
- Remote room statistics
