# SpawnManager Fallback Logic Examples

## How It Works

The SpawnManager automatically falls back to the highest available RCL config when an exact match doesn't exist.

## Example Scenarios

### Scenario 1: Exact Match
```
Available Configs: RCL 1, RCL 2, RCL 3
Current Room RCL: 2
Result: Uses RCL 2 config ✅
```

### Scenario 2: Fallback to Lower RCL
```
Available Configs: RCL 1, RCL 2, RCL 3
Current Room RCL: 5
Result: Uses RCL 3 config (highest available) ⬇️
Console: "ℹ️ Using RCL 3 config for RCL 5 (fallback)"
```

### Scenario 3: Progressive Development
```
Available Configs: RCL 1 only
Current Room RCL: 1 → Uses RCL 1 ✅
Current Room RCL: 2 → Uses RCL 1 (fallback) ⬇️
Current Room RCL: 3 → Uses RCL 1 (fallback) ⬇️
... (continues until you add RCL 2 config)
```

### Scenario 4: Adding New Configs
```
Day 1:
  Available: RCL 1
  Room at RCL 3
  Behavior: Uses RCL 1 config (fallback)

Day 2 (after adding RCL 2 config):
  Available: RCL 1, RCL 2
  Room at RCL 3
  Behavior: Uses RCL 2 config (fallback)

Day 3 (after adding RCL 3 config):
  Available: RCL 1, RCL 2, RCL 3
  Room at RCL 3
  Behavior: Uses RCL 3 config (exact match) ✅
```

## Benefits

1. **No Breaking Changes**: Rooms continue spawning even without new configs
2. **Incremental Development**: Add RCL configs as you progress naturally
3. **Visual Feedback**: Console messages remind you when fallback is active
4. **Safe Defaults**: Always uses your most advanced config available

## Console Messages

### Normal Operation (Exact Match)
```
No special message - silent operation
```

### Fallback Active
```
ℹ️ Using RCL 3 config for RCL 5 (fallback)
```
*Appears every 100 ticks as a reminder*

### No Config Available (Edge Case)
```
⚠️ No spawn config available (tried RCL X and all fallbacks)
```
*This only happens if RCL_CONFIGS is completely empty*

## Development Workflow

1. **Start**: Deploy with only RCL 1 config
2. **Progress**: Room reaches RCL 2
3. **Automatic**: Continues using RCL 1 config (fallback)
4. **Develop**: Create RCL 2 config when ready
5. **Deploy**: SpawnManager automatically uses RCL 2 config
6. **Repeat**: For RCL 3-8

No downtime, no breakage! 🎉
