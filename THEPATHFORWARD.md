MISSION BRIEF: Operation Foundations

Objective: Establish the foundational scaffolding for Project Imperium. The goal is not to implement logic, but to create a robust, type-safe, and modular file structure that adheres to the architectural principles outlined in the README.md.

General Directives for All Agents:

Language: All code must be written in TypeScript.

Adherence: Strictly follow the naming conventions and architectural roles defined in README.md.

Communication: Use clear, descriptive commit messages to signal progress and changes to other agents. (e.g., feat(Archivist): Establish report interfaces, chore(Build): Configure Rollup).

Focus: This is a scaffolding mission. All class methods should be stubs. The focus is on files, classes, interfaces, and their relationships.

File Structure: All source code will reside within a src/ directory, organized by architectural tier (e.g., src/principate, src/consuls, src/magistrates).

Track 1: Agent Primus (The Architectus)

Role: You are the foundational engineer. Your responsibility is to set up the project environment, the build process, and the main game loop entry point.

Tasks:

Initialize an npm project (package.json).

Install necessary dev dependencies: typescript, rollup, rollup-plugin-typescript2, @types/node, @types/screeps.

Create a tsconfig.json file configured for the Screeps environment.

Create a rollup.config.js file to bundle all code from src/main.ts into a dist/main.js.

Create the main entry point at src/main.ts. This file will contain the main module.exports.loop function.

Inside main.ts, import and instantiate a master Empire class from src/principate/Empire.ts. The loop should do nothing but call Empire.run().

Create the src/principate/Empire.ts file. This class will be the highest-level orchestrator, responsible for initializing and running all subordinate modules in the correct order.

Track 2: Agent Secundus (The Scriba)

Role: You are the data architect. Your responsibility is to define the language and data structures that all modules will use to communicate.

Tasks:

Create a directory src/interfaces/.

In this directory, define the core data structures as TypeScript interfaces:

ArchivistReport.ts: Define the structure of the report the Archivist will generate (e.g., energyDeficit: number, hostileThreatLevel: number, constructionSites: number).

Task.ts: Define a generic task structure (e.g., id: string, type: TaskType, targetId: Id<any>, priority: number).

CreepRequest.ts: Define the structure for a creep spawn request (e.g., priority: number, body: BodyPartConstant[], initialTask: Task).

Create the file for the Archivist: src/magistrates/LegatusArchivus.ts.

Implement the LegatusArchivus class skeleton. It should have a public method run(room: Room): ArchivistReport. This method should return a dummy report object conforming to the interface you defined.

Track 3: Agent Tertius (The Magister)

Role: You are the operational manager. Your responsibility is to create the class skeletons for the Magistrate-level modules that will consume data and execute tasks.

Tasks:

Create the class skeleton files for the core room-level managers in the src/magistrates/ directory.

LegatusOfficio.ts (Taskmaster):

Create the LegatusOfficio class.

It should have a run(report: ArchivistReport): Task[] method. It will take the Archivist's report and return a prioritized list of tasks. Import the necessary interfaces from Agent Secundus's work.

LegatusGenetor.ts (Broodmother):

Create the LegatusGenetor class.

It should have a run(tasks: Task[]): CreepRequest | null method. It will take the task list and determine if a new creep is needed.

LegatusFabrum.ts (Architect):

Create the LegatusFabrum class with a stubbed run() method.

LegatusViae.ts (Trailblazer):

Create the LegatusViae class with a stubbed run() method.