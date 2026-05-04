import http from "k6/http";
import { check } from "k6";

const base = __ENV.BASE_URL || "http://localhost:4000";
const adminLogin = __ENV.ADMIN_LOGIN || "";
const adminPassword = __ENV.ADMIN_PASSWORD || "";

const vus = Number(__ENV.HTTP_VUS || 30);
const duration = __ENV.HTTP_DURATION || "2m";

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<900"],
    http_req_failed: ["rate<0.02"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const health = http.get(`${base}/healthz`);
  check(health, { "healthz:200": (r) => r.status === 200 });

  const ready = http.get(`${base}/readyz`);
  check(ready, { "readyz:200": (r) => r.status === 200 });

  if (adminLogin && adminPassword) {
    const auth = http.post(
      `${base}/api/admin/auth`,
      JSON.stringify({ login: adminLogin, password: adminPassword }),
      { headers: { "content-type": "application/json" } },
    );
    check(auth, {
      "admin_auth:status_200_or_429": (r) => r.status === 200 || r.status === 429,
    });
  }
}
