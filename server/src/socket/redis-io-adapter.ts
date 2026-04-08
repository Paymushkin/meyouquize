import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Server } from "socket.io";

export async function attachSocketIoRedisAdapter(io: Server, url: string) {
  const pubClient = createClient({ url });
  const subClient = pubClient.duplicate();
  pubClient.on("error", (err) => console.error("[socket.io redis adapter] pub", err));
  subClient.on("error", (err) => console.error("[socket.io redis adapter] sub", err));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
}
