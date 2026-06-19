/** Задать до любого import server/* — env.ts читает process.env при первом импорте. */
process.env.NODE_ENV = "test";
process.env.TEST_DATABASE = "1";
process.env.APP_NETWORK_MODE = "lan";
process.env.LOCAL_ADMIN_NO_AUTH = "0";
process.env.CLUSTER_WORKERS = "1";
process.env.ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? "admin";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";

import { afterAll, beforeAll, beforeEach } from "vitest";
import {
  initTestDatabase,
  resetTestDatabase,
  shutdownTestDatabase,
} from "./tests/helpers/testDb.js";
import { cleanupTestStorage, initTestStorage } from "./tests/helpers/testStorage.js";

initTestStorage();

beforeAll(async () => {
  await initTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await shutdownTestDatabase();
  cleanupTestStorage();
});
