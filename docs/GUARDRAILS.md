# Spawn Guardrails Documentation

## Problem: Death Spiral Prevention

### Root Cause
When transitioning from RCL 1 to RCL 2, the room entered a death spiral where:
1. All creeps died naturally (1500 tick lifespan)
2. Upgraders/builders withdrew energy from spawn/extensions
3. Spawn couldn't accumulate enough energy (200) to spawn replacements
4. Room ended with 0 creeps and only 76/300 energy

### Critical Guardrails Implemented

## 1. Energy Reservation for Spawning

**Files Modified:** `src/roles/upgrader.ts`, `src/roles/builder.ts`

**Logic:**
- Upgraders and builders check `room.energyAvailable < 200` before withdrawing
- If below threshold, they **DO NOT** withdraw from spawn/extensions
- Instead, they enter "crisis mode" and help bootstrap economy

**Code:**
```typescript
const shouldReserveEnergy = creep.room.energyAvailable < 200;

if (!shouldReserveEnergy) {
  // Safe to withdraw - room has enough for spawning
  // ... normal withdraw logic
} else {
  // CRISIS MODE: harvest instead
}
```

## 2. Crisis Mode Harvesting

**Files Modified:** `src/roles/upgrader.ts`, `src/roles/builder.ts`

**Logic:**
When energy is reserved OR no energy available in spawn/extensions:
1. First, try to pickup dropped energy
2. If no dropped energy, harvest directly from sources
3. This helps bootstrap economy when harvesters are dead/insufficient

**Code:**
```typescript
// Energy reserved for spawning OR no energy in spawn/extensions
const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
if (droppedEnergy) {
  // Pickup dropped energy
} else {
  // CRISIS MODE: Harvest directly from source
  const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  if (source) {
    creep.harvest(source);
  }
}
```

## 3. Progressive Harvester Priority

**File Modified:** `src/managers/SpawnManager.ts`

**Logic:**
- Calculate harvester ratio: `harvesterCount / harvesterTarget`
- If ratio < 50%, **ONLY** spawn harvesters
- Skip all other roles (upgraders, builders) until harvester ratio ≥ 50%
- Forces energy income before spawning energy consumers

**Code:**
```typescript
const harvesterRatio = harvesterTarget > 0 ? harvesterCount / harvesterTarget : 1;

for (const [roleName, roleConfig] of roleEntries) {
  if (currentCount < roleConfig.target) {
    // GUARDRAIL: Force harvester priority when ratio < 50%
    if (harvesterRatio < 0.5 && roleName !== "harvester") {
      console.log(`🛡️ Harvester deficit - skipping ${roleName}`);
      continue;
    }
    // ... spawn logic
  }
}
```

## 4. Emergency Spawn Body

**Already Correct:** `[WORK, CARRY, MOVE]` = 200 energy

- Spawn generates 1 energy/tick naturally
- From 76 energy → 200 energy takes 124 ticks (acceptable)
- No need for smaller body - the guardrails prevent the death spiral

## Expected Behavior

### Normal Operation (Harvester Ratio ≥ 50%)
1. Harvesters harvest from sources
2. Upgraders/builders withdraw from spawn/extensions (if energy ≥ 200)
3. Spawn spawns replacements in priority order

### Crisis Mode (Harvester Ratio < 50%)
1. **Only harvesters spawn** until ratio ≥ 50%
2. Upgraders/builders **cannot** withdraw if energy < 200
3. Upgraders/builders **harvest** to help bootstrap economy
4. Room recovers to normal operation once harvesters respawn

### Recovery from Total Death (0 Creeps)
1. Spawn accumulates energy naturally (1/tick)
2. At 200 energy, spawns emergency harvester
3. Emergency harvester bootstraps economy
4. System recovers following crisis mode rules

## Testing Scenarios

### Scenario 1: Single Harvester Death
- **Before:** Room might struggle if upgraders withdrew energy
- **After:** Energy reserved, upgraders harvest, new harvester spawns

### Scenario 2: Multiple Harvester Deaths
- **Before:** Could spiral into total death
- **After:** Progressive priority forces harvester spawning first

### Scenario 3: Total Creep Death
- **Before:** Stuck at low energy forever
- **After:** Spawn accumulates to 200, spawns emergency harvester, recovers

### Scenario 4: RCL Transition (1→2)
- **Before:** Config change could destabilize room
- **After:** Guardrails prevent death spiral during transition

## Configuration Files

### RCL 1 Config (`src/configs/RCL1Config.ts`)
- 3 Harvesters (priority 1)
- 2 Upgraders (priority 2)
- **NO Builders** (correct for RCL 1)

### RCL 2 Config (`src/configs/RCL2Config.ts`)
- 4 Harvesters (priority 1)
- 3 Upgraders (priority 2)
- 2 Builders (priority 3)
- Builders only spawn when harvester ratio ≥ 50% (2+ harvesters)

## Metrics to Monitor

1. **Harvester Ratio:** `harvesterCount / harvesterTarget`
   - Target: ≥ 50% minimum, 100% ideal

2. **Energy Available:** `room.energyAvailable`
   - Target: ≥ 200 for normal operations

3. **Crisis Mode Triggers:**
   - Count how often upgraders/builders enter harvest mode
   - Should be rare in stable room

4. **Spawn Queue:**
   - Monitor "skipping X role" messages
   - Indicates progressive priority is working

## Future Improvements

1. **Dynamic Energy Threshold:**
   - Scale reservation threshold based on room capacity
   - RCL 1: 200, RCL 2: 200, RCL 3+: 300+

2. **Harvester Ratio Tuning:**
   - Consider 33% threshold instead of 50%
   - Balance between safety and efficiency

3. **Builder Priority:**
   - Consider making builders optional (priority 4+)
   - Only spawn if construction sites exist

4. **Energy Efficiency:**
   - Track energy waste (dropped energy > threshold)
   - Adjust harvester count dynamically
