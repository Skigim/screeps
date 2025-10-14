import "./runtime";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const runtimeTasks = require("./runtime/Tasks") as { Tasks: any };

const { Tasks } = runtimeTasks;

export type TaskInstance = import("./runtime/Task").Task;
export type TaskMemory = TaskInstance["proto"];

export { Tasks };
export default Tasks;
