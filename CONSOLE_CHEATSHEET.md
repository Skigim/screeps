## ⚡ SCREEPS CONSOLE COMMANDS - QUICK REFERENCE

### 📊 STATUS
`status()` | `status('W1N1')` | `creeps()` | `creeps('W1N1')` | `memory()` | `memory(creep)` | `config()` | `config(1)` | `rooms()` | `room('W1N1')`

### 🎯 SPAWN & CREEPS
`spawn('harvester','W1N1')` | `spawnCreep('H1','harvester','harvester_basic','W1N1')` | `despawn('creepName')` | `bodies()` | `bodies('harvester')` | `regBody('name', [WORK,MOVE], 'harvester')`

### 📍 MOVEMENT
`goto(x, y, 'room')` | `goto('creepName')`

### ✅ TASKS
`task('creepName', 'harvest', 'SourceA')` | `task('creepName', 'deliver', 'SpawnMain')` | `task('creepName', 'build', 'site1')` | `task('creepName', 'upgrade')` | `task('creepName', 'move', '25:20:W1N1')` | `task('creepName', 'repair', 'Tower')` | `task('creepName', 'idle')` | `tasks()` | `tasks('W1N1')` | `untask('creepName')`

### 🏗️ STRUCTURES
`scan('W1N1')` | `scan()` | `structures()` | `structures('W1N1')` | `rename('SourceA', 'MainSource')` | `lock('SourceA')` | `unlock('SourceA')` | `locked()` | `locked('W1N1')`

### 👁️ VISUALS & LEGATUS
`showNames('W1N1')` | `showNames('W1N1', 10)` | `hideNames('W1N1')` | `legaStatus('W1N1')` | `legaList('W1N1')`

### 🎮 EMPIRE
`mode()` | `mode('command')` | `mode('delegate')`

### 🛠️ UTILITY
`help()` | `flag(x, y, 'room')` | `clear()`

---

### 📦 DEFAULT BODIES
`harvester_basic` [W,C,M] | `upgrader_basic` [W,C,M] | `builder_basic` [W,C,M] | `scout` [M] | `hauler` [C,C,C,M,M] | `worker` [W,W,C,M]

### 💡 QUICK WORKFLOW
```javascript
scan('W1N1')
showNames('W1N1')
spawnCreep('H1', 'harvester', 'harvester_basic', 'W1N1')
task('harvester_12345', 'harvest', 'SourceA')
status()
```
