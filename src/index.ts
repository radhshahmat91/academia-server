import { createServer } from "node:http";
import mongoose from "mongoose";
import { app } from "./app";
import { config } from "./config";
import { initRealtime } from "./lib/realtime";

async function main() {
  await mongoose.connect(config.mongoUri, { dbName: config.dbName, serverSelectionTimeoutMS: 15_000 });
  console.log(`MongoDB connected (${config.dbName})`);

  const server = createServer(app);
  initRealtime(server);
  server.listen(config.port, () => {
    console.log(`AcademiaConnect API listening on :${config.port}`);
    console.log(`Accepting browsers from ${config.clientOrigins.join(", ")}`);
    console.log(`Verifying BetterAuth tokens with ${config.jwksUrl}`);
  });

  const stop = () => {
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((err) => {
  console.error("Failed to start the server", err);
  process.exit(1);
});
