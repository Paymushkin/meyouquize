import { expect, test } from "@playwright/test";
import { getE2eFixture } from "./helpers/fixture";

const adminLogin = process.env.ADMIN_LOGIN ?? "admin";
const adminPassword = process.env.ADMIN_PASSWORD ?? "test-admin-password";

test("fixture room is reachable on admin API", async ({ request }) => {
  const { slug } = getE2eFixture();
  const auth = await request.post("http://127.0.0.1:4000/api/admin/auth", {
    data: { login: adminLogin, password: adminPassword },
  });
  const authBody = await auth.text();
  expect(auth.ok(), `auth failed: ${auth.status()} ${authBody}`).toBeTruthy();

  const room = await request.get(`http://127.0.0.1:4000/api/admin/rooms/${slug}`);
  expect(room.status(), `room ${slug} missing on API`).toBe(200);
});
