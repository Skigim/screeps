declare const global: any;

declare module "Traveler" {
  const Traveler: any;
  export { Traveler };
  export default Traveler;
}

declare module "creep-tasks" {
  const Tasks: any;
  export { Tasks };
  export default Tasks;
}

declare global {
  namespace NodeJS {
    interface Global {
      Traveler?: any;
      Tasks?: any;
      orders?: Map<string, unknown>;
      snap?: {
        rooms: Map<string, unknown>;
        squads: Map<string, unknown>;
      };
      debug?: {
        roomScans?: Record<string, number>;
        creepCpuSamples?: number[];
      };
      Engine?: {
        start: (roomName?: string) => string;
        stop: (roomName?: string) => string;
        status: (roomName?: string) => string;
      };
    }
  }
}
