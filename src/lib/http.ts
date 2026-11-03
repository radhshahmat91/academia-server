import type { ErrorRequestHandler, Request } from "express";
import { Types } from "mongoose";
import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const bad = (m: string) => new ApiError(400, m);
export const notFound = (m = "That item was not found") => new ApiError(404, m);
export const forbidden = (m = "You don't have access to this") => new ApiError(403, m);
export const conflict = (m: string) => new ApiError(409, m);

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    const where = i?.path.length ? `${i.path.join(".")}: ` : "";
    throw new ApiError(400, i ? `${where}${i.message}` : "Invalid input", r.error.issues);
  }
  return r.data;
}

export function oid(id: unknown) {
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) throw notFound();
  return new Types.ObjectId(id);
}

export function paging(req: Request, defLimit = 12) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export const rx = (s: string) => ({ $regex: escapeRx(s), $options: "i" });

/** Renames Mongo `_id` to `id` on every object during JSON serialisation (HTTP and sockets). */
export function idReplacer(_k: string, v: any) {
  if (v && typeof v === "object" && !Array.isArray(v) && "_id" in v) {
    const { _id, __v, ...rest } = v;
    return { id: String(_id), ...rest };
  }
  return v;
}
export const ser = <T = any>(v: unknown): T => JSON.parse(JSON.stringify(v, idReplacer));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) return void res.status(err.status).json({ message: err.message });
  if (err?.name === "ValidationError") {
    const first = Object.values(err.errors ?? {})[0] as any;
    return void res.status(400).json({ message: first?.message ?? "Some fields are invalid" });
  }
  if (err?.name === "CastError") return void res.status(400).json({ message: `Invalid value for ${err.path}` });
  if (err?.code === 11000) return void res.status(409).json({ message: "That record already exists" });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our side. Please try again." });
};
