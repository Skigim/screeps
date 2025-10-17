# AGENT COORDINATION RULES - PARALLEL EXECUTION

## ⚠️ CRITICAL: READ BEFORE STARTING

All three agents (Primus, Secundus, Tertius) are executing simultaneously. This document defines the rules of engagement to prevent conflicts and ensure successful coordination.

---

## THE DEPENDENCY CHAIN

```
AGENT SECUNDUS (CRITICAL PATH - NO BLOCKERS)
        ↓
        ├──→ AGENT PRIMUS (Phase II blocked until Secundus Phase II done)
        └──→ AGENT TERTIUS (ALL phases blocked until Secundus Phase II done)
                    ↓
            AGENT PRIMUS (Phase III blocked until Tertius complete)
```

---

## FILE OWNERSHIP - DO NOT VIOLATE

### Agent Primus Owns:
- `package.json`
- `tsconfig.json`
- `rollup.config.js`
- `.eslintrc.js`
- `.prettierrc`
- `screeps.sample.json`
- `deploy.js`
- `src/main.ts`
- `src/principate/Empire.ts`

**DO NOT MODIFY** these files if you are not Agent Primus.

### Agent Secundus Owns:
- `src/interfaces/*.ts` (ALL files in interfaces directory)
- `src/magistrates/LegatusArchivus.ts`

**DO NOT MODIFY** these files if you are not Agent Secundus.

### Agent Tertius Owns:
- `src/magistrates/LegatusOfficio.ts`
- `src/magistrates/LegatusGenetor.ts`
- `src/magistrates/LegatusFabrum.ts`
- `src/magistrates/LegatusViae.ts`

**DO NOT MODIFY** these files if you are not Agent Tertius.

### Shared Coordination File:
- `CAMPAIGN_STATUS.md` - ALL AGENTS update this, but use append-only to avoid conflicts

---

## PHASE GATES - MANDATORY STOPS

### Agent Primus:
1. **After Phase I**: STOP. Update `CAMPAIGN_STATUS.md`. Wait for Agent Secundus Phase II.
2. **After Phase II**: STOP. Update `CAMPAIGN_STATUS.md`. Wait for Agent Tertius completion.
3. **After Phase III**: STOP. Update `CAMPAIGN_STATUS.md`. Signal mission complete.

### Agent Secundus:
1. **After Phase I**: STOP. Update `CAMPAIGN_STATUS.md`. Verify compilation.
2. **After Phase II**: STOP. Update `CAMPAIGN_STATUS.md`. Signal "PHASE II COMPLETE" clearly.

### Agent Tertius:
1. **Before ANY work**: STOP. Check `CAMPAIGN_STATUS.md` for Agent Secundus Phase II completion.
2. **After Phase I**: STOP. Update `CAMPAIGN_STATUS.md`. Test compilation.
3. **After Phase II**: STOP. Update `CAMPAIGN_STATUS.md`. Test compilation.
4. **After Phase III**: STOP. Update `CAMPAIGN_STATUS.md`. Signal "ALL MAGISTRATES COMPLETE".

---

## CAMPAIGN_STATUS.md UPDATE PROTOCOL

When updating `CAMPAIGN_STATUS.md`, follow this format:

```markdown
### [Agent Name] - [Timestamp]
**Phase**: [Phase Number]
**Status**: [COMPLETE/IN-PROGRESS/WAITING/BLOCKED]
**Signal**: [Key phrase like "PHASE II COMPLETE"]
**Files Modified**: [List files you changed]
**Next Action**: [What you're doing next or what you're waiting for]
```

**Append to the bottom** of the dispatch log - do not modify other agents' entries.

---

## TESTING REQUIREMENTS

After EACH phase completion:

1. Run `npm run build` (if Agent Primus Phase I is done)
2. Verify NO compilation errors
3. Check that your types are correct
4. Only then signal completion

---

## CONFLICT RESOLUTION

If two agents modify the same file:
1. **STOP IMMEDIATELY**
2. Report conflict in `CAMPAIGN_STATUS.md`
3. The agent with file ownership (see above) takes precedence
4. Other agent reverts their changes

---

## SUCCESS CRITERIA - ALL AGENTS

The mission is complete when:
- [ ] All phases from all agents are marked COMPLETE
- [ ] `npm run build` succeeds with no errors
- [ ] `dist/main.js` is generated
- [ ] No file ownership violations occurred
- [ ] All coordination signals were properly posted

---

## COMMUNICATION STYLE

Use **clear, unambiguous signals** in `CAMPAIGN_STATUS.md`:

✅ **GOOD**: "Agent Secundus Phase II COMPLETE - All interfaces exported and tested"
❌ **BAD**: "I think I'm done with the interfaces"

✅ **GOOD**: "Agent Tertius WAITING - Blocked on Agent Secundus Phase II"
❌ **BAD**: "Not sure if I should start yet"

---

**Ave Imperator! Coordinate with discipline. Rome was built on order, not chaos.**
