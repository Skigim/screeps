# Development Instructions

## Recent context

- Roles use the `creep-tasks` task-based system; keep new behavior task-centric and compatible with existing assignments.
- Logging was recently expanded for creep roles; preserve structured logging and extend it when adding new states.
- The devcontainer was simplified for TypeScript work; ensure new tooling aligns with the current container setup.

## Expectations

- Prefer task chaining over imperative creep logic and verify memory structures remain backward compatible.
- Update both TypeScript sources in `src/` and generated artifacts in `dist/` when changes are intended for live use.
- Document workflow impacts in `docs/` when modifying role behavior or progression strategies.
- Coordinate spawn and role changes with `RCL` configs to keep early-level rooms stable.
