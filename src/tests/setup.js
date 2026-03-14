import '../loadEnv.js';
import { jest } from "@jest/globals";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  // Stop MongoMemoryServer
  if (mongoServer) {
    await mongoServer.stop();
  }
  jest.clearAllTimers();
  jest.useRealTimers();
});