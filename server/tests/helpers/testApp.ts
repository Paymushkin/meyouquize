import type { Express } from "express";
import type { Server as HttpServer } from "node:http";
import type { Server as SocketServer } from "socket.io";

export type TestServer = {
  app: Express;
  httpServer: HttpServer;
  io: SocketServer;
  baseUrl: string;
  close: () => Promise<void>;
};

export async function createTestServer(): Promise<TestServer> {
  const { buildServer } = await import("../../src/app.js");
  const { app, httpServer, io } = await buildServer();

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 4000;

  return {
    app,
    httpServer,
    io,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        io.close();
        if (!httpServer.listening) {
          resolve();
          return;
        }
        httpServer.close(() => resolve());
      }),
  };
}
