import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler, idReplacer } from "./lib/http";
import routes from "./routes";

export const app = express();

app.set("trust proxy", 1);
// Every response renames Mongo's _id to id.
app.set("json replacer", idReplacer);
app.disable("x-powered-by");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan(config.isProd ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.json({ name: "AcademiaConnect API", status: "ok", docs: "See README.md for the endpoint list" });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api", rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ message: "That endpoint does not exist" });
});
app.use(errorHandler);
