# MISSION BRIEFING: AGENT PRIMUS (The Architectus)

## Designation
**Agent Primus** - Foundation Engineer & Build Master

## Mission Objective
Establish the project infrastructure, build tooling, and main execution loop for Project Imperium. You are responsible for ensuring the empire can compile, bundle, and deploy to the Screeps server.

## Chain of Command
- **Reports to**: Strategic Coordinator (Human Commander)
- **Dependencies**: Agent Secundus must complete interface definitions before you can finalize Empire.ts
- **Supports**: All other agents depend on your build pipeline

---

## PHASE I: PROJECT INITIALIZATION (No Dependencies)

### Task 1.1: Initialize NPM Project
**File**: `package.json`

```json
{
  "name": "project-imperium",
  "version": "1.0.0",
  "description": "A modular, hierarchical AI framework for Screeps - Ave Imperator!",
  "main": "dist/main.js",
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -cw",
    "deploy": "npm run build && node deploy.js"
  },
  "keywords": ["screeps", "ai", "typescript"],
  "author": "",
  "license": "MIT"
}
```

### Task 1.2: Install Dependencies
**Execute in terminal**:
```powershell
npm install --save-dev typescript rollup rollup-plugin-typescript2 rollup-plugin-clear @types/node @types/screeps eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

### Task 1.3: TypeScript Configuration
**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "lib": ["ES2018"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Task 1.4: Rollup Configuration
**File**: `rollup.config.js`

```javascript
import clear from 'rollup-plugin-clear';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    clear({ targets: ['dist'] }),
    typescript({ tsconfig: './tsconfig.json' })
  ],
  external: []
};
```

### Task 1.5: ESLint Configuration
**File**: `.eslintrc.js`

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

### Task 1.6: Prettier Configuration
**File**: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Task 1.7: Deployment Script Template
**File**: `screeps.sample.json`

```json
{
  "main": {
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "path": "/",
    "branch": "main",
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD"
  },
  "local": {
    "protocol": "http",
    "hostname": "localhost",
    "port": 21025,
    "path": "/",
    "branch": "main"
  }
}
```

**File**: `deploy.js`

```javascript
const fs = require('fs');

// Basic deployment script
// In a real setup, this would use screeps API to upload code
console.log('Deployment script placeholder - configure screeps.json for actual deployment');

if (!fs.existsSync('screeps.json')) {
  console.log('⚠️  No screeps.json found. Copy screeps.sample.json to screeps.json and configure your credentials.');
  process.exit(1);
}

console.log('✓ Build complete. Ready for deployment.');
```

**Signal Completion**: Report "PHASE I COMPLETE" when all above files are created and `npm install` succeeds.

---

## PHASE II: MAIN EXECUTION LOOP (Requires Secundus interfaces)

### Task 2.1: Main Entry Point
**File**: `src/main.ts`

```typescript
import { Empire } from './principate/Empire';

// Initialize the Empire once (persists across ticks via global scope)
const empire = new Empire();

// This is the main game loop - called every tick by Screeps
export const loop = (): void => {
  try {
    // Clear dead creep memory
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }

    // Execute the Empire's master plan
    empire.run();
  } catch (error) {
    console.log(`❌ CRITICAL ERROR in main loop: ${error}`);
    if (error instanceof Error) {
      console.log(`Stack: ${error.stack}`);
    }
  }
};
```

### Task 2.2: Empire Master Controller (SKELETON - DO NOT FULLY IMPLEMENT YET)
**File**: `src/principate/Empire.ts`

```typescript
/**
 * The Empire - The Principate
 * 
 * The highest authority in Project Imperium. Orchestrates all subordinate systems
 * and executes the grand strategy each tick.
 * 
 * Responsibilities:
 * - Initialize all Consul and Magistrate instances
 * - Execute the main decision cycle each tick
 * - Handle empire-wide state management
 */
export class Empire {
  private isInitialized: boolean = false;

  constructor() {
    console.log('🏛️ The Empire awakens...');
  }

  /**
   * Main execution function - called every game tick
   */
  public run(): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // TODO: This will be expanded after Magistrate classes are built
    this.executeImperialStrategy();
  }

  private initialize(): void {
    console.log('⚔️ Ave Imperator! Project Imperium initializing...');
    
    // TODO: Initialize Consuls (after they are created)
    // TODO: Initialize Magistrates for each room
    
    this.isInitialized = true;
  }

  private executeImperialStrategy(): void {
    // High-level empire logic will go here
    // For now, just ensure we're running
    
    // TODO: Phase 3 - Wire in Magistrates for each room
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        // This is our room - manage it
        this.manageColonia(room);
      }
    }
  }

  private manageColonia(room: Room): void {
    // TODO: Phase 3 - Create and run Magistrate instances
    // For now, just log that we see the room
    if (Game.time % 10 === 0) {
      console.log(`📍 Managing Colonia: ${room.name}`);
    }
  }
}
```

---

## PHASE III: INTEGRATION (Requires Tertius completion)

### Task 3.1: Wire Magistrates into Empire
Once Agent Tertius completes the Magistrate classes, update `Empire.ts`:

```typescript
// Add these imports at the top
import { LegatusArchivus } from '../magistrates/LegatusArchivus';
import { LegatusOfficio } from '../magistrates/LegatusOfficio';
import { LegatusGenetor } from '../magistrates/LegatusGenetor';
import { LegatusFabrum } from '../magistrates/LegatusFabrum';
import { LegatusViae } from '../magistrates/LegatusViae';

// In the Empire class, add a property to store Magistrates per room
private magistratesByRoom: Map<string, RoomMagistrates> = new Map();

interface RoomMagistrates {
  archivist: LegatusArchivus;
  taskmaster: LegatusOfficio;
  broodmother: LegatusGenetor;
  architect: LegatusFabrum;
  trailblazer: LegatusViae;
}

// Update the manageColonia method
private manageColonia(room: Room): void {
  // Get or create magistrates for this room
  if (!this.magistratesByRoom.has(room.name)) {
    this.magistratesByRoom.set(room.name, {
      archivist: new LegatusArchivus(room.name),
      taskmaster: new LegatusOfficio(room.name),
      broodmother: new LegatusGenetor(room.name),
      architect: new LegatusFabrum(room.name),
      trailblazer: new LegatusViae(room.name)
    });
  }

  const magistrates = this.magistratesByRoom.get(room.name)!;

  // Execute the Magistrate chain
  const report = magistrates.archivist.run(room);
  const tasks = magistrates.taskmaster.run(report);
  magistrates.broodmother.run(tasks);
  magistrates.architect.run();
  magistrates.trailblazer.run();
}
```

---

## MISSION SUCCESS CRITERIA

### Phase I Complete When:
- [ ] All configuration files created
- [ ] Dependencies installed successfully
- [ ] Project structure exists: `src/`, `dist/` directories
- [ ] `npm run build` command exists (may fail until code is written)

### Phase II Complete When:
- [ ] `src/main.ts` created with loop export
- [ ] `src/principate/Empire.ts` created with skeleton
- [ ] Project compiles without errors: `npm run build` succeeds
- [ ] `dist/main.js` is generated

### Phase III Complete When:
- [ ] All Magistrate imports added to Empire.ts
- [ ] Magistrate instances created per room
- [ ] Full execution chain runs without errors
- [ ] Console shows empire activity logs

---

## COMMUNICATION PROTOCOL

**CRITICAL**: You are running in parallel with Agents Secundus and Tertius.

After EACH phase completion:
1. Update `CAMPAIGN_STATUS.md` with your status
2. Check `CAMPAIGN_STATUS.md` for dependency signals
3. Post dispatch in this format:

```
AGENT PRIMUS DISPATCH - [Date/Time]
Phase: [I/II/III]
Status: [COMPLETE/IN-PROGRESS/BLOCKED/WAITING]
Blockers: [None/Waiting on Agent Secundus Phase II/etc]
Files Created: [list]
Files Modified: [list]
Tests Passed: [npm run build result]
Next Action: [description]
Signal: [READY/BLOCKED/COMPLETE]
```

### Coordination Checkpoints:
- **After Phase I**: Signal "PHASE I COMPLETE" - Do NOT proceed to Phase II
- **Before Phase II**: Check that Agent Secundus has signaled "PHASE II COMPLETE"
- **Before Phase III**: Check that Agent Tertius has signaled "ALL MAGISTRATES COMPLETE"

---

## NOTES FOR SUCCESS

1. **Phase I**: Proceed IMMEDIATELY - no dependencies
2. **⚠️ STOP AFTER PHASE I**: Do NOT start Phase II until Agent Secundus completes Phase II
3. **Phase II Check**: Look in `CAMPAIGN_STATUS.md` for "Agent Secundus: Phase II COMPLETE"
4. **Phase III Check**: Look in `CAMPAIGN_STATUS.md` for "Agent Tertius: ALL MAGISTRATES COMPLETE"
5. **Test after EVERY phase**: Run `npm run build` and verify success
6. **Maintain Rome's discipline** - clean, documented, type-safe code only

## PARALLEL EXECUTION WARNINGS

⚠️ **DO NOT**:
- Modify files outside your assigned directories during Phase I
- Proceed to Phase II without explicit confirmation from Agent Secundus
- Assume other agents are done - CHECK `CAMPAIGN_STATUS.md`

✅ **DO**:
- Update `CAMPAIGN_STATUS.md` after EACH phase
- Wait at phase boundaries for dependencies
- Signal clearly when ready for next phase
- Test compilation before signaling completion

Ave Imperator! Your mission begins now.
