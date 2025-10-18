# VS Code Autocomplete Setup - Console Commands

Your console commands are now fully autocompleted in VS Code! Here's how to use them.

## Quick Start

### 1. Open any `.ts` or `.js` file in VS Code
You can even create a temporary file like `console-test.js` if you want.

### 2. Start typing a command
```javascript
spawn
```

### 3. Press Ctrl+Space (or Cmd+Space on Mac) for autocomplete
You'll see all matching commands:
- `spawn`
- `spawnCreep`
- `status`

### 4. Select a command
Press Enter or click to select it. VS Code will insert the full signature with parameter hints.

### 5. See the parameter information
```javascript
spawn(role: string, roomName?: string)
                ↑
        Click here or hover for docs
```

### 6. Copy and paste into Screeps console
Select the entire command and copy:
```javascript
spawn('harvester', 'E3S42')
```

Then paste into your Screeps game console and hit Enter!

---

## Features

### ✅ Full Autocomplete
Start typing any command and see suggestions:
```javascript
sta[TAB] → status | structures | showNames
sca[TAB] → scan
leg[TAB] → legaStatus | legaList
```

### ✅ Parameter Hints
Hover over a parameter or press Ctrl+Shift+Space to see details:
```javascript
spawn(
  role: string,           ← Required: 'harvester', 'upgrader', 'builder', etc.
  roomName?: string       ← Optional: 'E3S42', 'W1N1', defaults to current room
): Creep | false          ← Returns Creep object or false if failed
```

### ✅ JSDoc Documentation
Hover over a function name to see full documentation:
```
spawn(role, roomName?)
Display a creep with auto-generated name. Room defaults to current room.

@param role - Role type: 'harvester' | 'upgrader' | 'builder' | 'scout' | 'hauler'
@param roomName - Optional: room name (defaults to current room)
@returns The new creep or false if spawn failed

@example spawn('harvester')
@example spawn('harvester', 'E3S42')
```

### ✅ Quick Examples
Each function includes @example tags showing common usage patterns.

---

## Common Workflows

### Spawning a Creep
```javascript
// Type: spa[TAB]
spawn('harvester')
// Full command ready to copy!
```

### Creating a Custom Body Config
```javascript
// Type: reg[TAB]
regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
```

### Assigning a Task
```javascript
// Type: tas[TAB] (gets 'task')
task('H1', 'harvest', 'SourceA')
```

### Visual Labels
```javascript
// Type: show[TAB]
showNames('E3S42', 10)

// Type: hide[TAB]
hideNames()
```

### Check Status
```javascript
// Type: sta[TAB] (gets 'status')
status('E3S42')

// Or full colony:
status()
```

---

## Tips & Tricks

### 1. Parameter Hints During Typing
Once you've selected a function, press **Ctrl+Shift+Space** to see parameter info again:
```javascript
spawn('harvester', |
       ↑ First parameter hint shows here
```

### 2. Hover for Full Documentation
Hover your mouse over any function name to see the full JSDoc comment:
```javascript
spawn('harvester')
  ↑ Hover here
```

### 3. Go to Definition (Optional)
Right-click → "Go to Definition" to jump to `src/types/console.d.ts` to see the full type definition.

### 4. Create a Command Snippet File
Create a file like `commands.js` to keep your frequently-used commands:
```javascript
// My Common Commands - Copy from here!
spawn('harvester', 'E3S42')
spawnCreep('H1', 'harvester', 'harvester_basic', 'E3S42')
task('H1', 'harvest', 'SourceA')
status('E3S42')
showNames('E3S42', 10)
```

Then when you need a command, just copy from this file instead of typing!

### 5. Use VS Code's Command Palette
Press Ctrl+Shift+P and search for "Go to Symbol" to jump to any command definition:
```
Ctrl+Shift+P → "Go to Symbol"
Type: spawn
Select to jump to spawn() definition
```

---

## File Location

The type definitions are in:
```
src/types/console.d.ts
```

If you want to add more commands or update documentation, edit this file. Changes will immediately reflect in VS Code's autocomplete.

---

## Supported Commands (28 Total)

**Status & Info:**
- `status()` - Colony status
- `help()` - Show all commands
- `memory()` - View Memory structure
- `config()` - View RCL configs
- `rooms()` - List owned rooms
- `room()` - Get Room object

**Spawning:**
- `spawn()` - Spawn with auto name
- `spawnCreep()` - Spawn with custom name
- `despawn()` - Delete creep
- `creeps()` - List creeps

**Bodies:**
- `bodies()` - List body configs
- `regBody()` - Register body config

**Tasks:**
- `task()` - Assign task to creep
- `tasks()` - View all tasks
- `untask()` - Clear task from creep

**Structures:**
- `scan()` - Scan room structures
- `structures()` - List structures
- `rename()` - Rename structure
- `lock()` - Lock structure
- `unlock()` - Unlock structure
- `locked()` - View locked structures

**Visuals:**
- `showNames()` - Display labels
- `hideNames()` - Hide labels

**Legatus:**
- `legaStatus()` - Show assignments
- `legaList()` - List assignments

**Movement:**
- `goto()` - Move creeps to position
- `flag()` - Place visual flag

**Empire:**
- `mode()` - Switch empire mode

**Utility:**
- `clear()` - Clear console

---

## Troubleshooting

### Q: Autocomplete isn't showing up
**A:** Make sure you're in a `.ts` or `.js` file. VS Code needs to detect it's a JavaScript/TypeScript context.

### Q: I don't see the parameter hints
**A:** Try pressing `Ctrl+Shift+Space` (Windows/Linux) or `Cmd+Shift+Space` (Mac) while the cursor is inside the function parentheses.

### Q: The autocomplete shows old suggestions
**A:** Reload VS Code (Ctrl+Shift+P → "Reload Window") or restart the TypeScript server (Ctrl+Shift+P → "TypeScript: Restart TS Server")

### Q: Can I use this in other projects?
**A:** The file `src/types/console.d.ts` is specific to this project. Other projects would need their own `.d.ts` files for their commands.

---

## Next Steps

1. ✅ Start typing commands in VS Code and enjoy autocomplete!
2. 📋 Keep `CONSOLE_COMMAND_EXAMPLES.md` open for full reference
3. 💾 Copy commands from VS Code and paste into Screeps console
4. 🎮 Watch your colony grow!

**Happy commanding! ⚔️**
