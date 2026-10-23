import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let server: MongoMemoryReplSet | null = null;

export default async function setup(project: TestProject) {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide("mongoUri", server.getUri("chatbox-test"));
  return async () => {
    await server?.stop();
  };
}
