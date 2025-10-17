Project Imperium: A Screeps AI Framework

I. Mandate

Project Imperium is a modular, hierarchical AI framework for the game Screeps. Its purpose is to create a fully autonomous, multi-room empire capable of dynamic adaptation, strategic expansion, and robust defense. The core philosophy is to move beyond simple, role-based logic to a goal-oriented, problem-solving system where each component has a clearly defined responsibility.

The naming convention and architectural hierarchy are inspired by a "Sci-Fi Roman Empire" theme.

II. Architectural Philosophy

The AI is structured into a three-tiered hierarchy. Directives flow down from the highest strategic layer to the lowest tactical layer. Processed data and status reports flow up from the tactical layer to inform strategic decisions.

Tier 1: The Principate (Global Strategy)

The Emperor & Cabinet. Manages the entire empire. Thinks in hours/days.

Principate (AI Core): The final decision-maker. Sets grand strategy (EXPAND, CONQUER, PROSPER).

Senatorial Cabinet:

Censor: Expansion advisor. Identifies new rooms to claim.

Praetor: Diplomatic advisor. Manages allies and hostiles.

Quaestor: Economic advisor. Tracks long-term profitability and resource trends.

Tier 2: The Consuls (Regional Coordination)

The Governors. Manages groups of rooms and inter-room logistics. Thinks in minutes/hours.

Consul Mercatus (The Trader): Manages the empire's economy, balancing resources between rooms, and interacting with the market.

Consul Bellorum (The Centurion): The supreme military commander. Directs legions and coordinates multi-room defense and offense.

Tier 3: The Magistrates (Room-Level Management)

The Workhorses. Each room (Colonia) is managed by its own set of Magistrates. Thinks in ticks.

Legatus Archivus (The Archivist): The data-gatherer. Observes the room state and produces a clean, simple status report. It makes no decisions.

Legatus Officio (The Taskmaster): The operations chief. Reads the Archivist's report and creates a prioritized list of jobs (e.g., HAUL_ENERGY, UPGRADE_CONTROLLER).

Legatus Genetor (The Broodmother): The life-giver. Designs and spawns creeps perfectly suited to the Taskmaster's highest-priority job.

Legatus Fabrum (The Architect): The city planner. Places construction sites according to a master room blueprint.

Legatus Viae (The Trailblazer): The road engineer. Analyzes creep traffic to plan and place roads.

III. Tech Stack

Language: TypeScript

Bundler: Rollup (or a similar tool like Webpack) to compile all TypeScript into a single main.js file for Screeps.

Linting/Formatting: ESLint and Prettier for code consistency.

Version Control: Git

IV. Getting Started

Clone the repository.

Install dependencies: npm install

Configure screeps.json with your server credentials.

Run the build and deploy script: npm run deploy