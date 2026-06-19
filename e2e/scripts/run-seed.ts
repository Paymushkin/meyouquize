import { seedE2eFixture } from "./seed-fixture";

seedE2eFixture().catch((error) => {
  console.error(error);
  process.exit(1);
});
