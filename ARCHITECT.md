# Architect - Intelligent Room Planning System

## Overview

The **Architect** is an intelligent, automated room planning system that analyzes room topology and uses pathfinding data to optimally place infrastructure. It's designed to be extensible, data-driven, and eventually a community-ready room planner.

## Philosophy

1. **Pathfinding-Informed**: Uses Traveler pathfinding to determine optimal road networks and container placement
2. **Minimize Travel Time**: Reduces creep walking = less CPU, faster economy
3. **Terrain-Adaptive**: Analyzes terrain to avoid walls, prefer plains over swamps
4. **RCL-Progressive**: Plans infrastructure appropriate for each RCL level
5. **Community-Ready**: Built with extensibility and documentation for future open-source release

## RCL 2 Infrastructure

### Extensions (5 total)
**Placement:** Crescent pattern around spawn

**Rationale:**
- Keeps extensions close to spawn for fast energy access
- Crescent front arc creates visual organization
- Easy to expand pattern as more extensions unlock at higher RCLs

**Pattern:**
```
  E E E    (Front arc: 3 extensions)
E  S  E    (Side positions: 2 extensions, S = spawn)
```

### Source Containers
**Placement:** Adjacent to each energy source

**Algorithm:**
1. Find all walkable positions adjacent to source
2. Score each position based on:
   - Open neighbors (accessibility)
   - Terrain type (prefer plains, avoid swamps)
3. Select highest-scoring position

**Rationale:**
- Enables stationary harvester pattern (RCL 2 Phase 3)
- Harvester mines directly into container
- Haulers transport from container to spawn/extensions

### Destination Container (Controller)
**Placement:** Between spawn and controller, adjacent to controller

**Algorithm:**
1. Pathfind from spawn to controller using Traveler
2. Find last path position adjacent to controller
3. Validate position is buildable
4. Fallback: Any valid adjacent position if path-based fails

**Rationale:**
- Upgraders can withdraw from container instead of returning to spawn
- Haulers deliver energy directly to upgraders
- Reduces upgrader travel time dramatically

### Road Network
**Placement:** Connecting spawn → source containers → controller container

**Algorithm:**
1. Pathfind from spawn to each source container
2. Pathfind from spawn to controller container
3. Merge all paths into single road network
4. Remove duplicates (set-based deduplication)

**Rationale:**
- Roads reduce fatigue and speed up all logistics
- Connecting key infrastructure ensures haulers move efficiently
- Uses actual pathfinding data (not just straight lines)

## Usage

### Automatic Execution
The Architect runs automatically in `RoomStateManager`:

```typescript
// Triggered once per RCL change
if (rcl >= 2 && lastPlannedRCL !== rcl) {
  const plan = Architect.planRoom(room);
  Architect.executePlan(room, plan);
}
```

### Manual Planning (Console)
```javascript
// Plan infrastructure for a room
const plan = Architect.planRoom(Game.rooms['E35N38']);

// Execute the plan (place construction sites)
Architect.executePlan(Game.rooms['E35N38'], plan);

// Visualize the plan (room visuals)
Architect.visualizePlan(Game.rooms['E35N38'], plan);
```

## Construction Priority

Infrastructure is built in priority order:

1. **Extensions** (highest) - Increase energy capacity
2. **Source Containers** - Enable efficient harvesting
3. **Controller Container** - Enable efficient upgrading
4. **Roads** (lowest) - Nice-to-have speed boost

This ensures critical infrastructure is built first when builders are limited.

## Data Structures

### ArchitectPlan
```typescript
interface ArchitectPlan {
  extensions: RoomPosition[];                    // All extension positions
  sourceContainers: Map<string, RoomPosition>;   // sourceId -> container position
  destContainers: {
    controller?: RoomPosition;                   // Controller container
    // Future: storage, terminal, etc.
  };
  roads: RoomPosition[];                         // All road positions
}
```

## API Reference

### `Architect.planRoom(room: Room): ArchitectPlan`
Generates a complete infrastructure plan for a room.

**Returns:** Plan object with all positions

**Example:**
```javascript
const plan = Architect.planRoom(Game.rooms['E35N38']);
console.log(`Extensions: ${plan.extensions.length}`);
console.log(`Source containers: ${plan.sourceContainers.size}`);
```

### `Architect.executePlan(room: Room, plan: ArchitectPlan): void`
Executes a plan by placing construction sites.

**Behavior:**
- Respects 100 construction site game limit
- Prioritizes extensions > containers > roads
- Skips positions that already have structures
- Logs placement results

**Example:**
```javascript
const plan = Architect.planRoom(Game.rooms['E35N38']);
Architect.executePlan(Game.rooms['E35N38'], plan);
```

### `Architect.visualizePlan(room: Room, plan: ArchitectPlan): void`
Displays plan in room visuals for debugging.

**Visual Legend:**
- 🟢 Green circles = Extensions
- 🟡 Yellow squares = Source containers
- 🔵 Blue square = Controller container
- ⚫ Gray circles = Roads

**Example:**
```javascript
const plan = Architect.planRoom(Game.rooms['E35N38']);
Architect.visualizePlan(Game.rooms['E35N38'], plan);
```

## Future Enhancements

### RCL 3+
- **Towers:** Optimal defensive placement using threat analysis
- **Labs:** Research cluster layouts
- **Storage/Terminal:** Central logistics hub
- **Link Network:** Energy teleportation grid

### Advanced Features
- **Room Templates:** Pre-designed layouts for common room shapes
- **Multi-Room Coordination:** Highway road networks, remote mining outposts
- **Threat-Aware Planning:** Avoid placing critical structures near exits in hostile sectors
- **Energy Efficiency Scoring:** Calculate and display expected CPU/tick savings

### Community Release
- **Standalone Module:** Package as importable library
- **Configuration Options:** Allow users to customize patterns (e.g., square vs crescent extensions)
- **Visualization Tools:** Web-based room planner preview
- **Documentation Site:** Full API docs, examples, migration guides

## Technical Notes

### Pathfinding Integration
The Architect uses **Traveler.findTravelPath()** for all pathfinding:
- Roads follow actual creep paths (not straight lines)
- Accounts for terrain and obstacles
- Ensures roads are where creeps actually walk

### Performance Considerations
- Planning happens once per RCL change (not every tick)
- Results are cached in `roomPlansExecuted` map
- Construction site placement is throttled by game limit (100 sites)

### Edge Cases Handled
- No spawn in room → Skip planning
- No valid positions for containers → Log warning, continue
- Construction site limit reached → Stop placing, log warning
- Impassable terrain → Fallback to alternate positions

## Integration with Demand-Based Spawning

The Architect works seamlessly with the demand-based spawning system:

1. **RCL 2 Hit:** Architect places 5 extension sites
2. **SpawnRequestGenerator:** Detects construction sites, requests builders
3. **Builders Spawn:** Build extensions (priority 1)
4. **Extensions Complete:** Energy capacity increases (300 → 550)
5. **Architect:** Places container sites
6. **Builders Build:** Containers enable container-based logistics
7. **Config Update:** Set `useContainers: true` in RCL2Config

This creates a self-managing progression loop!

## Example Output

```
📐 Architect: Planning infrastructure for E35N38 (RCL 2)
✅ Architect: Placed extension at [25, 15]
✅ Architect: Placed extension at [26, 15]
✅ Architect: Placed extension at [27, 15]
✅ Architect: Placed extension at [24, 16]
✅ Architect: Placed extension at [28, 16]
✅ Architect: Placed container at [10, 20] (source)
✅ Architect: Placed container at [40, 35] (source)
✅ Architect: Placed container at [25, 45] (controller)
📐 Architect: Placed 8 construction sites in E35N38

Spawn Requests (1):
  [P3] builder: Construction: 8 sites, 45000 progress needed
```

## Contributing

If you're interested in contributing to the Architect or have ideas for features:
1. Test in your own Screeps worlds
2. Report bugs or edge cases
3. Suggest layout patterns or algorithms
4. Help with documentation

Future goal: Community-ready NPM package! 🚀
