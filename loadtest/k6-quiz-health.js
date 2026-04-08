/**
 * Лёгкая HTTP-проверка перед SOCKET-нагрузкой.
 * Пример целей (SLO): p95 задержки GET / < 100ms при сервере без нагрузки;
 * при полноценном сценарии см. server/scripts/socket-load-burst.mjs
 */
import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const base = __ENV.BASE_URL || "http://localhost:4000";
  const res = http.get(`${base}/`);
  check(res, { "200": (r) => r.status === 200 });
}
