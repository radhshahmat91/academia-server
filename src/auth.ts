import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config";
import { ApiError } from "./lib/http";
import { User } from "./models";

export type AuthUser = { id: string; email: string; name: string; role: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// BetterAuth (Next.js client) signs JWTs; we only need its public keys to verify them.
const jwks = createRemoteJWKSet(new URL(config.jwksUrl), {
  cooldownDuration: 10_000,
  cacheMaxAge: 10 * 60_000,
  timeoutDuration: 10_000,
});

export async function verifyToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, jwks, config.authIssuer ? { issuer: config.authIssuer } : {});
  const id = String(payload.sub ?? payload.id ?? "");
  if (!id) throw new Error("Token has no subject");
  return { id, email: String(payload.email ?? ""), name: String(payload.name ?? ""), role: String(payload.role ?? "student") };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new ApiError(401, "Please log in to continue"));
  try {
    req.user = await verifyToken(header.slice(7));
    next();
  } catch {
    next(new ApiError(401, "Your session has expired. Please log in again."));
  }
}

/** Use after requireAuth. Role is re-checked in the database so promotions and demotions apply instantly. */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const u: any = await User.findById(req.user!.id).select("role").lean();
  if (u?.role !== "admin") return next(new ApiError(403, "This area is for administrators only"));
  next();
}
