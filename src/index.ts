import { createServer } from "node:http";
import mongoose from "mongoose";
import { app } from "./app";
import { config } from "./config";
import { connectMongo, DatabaseError } from "./lib/mongo";
import { initRealtime } from "./lib/realtime";

async function main() {
  await connectMongo(config.mongoUri, config.dbName);
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
  if (err instanceof DatabaseError) console.error(`\nCould not start: the database is not reachable.\n\n${err.message}\n`);
  else console.error("Failed to start the server", err);
  process.exit(1);
});
