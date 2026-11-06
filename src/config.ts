import dotenv from "dotenv";

// Reads .env when there is one. Real environment variables (Render, Docker, CI) always win. Works on every Node 20.
dotenv.config({ quiet: true });

const trim = (u: string) => u.replace(/\/+$/, "");
const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => trim(s.trim()))
    .filter(Boolean);

const clientOrigins = list(process.env.CLIENT_URL ?? "http://localhost:3000");
const authUrl = trim(process.env.AUTH_URL ?? clientOrigins[0] ?? "http://localhost:3000");

export const config = {
  port: Number(process.env.PORT ?? 5000),
  isProd: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  dbName: process.env.MONGODB_DB ?? "academiaconnect",
  clientOrigins,
  authUrl,
  jwksUrl: process.env.AUTH_JWKS_URL ?? `${authUrl}/api/auth/jwks`,
  authIssuer: process.env.AUTH_ISSUER ? trim(process.env.AUTH_ISSUER) : "",
};
