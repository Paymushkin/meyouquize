import { teardownE2eFixture } from "./seed-fixture";

teardownE2eFixture().catch((error) => {
  console.error(error);
  process.exit(1);
});
